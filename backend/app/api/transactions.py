from typing import List
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from datetime import date
from app.core.database import get_db
from app.core.auth import get_current_active_user
from app.schemas.transaction import Transaction, TransactionCreate, TransactionUpdate
from app.models.user import User
from app.models.transaction import Transaction as TransactionModel, TransactionType, TransactionStatus
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

@router.post("/", response_model=Transaction)
def create_transaction(
    transaction: TransactionCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    verify_company_ownership(db, transaction.company_id, current_user.id)
    db_transaction = TransactionModel(**transaction.dict())
    db.add(db_transaction)
    db.commit()
    db.refresh(db_transaction)
    return db_transaction

@router.get("/company/{company_id}", response_model=List[Transaction])
def read_transactions(
    company_id: int,
    skip: int = 0,
    limit: int = 100,
    transaction_type: TransactionType = Query(None),
    status: TransactionStatus = Query(None),
    start_date: date = Query(None),
    end_date: date = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    verify_company_ownership(db, company_id, current_user.id)
    
    query = db.query(TransactionModel).filter(TransactionModel.company_id == company_id)
    
    if transaction_type:
        query = query.filter(TransactionModel.type == transaction_type)
    if status:
        query = query.filter(TransactionModel.status == status)
    if start_date:
        query = query.filter(TransactionModel.transaction_date >= start_date)
    if end_date:
        query = query.filter(TransactionModel.transaction_date <= end_date)
    
    transactions = query.offset(skip).limit(limit).all()
    return transactions

@router.get("/{transaction_id}", response_model=Transaction)
def read_transaction(
    transaction_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    transaction = db.query(TransactionModel).filter(TransactionModel.id == transaction_id).first()
    if not transaction:
        raise HTTPException(status_code=404, detail="Transaction not found")
    
    verify_company_ownership(db, transaction.company_id, current_user.id)
    return transaction

@router.put("/{transaction_id}", response_model=Transaction)
def update_transaction(
    transaction_id: int,
    transaction_update: TransactionUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    transaction = db.query(TransactionModel).filter(TransactionModel.id == transaction_id).first()
    if not transaction:
        raise HTTPException(status_code=404, detail="Transaction not found")
    
    verify_company_ownership(db, transaction.company_id, current_user.id)
    
    update_data = transaction_update.dict(exclude_unset=True)
    for field, value in update_data.items():
        setattr(transaction, field, value)
    
    db.commit()
    db.refresh(transaction)
    return transaction

@router.delete("/{transaction_id}")
def delete_transaction(
    transaction_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    transaction = db.query(TransactionModel).filter(TransactionModel.id == transaction_id).first()
    if not transaction:
        raise HTTPException(status_code=404, detail="Transaction not found")
    
    verify_company_ownership(db, transaction.company_id, current_user.id)
    
    db.delete(transaction)
    db.commit()
    return {"message": "Transaction deleted successfully"}