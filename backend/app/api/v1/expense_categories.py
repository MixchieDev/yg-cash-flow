from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File
from sqlalchemy.orm import Session
from typing import List
import csv
import io

from app.core.database import get_db
from app.core.auth import get_current_active_user
from app.models.user import User
from app.models.expense import ExpenseCategory
from app.schemas.expense import ExpenseCategory as ExpenseCategorySchema, ExpenseCategoryCreate, ExpenseCategoryUpdate

router = APIRouter()

@router.get("/", response_model=List[ExpenseCategorySchema])
def get_expense_categories(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Get all expense categories"""
    categories = db.query(ExpenseCategory).order_by(ExpenseCategory.name).all()
    return categories

@router.get("/import-template")
def get_import_template(
    current_user: User = Depends(get_current_active_user)
):
    """Download CSV template for expense category import"""
    
    # Create CSV template with headers and sample data
    output = io.StringIO()
    fieldnames = ['name', 'description']
    writer = csv.DictWriter(output, fieldnames=fieldnames)
    
    writer.writeheader()
    # Add sample rows to show the expected format
    sample_data = [
        {
            'name': 'Office Supplies',
            'description': 'Stationery, paper, pens, and other office materials'
        },
        {
            'name': 'Travel & Transportation',
            'description': 'Business travel, flights, hotels, and local transportation'
        },
        {
            'name': 'Marketing & Advertising',
            'description': 'Digital marketing, print ads, promotional materials'
        },
        {
            'name': 'Software & Subscriptions',
            'description': 'SaaS tools, software licenses, and monthly subscriptions'
        },
        {
            'name': 'Utilities',
            'description': 'Electricity, water, internet, and phone bills'
        }
    ]
    
    for row in sample_data:
        writer.writerow(row)
    
    csv_content = output.getvalue()
    output.close()
    
    return {
        "filename": "expense_categories_import_template.csv",
        "content": csv_content,
        "instructions": {
            "name": "Category name (required, must be unique)",
            "description": "Category description (optional)"
        }
    }

@router.post("/import-csv")
def import_expense_categories_csv(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Import expense categories from CSV file"""
    
    # Validate file type
    if not file.filename.endswith('.csv'):
        raise HTTPException(status_code=400, detail="File must be a CSV")
    
    try:
        # Read the uploaded file
        content = file.file.read()
        csv_content = content.decode('utf-8')
        csv_reader = csv.DictReader(io.StringIO(csv_content))
        
        imported_categories = []
        errors = []
        
        for row_num, row in enumerate(csv_reader, start=2):  # Start at 2 for header row
            try:
                # Map CSV columns to category fields
                category_data = {
                    'name': row.get('name', '').strip(),
                    'description': row.get('description', '').strip() or None
                }
                
                # Validate required fields
                if not category_data['name']:
                    errors.append(f"Row {row_num}: Category name is required")
                    continue
                
                # Check if category already exists
                existing = db.query(ExpenseCategory).filter(
                    ExpenseCategory.name == category_data['name']
                ).first()
                
                if existing:
                    errors.append(f"Row {row_num}: Category '{category_data['name']}' already exists")
                    continue
                
                # Create category
                db_category = ExpenseCategory(**category_data)
                db.add(db_category)
                imported_categories.append(category_data['name'])
                
            except Exception as e:
                errors.append(f"Row {row_num}: {str(e)}")
        
        # Commit all successful imports
        if imported_categories:
            db.commit()
        
        return {
            "success": len(imported_categories),
            "imported_categories": imported_categories,
            "errors": errors,
            "total_processed": len(imported_categories) + len(errors)
        }
        
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=400, detail=f"Error processing CSV file: {str(e)}")
    finally:
        file.file.close()

@router.get("/export-csv")
def export_expense_categories_csv(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Export expense categories to CSV format"""
    
    categories = db.query(ExpenseCategory).order_by(ExpenseCategory.name).all()
    
    # Create CSV content
    output = io.StringIO()
    fieldnames = ['name', 'description']
    writer = csv.DictWriter(output, fieldnames=fieldnames)
    
    writer.writeheader()
    for category in categories:
        writer.writerow({
            'name': category.name,
            'description': category.description or ''
        })
    
    csv_content = output.getvalue()
    output.close()
    
    return {
        "filename": "expense_categories_export.csv",
        "content": csv_content,
        "count": len(categories)
    }

@router.get("/{category_id}", response_model=ExpenseCategorySchema)
def get_expense_category(
    category_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Get a specific expense category"""
    category = db.query(ExpenseCategory).filter(ExpenseCategory.id == category_id).first()
    if not category:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Expense category not found"
        )
    return category

@router.post("/", response_model=ExpenseCategorySchema)
def create_expense_category(
    category: ExpenseCategoryCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Create a new expense category"""
    # Check if category with same name already exists
    existing = db.query(ExpenseCategory).filter(
        ExpenseCategory.name == category.name
    ).first()
    
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="An expense category with this name already exists"
        )
    
    db_category = ExpenseCategory(**category.dict())
    db.add(db_category)
    db.commit()
    db.refresh(db_category)
    return db_category

@router.put("/{category_id}", response_model=ExpenseCategorySchema)
def update_expense_category(
    category_id: int,
    category_update: ExpenseCategoryUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Update an expense category"""
    category = db.query(ExpenseCategory).filter(ExpenseCategory.id == category_id).first()
    if not category:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Expense category not found"
        )
    
    # Check if new name conflicts with existing category
    if category_update.name and category_update.name != category.name:
        existing = db.query(ExpenseCategory).filter(
            ExpenseCategory.name == category_update.name,
            ExpenseCategory.id != category_id
        ).first()
        
        if existing:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="An expense category with this name already exists"
            )
    
    update_data = category_update.dict(exclude_unset=True)
    for field, value in update_data.items():
        setattr(category, field, value)
    
    db.commit()
    db.refresh(category)
    return category

@router.delete("/{category_id}")
def delete_expense_category(
    category_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Delete an expense category"""
    category = db.query(ExpenseCategory).filter(ExpenseCategory.id == category_id).first()
    if not category:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Expense category not found"
        )
    
    # Check if category is being used by any expenses or recurring expenses
    if category.expenses or category.recurring_expenses or category.one_off_items:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot delete category that is being used by existing expenses"
        )
    
    db.delete(category)
    db.commit()
    return {"detail": "Expense category deleted successfully"}