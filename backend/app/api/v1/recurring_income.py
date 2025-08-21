from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional

from app.core.database import get_db
from app.core.auth import get_current_active_user
from app.models.user import User
from app.models.recurring_income import RecurringIncome
from app.schemas.recurring_income import RecurringIncomeCreate, RecurringIncomeUpdate, RecurringIncome as RecurringIncomeSchema

router = APIRouter()

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