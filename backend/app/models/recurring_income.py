from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Text, Numeric, Enum
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.core.database import Base
import enum

class FrequencyType(str, enum.Enum):
    WEEKLY = "weekly"
    MONTHLY = "monthly"
    QUARTERLY = "quarterly"
    ANNUALLY = "annually"

class RecurringIncome(Base):
    __tablename__ = "recurring_income"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False, index=True)
    description = Column(Text)
    amount = Column(Numeric(15, 2), nullable=False)
    vat_amount = Column(Numeric(15, 2), default=0.0)
    frequency = Column(Enum(FrequencyType), nullable=False)
    start_date = Column(DateTime(timezone=True), nullable=False)
    end_date = Column(DateTime(timezone=True))  # Optional, for income streams that end
    day_of_month = Column(Integer)  # For monthly/quarterly (1-31)
    day_of_week = Column(Integer)   # For weekly (0=Monday, 6=Sunday)
    is_active = Column(String, default="active")  # active, paused, ended
    notes = Column(Text)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    company_id = Column(Integer, ForeignKey("companies.id"), nullable=False)
    customer_id = Column(Integer, ForeignKey("customers.id"))  # Optional
    
    company = relationship("Company", back_populates="recurring_income")
    customer = relationship("Customer", back_populates="recurring_income")