from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Text, Numeric
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.core.database import Base

class Company(Base):
    __tablename__ = "companies"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False, index=True)
    description = Column(Text)
    address = Column(Text)
    phone = Column(String)
    email = Column(String)
    website = Column(String)
    tax_number = Column(String)
    vat_rate = Column(Numeric(5, 2), default=20.0)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    owner_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    
    owner = relationship("User", back_populates="companies")
    customers = relationship("Customer", back_populates="company")
    transactions = relationship("Transaction", back_populates="company")
    expenses = relationship("Expense", back_populates="company")
    recurring_income = relationship("RecurringIncome", back_populates="company")
    recurring_expenses = relationship("RecurringExpense", back_populates="company")
    one_off_items = relationship("OneOffItem", back_populates="company")
    projections = relationship("CashFlowProjection", back_populates="company")