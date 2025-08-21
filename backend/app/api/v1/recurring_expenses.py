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
from app.models.recurring_expense import RecurringExpense
from app.models.company import Company
from app.models.expense import ExpenseCategory
from app.schemas.recurring_expense import RecurringExpenseCreate, RecurringExpenseUpdate, RecurringExpense as RecurringExpenseSchema

router = APIRouter()

@router.get("/import-template")
def get_import_template(
    current_user: User = Depends(get_current_active_user)
):
    """Download CSV template for recurring expense import"""
    
    # Create CSV template with headers and sample data
    output = io.StringIO()
    fieldnames = ['name', 'description', 'amount', 'vat_amount', 'frequency', 'start_date', 'end_date', 'day_of_month', 'day_of_week', 'is_active', 'notes', 'category_name']
    writer = csv.DictWriter(output, fieldnames=fieldnames)
    
    writer.writeheader()
    # Add sample rows to show the expected format
    sample_data = [
        {
            'name': 'Monthly Office Rent',
            'description': 'Recurring monthly office rental payment',
            'amount': '2500.00',
            'vat_amount': '500.00',
            'frequency': 'monthly',
            'start_date': '2024-01-01',
            'end_date': '',  # Optional - leave blank for no end date
            'day_of_month': '1',  # 1st of each month
            'day_of_week': '',  # Not needed for monthly
            'is_active': 'active',
            'notes': 'Main office location rent',
            'category_name': 'Rent & Utilities'
        },
        {
            'name': 'Weekly Cleaning Service',
            'description': 'Weekly office cleaning',
            'amount': '300.00',
            'vat_amount': '60.00',
            'frequency': 'weekly',
            'start_date': '2024-01-08',
            'end_date': '2024-12-31',
            'day_of_month': '',  # Not needed for weekly
            'day_of_week': '1',  # Tuesday (0=Monday, 6=Sunday)
            'is_active': 'active',
            'notes': 'Professional cleaning service',
            'category_name': 'Office Maintenance'
        },
        {
            'name': 'Quarterly Insurance Premium',
            'description': 'Business insurance payment',
            'amount': '1200.00',
            'vat_amount': '0.00',
            'frequency': 'quarterly',
            'start_date': '2024-03-01',
            'end_date': '',
            'day_of_month': '1',  # 1st of quarter months
            'day_of_week': '',
            'is_active': 'active',
            'notes': 'Business liability insurance',
            'category_name': 'Insurance'
        }
    ]
    
    for row in sample_data:
        writer.writerow(row)
    
    csv_content = output.getvalue()
    output.close()
    
    return {
        "filename": "recurring_expenses_import_template.csv",
        "content": csv_content,
        "instructions": {
            "name": "Expense name (required)",
            "description": "Description of the recurring expense (optional)",
            "amount": "Amount before VAT (required, decimal format: 1234.56)",
            "vat_amount": "VAT amount (optional, decimal format: 123.45, defaults to 0.00)",
            "frequency": "Frequency: weekly, monthly, quarterly, annually (required)",
            "start_date": "Start date (required, format: YYYY-MM-DD)",
            "end_date": "End date (optional, format: YYYY-MM-DD, leave blank for no end)",
            "day_of_month": "Day of month for monthly/quarterly (1-31, required for monthly/quarterly)",
            "day_of_week": "Day of week for weekly (0-6, 0=Monday, required for weekly)",
            "is_active": "Status: active, paused, ended (default: active)",
            "notes": "Additional notes (optional)",
            "category_name": "Expense category name (optional, must match existing category)"
        }
    }

@router.get("/company/{company_id}", response_model=List[RecurringExpenseSchema])
def get_recurring_expenses_by_company(
    company_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Get all recurring expense patterns for a company"""
    recurring_expenses = db.query(RecurringExpense).filter(
        RecurringExpense.company_id == company_id
    ).all()
    return recurring_expenses

@router.get("/{expense_id}", response_model=RecurringExpenseSchema)
def get_recurring_expense(
    expense_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Get a specific recurring expense pattern"""
    expense = db.query(RecurringExpense).filter(RecurringExpense.id == expense_id).first()
    if not expense:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Recurring expense not found"
        )
    return expense

