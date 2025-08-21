from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional

from app.core.database import get_db
from app.core.auth import get_current_active_user
from app.models.user import User
from app.models.recurring_expense import RecurringExpense
from app.schemas.recurring_expense import RecurringExpenseCreate, RecurringExpenseUpdate, RecurringExpense as RecurringExpenseSchema

router = APIRouter()

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