from typing import List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.models.bank_account import BankAccount
from app.models.user import User
from app.schemas.bank_account import BankAccount as BankAccountSchema, BankAccountCreate, BankAccountUpdate
from app.api.auth import get_current_active_user

router = APIRouter()

@router.get("/company/{company_id}", response_model=List[BankAccountSchema])
def get_bank_accounts_by_company(
    company_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Get all bank accounts for a company."""
    # TODO: Add company ownership verification
    bank_accounts = db.query(BankAccount).filter(
        BankAccount.company_id == company_id,
        BankAccount.is_active == True
    ).all()
    return bank_accounts

@router.get("/{account_id}", response_model=BankAccountSchema)
def get_bank_account(
    account_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Get a specific bank account."""
    bank_account = db.query(BankAccount).filter(BankAccount.id == account_id).first()
    if not bank_account:
        raise HTTPException(status_code=404, detail="Bank account not found")
    
    # TODO: Add ownership verification
    return bank_account

@router.post("/", response_model=BankAccountSchema)
def create_bank_account(
    bank_account: BankAccountCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Create a new bank account."""
    # TODO: Add company ownership verification
    
    # If this is marked as default, unset other default accounts for the company
    if bank_account.is_default:
        db.query(BankAccount).filter(
            BankAccount.company_id == bank_account.company_id,
            BankAccount.is_default == True
        ).update({BankAccount.is_default: False})
    
    db_bank_account = BankAccount(**bank_account.dict())
    db.add(db_bank_account)
    db.commit()
    db.refresh(db_bank_account)
    return db_bank_account

@router.put("/{account_id}", response_model=BankAccountSchema)
def update_bank_account(
    account_id: int,
    bank_account: BankAccountUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Update a bank account."""
    db_bank_account = db.query(BankAccount).filter(BankAccount.id == account_id).first()
    if not db_bank_account:
        raise HTTPException(status_code=404, detail="Bank account not found")
    
    # TODO: Add ownership verification
    
    # If setting as default, unset other default accounts for the company
    if bank_account.is_default:
        db.query(BankAccount).filter(
            BankAccount.company_id == db_bank_account.company_id,
            BankAccount.is_default == True,
            BankAccount.id != account_id
        ).update({BankAccount.is_default: False})
    
    update_data = bank_account.dict(exclude_unset=True)
    for field, value in update_data.items():
        setattr(db_bank_account, field, value)
    
    db.commit()
    db.refresh(db_bank_account)
    return db_bank_account

@router.delete("/{account_id}")
def delete_bank_account(
    account_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Delete (deactivate) a bank account."""
    db_bank_account = db.query(BankAccount).filter(BankAccount.id == account_id).first()
    if not db_bank_account:
        raise HTTPException(status_code=404, detail="Bank account not found")
    
    # TODO: Add ownership verification
    
    # Don't actually delete, just deactivate
    db_bank_account.is_active = False
    db.commit()
    
    return {"message": "Bank account deactivated successfully"}

@router.put("/{account_id}/set-default")
def set_default_account(
    account_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Set an account as the default for its company."""
    db_bank_account = db.query(BankAccount).filter(BankAccount.id == account_id).first()
    if not db_bank_account:
        raise HTTPException(status_code=404, detail="Bank account not found")
    
    # TODO: Add ownership verification
    
    # Unset other default accounts for the company
    db.query(BankAccount).filter(
        BankAccount.company_id == db_bank_account.company_id,
        BankAccount.is_default == True
    ).update({BankAccount.is_default: False})
    
    # Set this account as default
    db_bank_account.is_default = True
    db.commit()
    
    return {"message": "Account set as default successfully"}