from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File
from sqlalchemy.orm import Session
from typing import List, Optional
import csv
import io
from datetime import datetime
from decimal import Decimal, InvalidOperation

from app.core.database import get_db
from app.core.auth import get_current_active_user
from app.models.user import User
from app.models.recurring_income import RecurringIncome
from app.models.customer import Customer
from app.models.company import Company
from app.models.bank_account import BankAccount
from app.schemas.recurring_income import RecurringIncomeCreate, RecurringIncomeUpdate, RecurringIncome as RecurringIncomeSchema

router = APIRouter()

@router.get("/import-template")
def get_import_template(
    current_user: User = Depends(get_current_active_user)
):
    """Download CSV template for recurring income import"""
    
    # Create CSV template with headers and sample data
    output = io.StringIO()
    fieldnames = ['name', 'description', 'amount', 'vat_amount', 'frequency', 'start_date', 'end_date', 'day_of_month', 'day_of_week', 'is_active', 'notes', 'customer_name', 'bank_account_name']
    writer = csv.DictWriter(output, fieldnames=fieldnames)
    
    writer.writeheader()
    # Add sample rows to show the expected format
    sample_data = [
        {
            'name': 'Monthly SaaS Subscription - Acme Corp',
            'description': 'Recurring monthly subscription revenue',
            'amount': '2500.00',
            'vat_amount': '500.00',
            'frequency': 'monthly',
            'start_date': '2024-01-01',
            'end_date': '',  # Optional - leave blank for no end date
            'day_of_month': '1',  # 1st of each month
            'day_of_week': '',  # Not needed for monthly
            'is_active': 'active',
            'notes': 'Premium SaaS subscription',
            'customer_name': 'Acme Corp',
            'bank_account_name': 'Main Checking Account'
        },
        {
            'name': 'Weekly Consulting Retainer',
            'description': 'Weekly consulting services',
            'amount': '1200.00',
            'vat_amount': '240.00',
            'frequency': 'weekly',
            'start_date': '2024-01-08',
            'end_date': '2024-12-31',
            'day_of_month': '',  # Not needed for weekly
            'day_of_week': '0',  # Monday (0=Monday, 6=Sunday)
            'is_active': 'active',
            'notes': 'Strategic consulting retainer',
            'customer_name': 'TechStart LLC',
            'bank_account_name': 'Business Savings Account'
        },
        {
            'name': 'Quarterly License Fee',
            'description': 'Quarterly software license',
            'amount': '5000.00',
            'vat_amount': '1000.00',
            'frequency': 'quarterly',
            'start_date': '2024-03-01',
            'end_date': '',
            'day_of_month': '1',  # 1st of quarter months
            'day_of_week': '',
            'is_active': 'active',
            'notes': 'Enterprise license agreement',
            'customer_name': 'Enterprise Client',
            'bank_account_name': 'Main Checking Account'
        }
    ]
    
    for row in sample_data:
        writer.writerow(row)
    
    csv_content = output.getvalue()
    output.close()
    
    return {
        "filename": "recurring_income_import_template.csv",
        "content": csv_content,
        "instructions": {
            "name": "Income source name (required)",
            "description": "Description of the recurring income (optional)",
            "amount": "Amount before VAT (required, decimal format: 1234.56)",
            "vat_amount": "VAT amount (optional, decimal format: 123.45, defaults to 0.00)",
            "frequency": "Frequency: weekly, monthly, quarterly, annually (required)",
            "start_date": "Start date (required, format: YYYY-MM-DD)",
            "end_date": "End date (optional, format: YYYY-MM-DD, leave blank for no end)",
            "day_of_month": "Day of month for monthly/quarterly (1-31, required for monthly/quarterly)",
            "day_of_week": "Day of week for weekly (0-6, 0=Monday, required for weekly)",
            "is_active": "Status: active, paused, ended (default: active)",
            "notes": "Additional notes (optional)",
            "customer_name": "Customer name (optional, must match existing customer)",
            "bank_account_name": "Bank account name (required, must match existing bank account)"
        }
    }

@router.get("/company/{company_id}", response_model=List[RecurringIncomeSchema])
def get_recurring_income_by_company(
    company_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Get all recurring income patterns for a company"""
    recurring_income = db.query(RecurringIncome).filter(
        RecurringIncome.company_id == company_id
    ).all()
    return recurring_income

@router.get("/{income_id}", response_model=RecurringIncomeSchema)
def get_recurring_income(
    income_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Get a specific recurring income pattern"""
    income = db.query(RecurringIncome).filter(RecurringIncome.id == income_id).first()
    if not income:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Recurring income not found"
        )
    return income

