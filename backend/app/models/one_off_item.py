from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Text, Numeric
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.core.database import Base

class OneOffItem(Base):
    __tablename__ = "one_off_items"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False, index=True)
    description = Column(Text)
    amount = Column(Numeric(15, 2), nullable=False)
    vat_amount = Column(Numeric(15, 2), default=0.0)
    item_type = Column(String, nullable=False)  # income or expense
    planned_date = Column(DateTime(timezone=True), nullable=False)  # When this is expected to occur
    is_confirmed = Column(String, default="planned")  # planned, confirmed, completed, cancelled
    source = Column(String)  # Who you receive from / pay to
    reference = Column(String)  # Reference numbers, etc.
    notes = Column(Text)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    company_id = Column(Integer, ForeignKey("companies.id"), nullable=False)
    category_id = Column(Integer, ForeignKey("expense_categories.id"))  # Optional for expenses
    
    company = relationship("Company", back_populates="one_off_items")
    category = relationship("ExpenseCategory", back_populates="one_off_items")