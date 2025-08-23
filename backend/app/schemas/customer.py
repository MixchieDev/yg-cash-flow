from pydantic import BaseModel, field_validator
from typing import Optional
from datetime import datetime, date

class CustomerBase(BaseModel):
    name: str
    email: Optional[str] = None
    phone: Optional[str] = None
    address: Optional[str] = None
    contact_person: Optional[str] = None
    payment_terms: int = 30
    is_active: bool = True
    notes: Optional[str] = None
    
    # New business fields
    company_name: Optional[str] = None
    product_type: Optional[str] = None
    revenue_model: Optional[str] = None
    partner: Optional[str] = None
    contract_start: Optional[date] = None
    
    @field_validator('email', 'phone', 'address', 'contact_person', 'notes', 'company_name', 'product_type', 'revenue_model', 'partner', mode='before')
    @classmethod
    def validate_empty_strings(cls, v):
        if v == '':
            return None
        return v
    
    @field_validator('contract_start', mode='before')
    @classmethod
    def validate_contract_start(cls, v):
        if v == '' or v is None:
            return None
        return v

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
    
    # New business fields
    company_name: Optional[str] = None
    product_type: Optional[str] = None
    revenue_model: Optional[str] = None
    partner: Optional[str] = None
    contract_start: Optional[date] = None
    
    @field_validator('contract_start', mode='before')
    @classmethod
    def validate_contract_start(cls, v):
        if v == '' or v is None:
            return None
        return v

class Customer(CustomerBase):
    id: int
    company_id: int
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True