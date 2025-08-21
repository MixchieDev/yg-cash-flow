from pydantic import BaseModel
from typing import Optional
from datetime import datetime

class CustomerBase(BaseModel):
    name: str
    email: Optional[str] = None
    phone: Optional[str] = None
    address: Optional[str] = None
    contact_person: Optional[str] = None
    payment_terms: int = 30
    is_active: bool = True
    notes: Optional[str] = None

class CustomerCreate(CustomerBase):
    company_id: int

class CustomerUpdate(BaseModel):
    name: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    address: Optional[str] = None
    contact_person: Optional[str] = None
    payment_terms: Optional[int] = None
    is_active: Optional[bool] = None
    notes: Optional[str] = None

class Customer(CustomerBase):
    id: int
    company_id: int
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True