@router.post("/", response_model=RecurringIncomeSchema)
def create_recurring_income(
    income: RecurringIncomeCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Create a new recurring income pattern"""
    db_income = RecurringIncome(**income.dict())
    db.add(db_income)
    db.commit()
    db.refresh(db_income)
    return db_income

@router.put("/{income_id}", response_model=RecurringIncomeSchema)
def update_recurring_income(
    income_id: int,
    income_update: RecurringIncomeUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Update a recurring income pattern"""
    db_income = db.query(RecurringIncome).filter(RecurringIncome.id == income_id).first()
    if not db_income:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Recurring income not found"
        )
    
    update_data = income_update.dict(exclude_unset=True)
    for field, value in update_data.items():
        setattr(db_income, field, value)
    
    db.commit()
    db.refresh(db_income)
    return db_income

@router.delete("/{income_id}")
def delete_recurring_income(
    income_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Delete a recurring income pattern"""
    db_income = db.query(RecurringIncome).filter(RecurringIncome.id == income_id).first()
    if not db_income:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Recurring income not found"
        )
    
    db.delete(db_income)
    db.commit()
    return {"detail": "Recurring income deleted successfully"}

def verify_company_ownership(db: Session, company_id: int, user_id: int):
    company = db.query(Company).filter(
        Company.id == company_id,
        Company.owner_id == user_id
    ).first()
    if not company:
        raise HTTPException(status_code=403, detail="Not authorized to access this company")
    return company

def parse_date(date_str: str):
    """Parse date string in various formats"""
    if not date_str:
        return None
    
    # Try common date formats
    date_formats = ['%Y-%m-%d', '%m/%d/%Y', '%d/%m/%Y', '%Y/%m/%d']
    
    for fmt in date_formats:
        try:
            return datetime.strptime(date_str, fmt)
        except ValueError:
            continue
    
    # If no format works, raise an error
    raise ValueError(f"Invalid date format: {date_str}. Expected format: YYYY-MM-DD")

def parse_decimal(value_str: str):
    """Parse decimal string"""
    if not value_str:
        return Decimal('0.00')
    try:
        return Decimal(str(value_str))
    except (InvalidOperation, ValueError):
        raise ValueError(f"Invalid decimal value: {value_str}")

@router.post("/company/{company_id}/import-csv")
def import_recurring_income_csv(
    company_id: int,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Import recurring income from CSV file"""
    verify_company_ownership(db, company_id, current_user.id)
    
    # Validate file type
    if not file.filename.endswith('.csv'):
        raise HTTPException(status_code=400, detail="File must be a CSV")
    
    try:
        # Read the uploaded file
        content = file.file.read()
        csv_content = content.decode('utf-8')
        csv_reader = csv.DictReader(io.StringIO(csv_content))
        
        imported_items = []
        errors = []
        
        for row_num, row in enumerate(csv_reader, start=2):  # Start at 2 for header row
            try:
                # Find customer if specified
                customer_id = None
                if row.get('customer_name', '').strip():
                    customer = db.query(Customer).filter(
                        Customer.name == row['customer_name'].strip(),
                        Customer.company_id == company_id
                    ).first()
                    if customer:
                        customer_id = customer.id
                    else:
                        errors.append(f"Row {row_num}: Customer '{row['customer_name']}' not found")
                        continue
                
                # Find bank account (required)
                bank_account_id = None
                if row.get('bank_account_name', '').strip():
                    bank_account = db.query(BankAccount).filter(
                        BankAccount.name == row['bank_account_name'].strip(),
                        BankAccount.company_id == company_id,
                        BankAccount.is_active == True
                    ).first()
                    if bank_account:
                        bank_account_id = bank_account.id
                    else:
                        errors.append(f"Row {row_num}: Bank account '{row['bank_account_name']}' not found or inactive")
                        continue
                else:
                    # If no bank account specified, try to find default
                    default_bank_account = db.query(BankAccount).filter(
                        BankAccount.company_id == company_id,
                        BankAccount.is_active == True,
                        BankAccount.is_default == True
                    ).first()
                    if default_bank_account:
                        bank_account_id = default_bank_account.id
                    else:
                        errors.append(f"Row {row_num}: Bank account is required. Please specify bank_account_name or set a default bank account.")
                        continue
                
                # Validate frequency
                frequency = row.get('frequency', '').strip().lower()
                if frequency not in ['weekly', 'monthly', 'quarterly', 'annually']:
                    errors.append(f"Row {row_num}: Invalid frequency '{frequency}'. Must be: weekly, monthly, quarterly, annually")
                    continue
                
                # Parse dates
                start_date = parse_date(row.get('start_date', '').strip())
                if not start_date:
                    errors.append(f"Row {row_num}: Start date is required")
                    continue
                
                end_date = parse_date(row.get('end_date', '').strip()) if row.get('end_date', '').strip() else None
                
                # Parse day fields
                day_of_month = None
                day_of_week = None
                
                if frequency in ['monthly', 'quarterly']:
                    if not row.get('day_of_month', '').strip():
                        errors.append(f"Row {row_num}: day_of_month is required for {frequency} frequency")
                        continue
                    try:
                        day_of_month = int(row['day_of_month'])
                        if not (1 <= day_of_month <= 31):
                            errors.append(f"Row {row_num}: day_of_month must be between 1 and 31")
                            continue
                    except ValueError:
                        errors.append(f"Row {row_num}: Invalid day_of_month '{row['day_of_month']}'")
                        continue
                
                if frequency == 'weekly':
                    if not row.get('day_of_week', '').strip():
                        errors.append(f"Row {row_num}: day_of_week is required for weekly frequency")
                        continue
                    try:
                        day_of_week = int(row['day_of_week'])
                        if not (0 <= day_of_week <= 6):
                            errors.append(f"Row {row_num}: day_of_week must be between 0 (Monday) and 6 (Sunday)")
                            continue
                    except ValueError:
                        errors.append(f"Row {row_num}: Invalid day_of_week '{row['day_of_week']}'")
                        continue
                
                # Map CSV columns to recurring income fields
                income_data = {
                    'name': row.get('name', '').strip(),
                    'description': row.get('description', '').strip() or None,
                    'amount': parse_decimal(row.get('amount', '0')),
                    'vat_amount': parse_decimal(row.get('vat_amount', '0')),
                    'frequency': frequency,
                    'start_date': start_date,
                    'end_date': end_date,
                    'day_of_month': day_of_month,
                    'day_of_week': day_of_week,
                    'is_active': row.get('is_active', 'active').strip().lower(),
                    'notes': row.get('notes', '').strip() or None,
                    'company_id': company_id,
                    'customer_id': customer_id,
                    'bank_account_id': bank_account_id
                }
                
                # Validate required fields
                if not income_data['name']:
                    errors.append(f"Row {row_num}: Name is required")
                    continue
                
                if income_data['amount'] <= 0:
                    errors.append(f"Row {row_num}: Amount must be greater than 0")
                    continue
                
                # Validate is_active
                if income_data['is_active'] not in ['active', 'paused', 'ended']:
                    errors.append(f"Row {row_num}: is_active must be: active, paused, or ended")
                    continue
                
                # Create recurring income
                db_income = RecurringIncome(**income_data)
                db.add(db_income)
                imported_items.append(income_data['name'])
                
            except ValueError as e:
                errors.append(f"Row {row_num}: Invalid data format - {str(e)}")
            except Exception as e:
                errors.append(f"Row {row_num}: {str(e)}")
        
        # Commit all successful imports
        if imported_items:
            db.commit()
        
        return {
            "success": len(imported_items),
            "imported_items": imported_items,
            "errors": errors,
            "total_processed": len(imported_items) + len(errors)
        }
        
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=400, detail=f"Error processing CSV file: {str(e)}")
    finally:
        file.file.close()

