from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Text, Numeric
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.core.database import Base

class CashFlowProjection(Base):
    """Generated projections for visualization - calculated from recurring patterns"""
    __tablename__ = "cash_flow_projections"

    id = Column(Integer, primary_key=True, index=True)
    projection_date = Column(DateTime(timezone=True), nullable=False, index=True)
    income_amount = Column(Numeric(15, 2), default=0.0)
    expense_amount = Column(Numeric(15, 2), default=0.0)
    net_flow = Column(Numeric(15, 2), default=0.0)
    running_balance = Column(Numeric(15, 2), default=0.0)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    company_id = Column(Integer, ForeignKey("companies.id"), nullable=False)
    bank_account_id = Column(Integer, ForeignKey("bank_accounts.id"))  # Optional, for account-specific projections
    
    company = relationship("Company", back_populates="projections")
    bank_account = relationship("BankAccount", back_populates="projections")

class ProjectionItem(Base):
    """Individual items that make up a projection (for detailed breakdown)"""
    __tablename__ = "projection_items"
    
    id = Column(Integer, primary_key=True, index=True)
    projection_date = Column(DateTime(timezone=True), nullable=False, index=True)
    item_name = Column(String, nullable=False)
    item_type = Column(String, nullable=False)  # "income" or "expense"
    amount = Column(Numeric(15, 2), nullable=False)
    vat_amount = Column(Numeric(15, 2), default=0.0)
    source_type = Column(String, nullable=False)  # "recurring_income" or "recurring_expense"
    source_id = Column(Integer, nullable=False)  # ID of the recurring pattern
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    company_id = Column(Integer, ForeignKey("companies.id"), nullable=False)
    
    company = relationship("Company")