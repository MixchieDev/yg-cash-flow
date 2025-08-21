from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Text, Boolean, Date
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.core.database import Base

class Customer(Base):
    __tablename__ = "customers"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False, index=True)
    email = Column(String, index=True)
    phone = Column(String)
    address = Column(Text)
    contact_person = Column(String)
    payment_terms = Column(Integer, default=30)
    is_active = Column(Boolean, default=True)
    notes = Column(Text)
    
    # New business fields
    company_name = Column(String, index=True)
    product_type = Column(String)
    revenue_model = Column(String)
    partner = Column(String)
    contract_start = Column(Date)
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    company_id = Column(Integer, ForeignKey("companies.id"), nullable=False)
    
    company = relationship("Company", back_populates="customers")
    transactions = relationship("Transaction", back_populates="customer")
    recurring_income = relationship("RecurringIncome", back_populates="customer")