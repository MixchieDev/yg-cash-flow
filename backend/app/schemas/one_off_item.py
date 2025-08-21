from pydantic import BaseModel, ConfigDict
from datetime import datetime
from typing import Optional
from decimal import Decimal

class OneOffItemBase(BaseModel):
    name: str
    description: Optional[str] = None
    amount: Decimal
    vat_amount: Optional[Decimal] = Decimal('0.00')
    item_type: str  # income or expense
    planned_date: datetime
    is_confirmed: Optional[str] = "planned"  # planned, confirmed, completed, cancelled
    source: Optional[str] = None  # Who you receive from / pay to
    reference: Optional[str] = None
    notes: Optional[str] = None
    company_id: int
    category_id: Optional[int] = None

class OneOffItemCreate(OneOffItemBase):
    pass

class OneOffItemUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    amount: Optional[Decimal] = None
    vat_amount: Optional[Decimal] = None
    item_type: Optional[str] = None
    planned_date: Optional[datetime] = None
    is_confirmed: Optional[str] = None
    source: Optional[str] = None
    reference: Optional[str] = None
    notes: Optional[str] = None
    category_id: Optional[int] = None

class OneOffItem(OneOffItemBase):
    model_config = ConfigDict(from_attributes=True)
    
    id: int
    created_at: datetime
    updated_at: Optional[datetime] = None