@router.post("/", response_model=RecurringExpenseSchema)
def create_recurring_expense(
    expense: RecurringExpenseCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Create a new recurring expense pattern"""
    import logging
    logger = logging.getLogger(__name__)
    
    try:
        logger.info(f"Received recurring expense data: {expense.dict()}")
        
        # Convert the data and handle any type conversions needed
        expense_data = expense.dict()
        db_expense = RecurringExpense(**expense_data)
        
        db.add(db_expense)
        db.commit()
        db.refresh(db_expense)
        
        logger.info(f"Successfully created recurring expense with ID: {db_expense.id}")
        return db_expense
        
    except Exception as e:
        logger.error(f"Error creating recurring expense: {str(e)}")
        logger.error(f"Exception type: {type(e).__name__}")
        db.rollback()
        
        # Re-raise as HTTPException with better error info
        if hasattr(e, 'orig') and hasattr(e.orig, 'diag'):
            detail = f"Database error: {e.orig.diag.message_primary}"
        else:
            detail = f"Validation error: {str(e)}"
            
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=detail
        )

@router.put("/{expense_id}", response_model=RecurringExpenseSchema)
def update_recurring_expense(
    expense_id: int,
    expense_update: RecurringExpenseUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Update a recurring expense pattern"""
    db_expense = db.query(RecurringExpense).filter(RecurringExpense.id == expense_id).first()
    if not db_expense:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Recurring expense not found"
        )
    
    update_data = expense_update.dict(exclude_unset=True)
    for field, value in update_data.items():
        setattr(db_expense, field, value)
    
    db.commit()
    db.refresh(db_expense)
    return db_expense

@router.delete("/{expense_id}")
def delete_recurring_expense(
    expense_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Delete a recurring expense pattern"""
    db_expense = db.query(RecurringExpense).filter(RecurringExpense.id == expense_id).first()
    if not db_expense:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Recurring expense not found"
        )
    
    db.delete(db_expense)
    db.commit()
    return {"detail": "Recurring expense deleted successfully"}

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
def import_recurring_expense_csv(
    company_id: int,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Import recurring expenses from CSV file"""
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
                # Find expense category if specified
                category_id = None
                if row.get('category_name', '').strip():
                    category = db.query(ExpenseCategory).filter(
                        ExpenseCategory.name == row['category_name'].strip()
                    ).first()
                    if category:
                        category_id = category.id
                    else:
                        errors.append(f"Row {row_num}: Expense category '{row['category_name']}' not found")
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
                
                # Map CSV columns to recurring expense fields
                expense_data = {
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
                    'category_id': category_id
                }
                
                # Validate required fields
                if not expense_data['name']:
                    errors.append(f"Row {row_num}: Name is required")
                    continue
                
                if expense_data['amount'] <= 0:
                    errors.append(f"Row {row_num}: Amount must be greater than 0")
                    continue
                
                # Validate is_active
                if expense_data['is_active'] not in ['active', 'paused', 'ended']:
                    errors.append(f"Row {row_num}: is_active must be: active, paused, or ended")
                    continue
                
                # Create recurring expense
                db_expense = RecurringExpense(**expense_data)
                db.add(db_expense)
                imported_items.append(expense_data['name'])
                
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
def export_recurring_expense_csv(
    company_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Export recurring expenses to CSV format"""
    verify_company_ownership(db, company_id, current_user.id)
    
    # Get all recurring expenses for the company with category names
    recurring_expenses = db.query(RecurringExpense).filter(
        RecurringExpense.company_id == company_id
    ).all()
    
    # Create CSV content
    output = io.StringIO()
    fieldnames = ['name', 'description', 'amount', 'vat_amount', 'frequency', 'start_date', 'end_date', 'day_of_month', 'day_of_week', 'is_active', 'notes', 'category_name']
    writer = csv.DictWriter(output, fieldnames=fieldnames)
    
    writer.writeheader()
    for expense in recurring_expenses:
        # Get category name if category_id exists
        category_name = ''
        if expense.category_id:
            category = db.query(ExpenseCategory).filter(ExpenseCategory.id == expense.category_id).first()
            if category:
                category_name = category.name
        
        writer.writerow({
            'name': expense.name,
            'description': expense.description or '',
            'amount': str(expense.amount),
            'vat_amount': str(expense.vat_amount or 0),
            'frequency': expense.frequency,
            'start_date': expense.start_date.strftime('%Y-%m-%d') if expense.start_date else '',
            'end_date': expense.end_date.strftime('%Y-%m-%d') if expense.end_date else '',
            'day_of_month': str(expense.day_of_month) if expense.day_of_month else '',
            'day_of_week': str(expense.day_of_week) if expense.day_of_week is not None else '',
            'is_active': expense.is_active or 'active',
            'notes': expense.notes or '',
            'category_name': category_name
        })
    
    csv_content = output.getvalue()
    output.close()
    
    return {
        "filename": f"recurring_expenses_export_{company_id}.csv",
        "content": csv_content,
        "count": len(recurring_expenses)
    }