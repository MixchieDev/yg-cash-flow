from pydantic import BaseModel
from typing import Optional
from datetime import datetime, date
from decimal import Decimal
from app.models.transaction import TransactionType, TransactionStatus

class TransactionBase(BaseModel):
    description: str
    amount: Decimal
    vat_amount: Decimal = Decimal("0")
    type: TransactionType
    status: TransactionStatus = TransactionStatus.PENDING
    transaction_date: date
    due_date: Optional[date] = None
    payment_date: Optional[date] = None
    reference: Optional[str] = None
    notes: Optional[str] = None

class TransactionCreate(TransactionBase):
    company_id: int
    customer_id: Optional[int] = None

class TransactionUpdate(BaseModel):
    description: Optional[str] = None
    amount: Optional[Decimal] = None
    vat_amount: Optional[Decimal] = None
    type: Optional[TransactionType] = None
    status: Optional[TransactionStatus] = None
    transaction_date: Optional[date] = None
    due_date: Optional[date] = None
    payment_date: Optional[date] = None
    reference: Optional[str] = None
    notes: Optional[str] = None
    customer_id: Optional[int] = None

class Transaction(TransactionBase):
    id: int
    company_id: int
    customer_id: Optional[int] = None
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True