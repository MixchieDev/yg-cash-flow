from pydantic import BaseModel
from typing import Optional
from datetime import datetime, date
from decimal import Decimal

class ExpenseCategoryBase(BaseModel):
    name: str
    description: Optional[str] = None

class ExpenseCategoryCreate(ExpenseCategoryBase):
    pass

class ExpenseCategoryUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None

class ExpenseCategory(ExpenseCategoryBase):
    id: int
    created_at: datetime

    class Config:
        from_attributes = True

class ExpenseBase(BaseModel):
    description: str
    amount: Decimal
    vat_amount: Decimal = Decimal("0")
    expense_date: date
    receipt_number: Optional[str] = None
    supplier: Optional[str] = None
    notes: Optional[str] = None

class ExpenseCreate(ExpenseBase):
    company_id: int
    category_id: Optional[int] = None

class ExpenseUpdate(BaseModel):
    description: Optional[str] = None
    amount: Optional[Decimal] = None
    vat_amount: Optional[Decimal] = None
    expense_date: Optional[date] = None
    receipt_number: Optional[str] = None
    supplier: Optional[str] = None
    notes: Optional[str] = None
    category_id: Optional[int] = None

class Expense(ExpenseBase):
    id: int
    company_id: int
    category_id: Optional[int] = None
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True