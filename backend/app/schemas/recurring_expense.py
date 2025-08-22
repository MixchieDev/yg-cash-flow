from pydantic import BaseModel, ConfigDict
from datetime import datetime
from typing import Optional
from decimal import Decimal

class RecurringExpenseBase(BaseModel):
    name: str
    description: Optional[str] = None
    amount: Decimal
    vat_amount: Optional[Decimal] = Decimal('0.00')
    frequency: str  # weekly, monthly, quarterly, annually
    start_date: datetime
    end_date: Optional[datetime] = None
    day_of_month: Optional[int] = None  # 1-31 for monthly/quarterly
    day_of_week: Optional[int] = None   # 0-6 for weekly (0=Monday)
    is_active: Optional[str] = "active"
    supplier: Optional[str] = None
    reference: Optional[str] = None
    notes: Optional[str] = None
    company_id: int
    category_id: Optional[int] = None
    bank_account_id: Optional[int] = None

class RecurringExpenseCreate(RecurringExpenseBase):
    pass

class RecurringExpenseUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    amount: Optional[Decimal] = None
    vat_amount: Optional[Decimal] = None
    frequency: Optional[str] = None
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None
    day_of_month: Optional[int] = None
    day_of_week: Optional[int] = None
    is_active: Optional[str] = None
    supplier: Optional[str] = None
    reference: Optional[str] = None
    notes: Optional[str] = None
    category_id: Optional[int] = None
    bank_account_id: Optional[int] = None

class RecurringExpense(RecurringExpenseBase):
    model_config = ConfigDict(from_attributes=True)
    
    id: int
    created_at: datetime
    updated_at: Optional[datetime] = None