from typing import List
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy.orm import Session
import csv
import io
import logging
from datetime import datetime
from app.core.database import get_db
from app.core.auth import get_current_active_user
from app.schemas.customer import Customer, CustomerCreate, CustomerUpdate
from app.models.user import User
from app.models.customer import Customer as CustomerModel
from app.models.company import Company as CompanyModel

router = APIRouter()
logger = logging.getLogger(__name__)

def verify_company_ownership(db: Session, company_id: int, user_id: int):
    company = db.query(CompanyModel).filter(
        CompanyModel.id == company_id,
        CompanyModel.owner_id == user_id
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
            return datetime.strptime(date_str, fmt).date()
        except ValueError:
            continue
    
    # If no format works, raise an error
    raise ValueError(f"Invalid date format: {date_str}. Expected format: YYYY-MM-DD")

@router.post("/", response_model=Customer)
def create_customer(
    customer: CustomerCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    logger.info(f"Creating customer with data: {customer.dict()}")
    verify_company_ownership(db, customer.company_id, current_user.id)
    
    try:
        # Convert to dict and handle potential issues
        customer_data = customer.dict()
        logger.info(f"Customer data after conversion: {customer_data}")
        
        # Validate required fields
        if not customer_data.get('name', '').strip():
            logger.error("Customer name validation failed")
            raise HTTPException(status_code=422, detail="Customer name is required")
        
        # Validate payment_terms if provided
        if customer_data.get('payment_terms') is not None:
            try:
                payment_terms = int(customer_data['payment_terms'])
                if payment_terms < 0:
                    logger.error(f"Payment terms validation failed: {payment_terms}")
                    raise HTTPException(status_code=422, detail="Payment terms must be a positive number")
                customer_data['payment_terms'] = payment_terms
            except ValueError:
                logger.error(f"Payment terms type validation failed: {customer_data.get('payment_terms')}")
                raise HTTPException(status_code=422, detail="Payment terms must be a valid number")
        
        # Handle contract_start date validation
        if customer_data.get('contract_start') is not None:
            contract_start = customer_data['contract_start']
            logger.info(f"Processing contract_start: {contract_start}, type: {type(contract_start)}")
            if isinstance(contract_start, str):
                try:
                    customer_data['contract_start'] = parse_date(contract_start)
                except ValueError as e:
                    logger.error(f"Contract start date parsing failed: {str(e)}")
                    raise HTTPException(status_code=422, detail=f"Invalid contract start date: {str(e)}")
        
        logger.info(f"Final customer data before DB insert: {customer_data}")
        db_customer = CustomerModel(**customer_data)
        db.add(db_customer)
        db.commit()
        db.refresh(db_customer)
        logger.info("Customer created successfully")
        return db_customer
        
    except HTTPException:
        logger.error("HTTPException caught, re-raising")
        raise
    except Exception as e:
        logger.error(f"Unexpected error creating customer: {str(e)}")
        logger.error(f"Error type: {type(e)}")
        import traceback
        logger.error(f"Traceback: {traceback.format_exc()}")
        db.rollback()
        raise HTTPException(status_code=422, detail=f"Error creating customer: {str(e)}")

@router.get("/company/{company_id}", response_model=List[Customer])
def read_customers(
    company_id: int,
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    verify_company_ownership(db, company_id, current_user.id)
    customers = db.query(CustomerModel).filter(CustomerModel.company_id == company_id).offset(skip).limit(limit).all()
    return customers

@router.get("/import-template")
def get_import_template(
    current_user: User = Depends(get_current_active_user)
):
    """Download CSV template for customer import"""
    
    # Create CSV template with headers and sample data
    output = io.StringIO()
    fieldnames = ['name', 'email', 'phone', 'address', 'contact_person', 'payment_terms', 'is_active', 'notes', 'company_name', 'product_type', 'revenue_model', 'partner', 'contract_start']
    writer = csv.DictWriter(output, fieldnames=fieldnames)
    
    writer.writeheader()
    # Add sample rows to show the expected format
    sample_data = [
        {
            'name': 'Example Customer 1',
            'email': 'customer1@example.com',
            'phone': '+1 (555) 123-4567',
            'address': '123 Main St, City, State, ZIP',
            'contact_person': 'John Doe',
            'payment_terms': 30,
            'is_active': 'true',
            'notes': 'Sample customer data',
            'company_name': 'Acme Corp',
            'product_type': 'SaaS',
            'revenue_model': 'Subscription',
            'partner': 'Direct',
            'contract_start': '2024-01-15'
        },
        {
            'name': 'Example Customer 2',
            'email': 'customer2@example.com',
            'phone': '+1 (555) 987-6543',
            'address': '456 Oak Ave, City, State, ZIP',
            'contact_person': 'Jane Smith',
            'payment_terms': 14,
            'is_active': 'true',
            'notes': 'Another sample customer',
            'company_name': 'TechStart LLC',
            'product_type': 'Consulting',
            'revenue_model': 'Project-based',
            'partner': 'Referral Partner',
            'contract_start': '2024-03-01'
        }
    ]
    
    for row in sample_data:
        writer.writerow(row)
    
    csv_content = output.getvalue()
    output.close()
    
    return {
        "filename": "customers_import_template.csv",
        "content": csv_content,
        "instructions": {
            "name": "Customer name (required)",
            "email": "Customer email address (optional)",
            "phone": "Phone number (optional)",
            "address": "Full address (optional)",
            "contact_person": "Primary contact person (optional)",
            "payment_terms": "Payment terms in days (default: 30)",
            "is_active": "Customer status: true/false, 1/0, yes/no, active/inactive (default: true)",
            "notes": "Additional notes (optional)",
            "company_name": "Customer company name (optional)",
            "product_type": "Type of product/service (optional, e.g., SaaS, Consulting, Hardware)",
            "revenue_model": "Revenue model (optional, e.g., Subscription, One-time, Project-based)",
            "partner": "Partner/channel info (optional, e.g., Direct, Referral Partner, Reseller)",
            "contract_start": "Contract start date (optional, format: YYYY-MM-DD)"
        }
    }

@router.get("/{customer_id}", response_model=Customer)
def read_customer(
    customer_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    customer = db.query(CustomerModel).filter(CustomerModel.id == customer_id).first()
    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found")
    
    verify_company_ownership(db, customer.company_id, current_user.id)
    return customer

@router.put("/{customer_id}", response_model=Customer)
def update_customer(
    customer_id: int,
    customer_update: CustomerUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    customer = db.query(CustomerModel).filter(CustomerModel.id == customer_id).first()
    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found")
    
    verify_company_ownership(db, customer.company_id, current_user.id)
    
    try:
        update_data = customer_update.dict(exclude_unset=True)
        
        # Validate name if being updated
        if 'name' in update_data and not update_data['name'].strip():
            raise HTTPException(status_code=422, detail="Customer name cannot be empty")
        
        # Validate payment_terms if being updated
        if 'payment_terms' in update_data and update_data['payment_terms'] is not None:
            try:
                payment_terms = int(update_data['payment_terms'])
                if payment_terms < 0:
                    raise HTTPException(status_code=422, detail="Payment terms must be a positive number")
                update_data['payment_terms'] = payment_terms
            except ValueError:
                raise HTTPException(status_code=422, detail="Payment terms must be a valid number")
        
        # Handle contract_start date validation if being updated
        if 'contract_start' in update_data and update_data['contract_start'] is not None:
            contract_start = update_data['contract_start']
            if isinstance(contract_start, str):
                try:
                    update_data['contract_start'] = parse_date(contract_start)
                except ValueError as e:
                    raise HTTPException(status_code=422, detail=f"Invalid contract start date: {str(e)}")
        
        for field, value in update_data.items():
            setattr(customer, field, value)
        
        db.commit()
        db.refresh(customer)
        return customer
        
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=422, detail=f"Error updating customer: {str(e)}")

@router.delete("/{customer_id}")
def delete_customer(
    customer_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    customer = db.query(CustomerModel).filter(CustomerModel.id == customer_id).first()
    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found")
    
    verify_company_ownership(db, customer.company_id, current_user.id)
    
    db.delete(customer)
    db.commit()
    return {"message": "Customer deleted successfully"}

@router.post("/company/{company_id}/import-csv")
def import_customers_csv(
    company_id: int,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Import customers from CSV file"""
    verify_company_ownership(db, company_id, current_user.id)
    
    # Validate file type
    if not file.filename.endswith('.csv'):
        raise HTTPException(status_code=400, detail="File must be a CSV")
    
    try:
        # Read the uploaded file
        content = file.file.read()
        csv_content = content.decode('utf-8')
        csv_reader = csv.DictReader(io.StringIO(csv_content))
        
        imported_customers = []
        errors = []
        
        for row_num, row in enumerate(csv_reader, start=2):  # Start at 2 for header row
            try:
                # Map CSV columns to customer fields
                customer_data = {
                    'name': row.get('name', '').strip(),
                    'email': row.get('email', '').strip() or None,
                    'phone': row.get('phone', '').strip() or None,
                    'address': row.get('address', '').strip() or None,
                    'contact_person': row.get('contact_person', '').strip() or None,
                    'payment_terms': int(row.get('payment_terms', 30)),
                    'is_active': row.get('is_active', 'true').lower() in ('true', '1', 'yes', 'active'),
                    'notes': row.get('notes', '').strip() or None,
                    'company_id': company_id,
                    
                    # New business fields
                    'company_name': row.get('company_name', '').strip() or None,
                    'product_type': row.get('product_type', '').strip() or None,
                    'revenue_model': row.get('revenue_model', '').strip() or None,
                    'partner': row.get('partner', '').strip() or None,
                    'contract_start': parse_date(row.get('contract_start', '').strip()) if row.get('contract_start', '').strip() else None
                }
                
                # Validate required fields
                if not customer_data['name']:
                    errors.append(f"Row {row_num}: Customer name is required")
                    continue
                
                # Create customer
                db_customer = CustomerModel(**customer_data)
                db.add(db_customer)
                imported_customers.append(customer_data['name'])
                
            except ValueError as e:
                errors.append(f"Row {row_num}: Invalid data format - {str(e)}")
            except Exception as e:
                errors.append(f"Row {row_num}: {str(e)}")
        
        # Commit all successful imports
        if imported_customers:
            db.commit()
        
        return {
            "success": len(imported_customers),
            "imported_customers": imported_customers,
            "errors": errors,
            "total_processed": len(imported_customers) + len(errors)
        }
        
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=400, detail=f"Error processing CSV file: {str(e)}")
    finally:
        file.file.close()

@router.get("/company/{company_id}/export-csv")
def export_customers_csv(
    company_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Export customers to CSV format"""
    verify_company_ownership(db, company_id, current_user.id)
    
    customers = db.query(CustomerModel).filter(CustomerModel.company_id == company_id).all()
    
    # Create CSV content
    output = io.StringIO()
    fieldnames = ['name', 'email', 'phone', 'address', 'contact_person', 'payment_terms', 'is_active', 'notes', 'company_name', 'product_type', 'revenue_model', 'partner', 'contract_start']
    writer = csv.DictWriter(output, fieldnames=fieldnames)
    
    writer.writeheader()
    for customer in customers:
        writer.writerow({
            'name': customer.name,
            'email': customer.email or '',
            'phone': customer.phone or '',
            'address': customer.address or '',
            'contact_person': customer.contact_person or '',
            'payment_terms': customer.payment_terms,
            'is_active': customer.is_active,
            'notes': customer.notes or '',
            'company_name': customer.company_name or '',
            'product_type': customer.product_type or '',
            'revenue_model': customer.revenue_model or '',
            'partner': customer.partner or '',
            'contract_start': customer.contract_start.strftime('%Y-%m-%d') if customer.contract_start else ''
        })
    
    csv_content = output.getvalue()
    output.close()
    
    return {
        "filename": f"customers_export_{company_id}.csv",
        "content": csv_content,
        "count": len(customers)
    }