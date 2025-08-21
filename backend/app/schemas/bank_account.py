from pydantic import BaseModel
from typing import Optional
from datetime import datetime
from decimal import Decimal

class BankAccountBase(BaseModel):
    name: str
    bank_name: Optional[str] = None
    account_number: Optional[str] = None  # Last 4 digits for security
    account_type: str = "checking"  # checking, savings, credit_line, investment
    current_balance: Decimal = Decimal("0.0")
    is_active: bool = True
    is_default: bool = False
    notes: Optional[str] = None

class BankAccountCreate(BankAccountBase):
    company_id: int

class BankAccountUpdate(BaseModel):
    name: Optional[str] = None
    bank_name: Optional[str] = None
    account_number: Optional[str] = None
    account_type: Optional[str] = None
    current_balance: Optional[Decimal] = None
    is_active: Optional[bool] = None
    is_default: Optional[bool] = None
    notes: Optional[str] = None

class BankAccount(BankAccountBase):
    id: int
    company_id: int
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True