from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Text, Numeric, Boolean
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.core.database import Base

class BankAccount(Base):
    __tablename__ = "bank_accounts"

    id = Column(Integer, primary_key=True, index=True)
    company_id = Column(Integer, ForeignKey("companies.id"), nullable=False)
    name = Column(String, nullable=False, index=True)  # e.g., "Primary Checking", "Savings", "Payroll"
    bank_name = Column(String)  # e.g., "Chase Bank", "Wells Fargo"
    account_number = Column(String)  # Last 4 digits for security
    account_type = Column(String, default="checking")  # checking, savings, credit_line, investment
    current_balance = Column(Numeric(12, 2), default=0.0)
    is_active = Column(Boolean, default=True)
    is_default = Column(Boolean, default=False)  # Default account for new transactions
    notes = Column(Text)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relationships
    company = relationship("Company", back_populates="bank_accounts")
    recurring_incomes = relationship("RecurringIncome", back_populates="bank_account")
    recurring_expenses = relationship("RecurringExpense", back_populates="bank_account")
    one_off_items = relationship("OneOffItem", back_populates="bank_account")
    projections = relationship("CashFlowProjection", back_populates="bank_account")