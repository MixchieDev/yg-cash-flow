from pydantic import BaseModel, ConfigDict
from datetime import datetime
from typing import Optional
from decimal import Decimal

class RecurringIncomeBase(BaseModel):
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
    notes: Optional[str] = None
    company_id: int
    customer_id: Optional[int] = None

class RecurringIncomeCreate(RecurringIncomeBase):
    pass

class RecurringIncomeUpdate(BaseModel):
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
    notes: Optional[str] = None
    customer_id: Optional[int] = None

class RecurringIncome(RecurringIncomeBase):
    model_config = ConfigDict(from_attributes=True)
    
    id: int
    created_at: datetime
    updated_at: Optional[datetime] = None