from pydantic import BaseModel, ConfigDict
from datetime import datetime, date
from typing import List, Optional
from decimal import Decimal

class ProjectionItemBase(BaseModel):
    projection_date: datetime
    item_name: str
    item_type: str  # "income" or "expense"
    amount: Decimal
    vat_amount: Optional[Decimal] = Decimal('0.00')
    source_type: str  # "recurring_income" or "recurring_expense"
    source_id: int

class ProjectionItem(ProjectionItemBase):
    model_config = ConfigDict(from_attributes=True)
    
    id: int
    company_id: int
    created_at: datetime

class CashFlowProjectionBase(BaseModel):
    projection_date: datetime
    income_amount: Optional[Decimal] = Decimal('0.00')
    expense_amount: Optional[Decimal] = Decimal('0.00')
    net_flow: Optional[Decimal] = Decimal('0.00')
    running_balance: Optional[Decimal] = Decimal('0.00')

class CashFlowProjection(CashFlowProjectionBase):
    model_config = ConfigDict(from_attributes=True)
    
    id: int
    company_id: int
    created_at: datetime

class ProjectionRequest(BaseModel):
    start_date: date
    end_date: date
    starting_balance: Optional[Decimal] = Decimal('0.00')

class ProjectionSummary(BaseModel):
    total_projected_income: Decimal
    total_projected_expenses: Decimal
    net_projected_flow: Decimal
    final_balance: Decimal
    days_with_negative_balance: int
    lowest_balance: Decimal
    highest_balance: Decimal

class DailyProjection(BaseModel):
    date: date
    income: Decimal
    expenses: Decimal
    net_flow: Decimal
    running_balance: Decimal
    items: List[ProjectionItem]

class ProjectionResponse(BaseModel):
    projections: List[CashFlowProjection]
    summary: ProjectionSummary
    start_date: date
    end_date: date