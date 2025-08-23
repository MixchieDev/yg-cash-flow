from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Text, Numeric
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.core.database import Base

class RecurringExpense(Base):
    __tablename__ = "recurring_expenses"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False, index=True)
    description = Column(Text)
    amount = Column(Numeric(15, 2), nullable=False)
    vat_amount = Column(Numeric(15, 2), default=0.0)
    frequency = Column(String, nullable=False)  # weekly, monthly, quarterly, annually
    start_date = Column(DateTime(timezone=True), nullable=False)
    end_date = Column(DateTime(timezone=True))  # Optional, for expenses that end
    day_of_month = Column(Integer)  # For monthly/quarterly (1-31)
    day_of_week = Column(Integer)   # For weekly (0=Monday, 6=Sunday)
    is_active = Column(String, default="active")  # active, paused, ended
    supplier = Column(String)       # Who you pay
    reference = Column(String)      # Account numbers, etc.
    notes = Column(Text)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    company_id = Column(Integer, ForeignKey("companies.id"), nullable=False)
    category_id = Column(Integer, ForeignKey("expense_categories.id"))  # Optional
    bank_account_id = Column(Integer, ForeignKey("bank_accounts.id"))  # Optional, defaults to primary account
    
    company = relationship("Company", back_populates="recurring_expenses")
    category = relationship("ExpenseCategory", back_populates="recurring_expenses")
    bank_account = relationship("BankAccount", back_populates="recurring_expenses")