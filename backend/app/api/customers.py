from typing import List
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy.orm import Session
import csv
import io
from app.core.database import get_db
from app.core.auth import get_current_active_user
from app.schemas.customer import Customer, CustomerCreate, CustomerUpdate
from app.models.user import User
from app.models.customer import Customer as CustomerModel
from app.models.company import Company as CompanyModel

router = APIRouter()

def verify_company_ownership(db: Session, company_id: int, user_id: int):
    company = db.query(CompanyModel).filter(
        CompanyModel.id == company_id,
        CompanyModel.owner_id == user_id
    ).first()
    if not company:
        raise HTTPException(status_code=403, detail="Not authorized to access this company")
    return company

@router.post("/", response_model=Customer)
def create_customer(
    customer: CustomerCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    verify_company_ownership(db, customer.company_id, current_user.id)
    db_customer = CustomerModel(**customer.dict())
    db.add(db_customer)
    db.commit()
    db.refresh(db_customer)
    return db_customer

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
    fieldnames = ['name', 'email', 'phone', 'address', 'contact_person', 'payment_terms', 'is_active', 'notes']
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
            'notes': 'Sample customer data'
        },
        {
            'name': 'Example Customer 2',
            'email': 'customer2@example.com',
            'phone': '+1 (555) 987-6543',
            'address': '456 Oak Ave, City, State, ZIP',
            'contact_person': 'Jane Smith',
            'payment_terms': 14,
            'is_active': 'true',
            'notes': 'Another sample customer'
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
            "notes": "Additional notes (optional)"
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
    
    update_data = customer_update.dict(exclude_unset=True)
    for field, value in update_data.items():
        setattr(customer, field, value)
    
    db.commit()
    db.refresh(customer)
    return customer

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
                    'company_id': company_id
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
    fieldnames = ['name', 'email', 'phone', 'address', 'contact_person', 'payment_terms', 'is_active', 'notes']
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
            'notes': customer.notes or ''
        })
    
    csv_content = output.getvalue()
    output.close()
    
    return {
        "filename": f"customers_export_{company_id}.csv",
        "content": csv_content,
        "count": len(customers)
    }