@router.get("/company/{company_id}/export-csv")
def export_recurring_income_csv(
    company_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Export recurring income to CSV format"""
    verify_company_ownership(db, company_id, current_user.id)
    
    # Get all recurring income for the company with customer names
    recurring_income = db.query(RecurringIncome).filter(
        RecurringIncome.company_id == company_id
    ).all()
    
    # Create CSV content
    output = io.StringIO()
    fieldnames = ['name', 'description', 'amount', 'vat_amount', 'frequency', 'start_date', 'end_date', 'day_of_month', 'day_of_week', 'is_active', 'notes', 'customer_name', 'bank_account_name']
    writer = csv.DictWriter(output, fieldnames=fieldnames)
    
    writer.writeheader()
    for income in recurring_income:
        # Get customer name if customer_id exists
        customer_name = ''
        if income.customer_id:
            customer = db.query(Customer).filter(Customer.id == income.customer_id).first()
            if customer:
                customer_name = customer.name
        
        # Get bank account name if bank_account_id exists
        bank_account_name = ''
        if income.bank_account_id:
            bank_account = db.query(BankAccount).filter(BankAccount.id == income.bank_account_id).first()
            if bank_account:
                bank_account_name = bank_account.name
        
        writer.writerow({
            'name': income.name,
            'description': income.description or '',
            'amount': str(income.amount),
            'vat_amount': str(income.vat_amount or 0),
            'frequency': income.frequency,
            'start_date': income.start_date.strftime('%Y-%m-%d') if income.start_date else '',
            'end_date': income.end_date.strftime('%Y-%m-%d') if income.end_date else '',
            'day_of_month': str(income.day_of_month) if income.day_of_month else '',
            'day_of_week': str(income.day_of_week) if income.day_of_week is not None else '',
            'is_active': income.is_active or 'active',
            'notes': income.notes or '',
            'customer_name': customer_name,
            'bank_account_name': bank_account_name
        })
    
    csv_content = output.getvalue()
    output.close()
    
    return {
        "filename": f"recurring_income_export_{company_id}.csv",
        "content": csv_content,
        "count": len(recurring_income)
    }