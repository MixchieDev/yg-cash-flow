from typing import List
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from datetime import date
from app.core.database import get_db
from app.core.auth import get_current_active_user
from app.schemas.expense import Expense, ExpenseCreate, ExpenseUpdate, ExpenseCategory, ExpenseCategoryCreate
from app.models.user import User
from app.models.expense import Expense as ExpenseModel, ExpenseCategory as ExpenseCategoryModel
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

@router.post("/categories/", response_model=ExpenseCategory)
def create_expense_category(
    category: ExpenseCategoryCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    db_category = ExpenseCategoryModel(**category.dict())
    db.add(db_category)
    db.commit()
    db.refresh(db_category)
    return db_category

@router.get("/categories/", response_model=List[ExpenseCategory])
def read_expense_categories(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    categories = db.query(ExpenseCategoryModel).offset(skip).limit(limit).all()
    return categories

@router.post("/", response_model=Expense)
def create_expense(
    expense: ExpenseCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    verify_company_ownership(db, expense.company_id, current_user.id)
    db_expense = ExpenseModel(**expense.dict())
    db.add(db_expense)
    db.commit()
    db.refresh(db_expense)
    return db_expense

@router.get("/company/{company_id}", response_model=List[Expense])
def read_expenses(
    company_id: int,
    skip: int = 0,
    limit: int = 100,
    category_id: int = Query(None),
    start_date: date = Query(None),
    end_date: date = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    verify_company_ownership(db, company_id, current_user.id)
    
    query = db.query(ExpenseModel).filter(ExpenseModel.company_id == company_id)
    
    if category_id:
        query = query.filter(ExpenseModel.category_id == category_id)
    if start_date:
        query = query.filter(ExpenseModel.expense_date >= start_date)
    if end_date:
        query = query.filter(ExpenseModel.expense_date <= end_date)
    
    expenses = query.offset(skip).limit(limit).all()
    return expenses

@router.get("/{expense_id}", response_model=Expense)
def read_expense(
    expense_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    expense = db.query(ExpenseModel).filter(ExpenseModel.id == expense_id).first()
    if not expense:
        raise HTTPException(status_code=404, detail="Expense not found")
    
    verify_company_ownership(db, expense.company_id, current_user.id)
    return expense

@router.put("/{expense_id}", response_model=Expense)
def update_expense(
    expense_id: int,
    expense_update: ExpenseUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    expense = db.query(ExpenseModel).filter(ExpenseModel.id == expense_id).first()
    if not expense:
        raise HTTPException(status_code=404, detail="Expense not found")
    
    verify_company_ownership(db, expense.company_id, current_user.id)
    
    update_data = expense_update.dict(exclude_unset=True)
    for field, value in update_data.items():
        setattr(expense, field, value)
    
    db.commit()
    db.refresh(expense)
    return expense

@router.delete("/{expense_id}")
def delete_expense(
    expense_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    expense = db.query(ExpenseModel).filter(ExpenseModel.id == expense_id).first()
    if not expense:
        raise HTTPException(status_code=404, detail="Expense not found")
    
    verify_company_ownership(db, expense.company_id, current_user.id)
    
    db.delete(expense)
    db.commit()
    return {"message": "Expense deleted successfully"}