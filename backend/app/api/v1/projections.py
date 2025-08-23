from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import date, datetime, timedelta
from decimal import Decimal

from app.core.database import get_db
from app.core.auth import get_current_active_user
from app.models.user import User
from app.schemas.projection import (
    ProjectionRequest, ProjectionResponse, CashFlowProjection, 
    ProjectionSummary, ProjectionItem, DailyProjection
)
from app.services.projection_service import ProjectionCalculationService
from app.models.bank_account import BankAccount

router = APIRouter()

@router.post("/generate/{company_id}")
def generate_projections(
    company_id: int,
    request: ProjectionRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Generate cash flow projections for a company"""
    projection_service = ProjectionCalculationService(db)
    
    try:
        projection_service.generate_projections(
            company_id=company_id,
            start_date=request.start_date,
            end_date=request.end_date,
            starting_balance=request.starting_balance
        )
        return {"detail": "Projections generated successfully"}
    except Exception as e:
        import traceback
        print(f"Error in projection generation: {str(e)}")
        print(f"Traceback: {traceback.format_exc()}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error generating projections: {str(e)}"
        )

@router.get("/{company_id}", response_model=ProjectionResponse)
def get_projections(
    company_id: int,
    start_date: date = Query(..., description="Start date for projections"),
    end_date: date = Query(..., description="End date for projections"),
    bank_account_id: Optional[int] = Query(None, description="Filter by specific bank account (None for consolidated view)"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Get cash flow projections for a company"""
    projection_service = ProjectionCalculationService(db)
    
    projections = projection_service.get_projections(company_id, start_date, end_date, bank_account_id)
    
    if not projections:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No projections found. Please generate projections first."
        )
    
    # Calculate summary statistics
    total_income = sum(p.income_amount for p in projections)
    total_expenses = sum(p.expense_amount for p in projections)
    net_flow = total_income - total_expenses
    final_balance = projections[-1].running_balance if projections else Decimal('0.00')
    
    negative_days = sum(1 for p in projections if p.running_balance < 0)
    lowest_balance = min(p.running_balance for p in projections) if projections else Decimal('0.00')
    highest_balance = max(p.running_balance for p in projections) if projections else Decimal('0.00')
    
    summary = ProjectionSummary(
        total_projected_income=total_income,
        total_projected_expenses=total_expenses,
        net_projected_flow=net_flow,
        final_balance=final_balance,
        days_with_negative_balance=negative_days,
        lowest_balance=lowest_balance,
        highest_balance=highest_balance
    )
    
    return ProjectionResponse(
        projections=projections,
        summary=summary,
        start_date=start_date,
        end_date=end_date
    )

@router.get("/{company_id}/daily/{projection_date}")
def get_daily_projection_details(
    company_id: int,
    projection_date: date,
    bank_account_id: Optional[int] = Query(None, description="Filter by specific bank account"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Get detailed breakdown for a specific projection date"""
    projection_service = ProjectionCalculationService(db)
    
    items = projection_service.get_projection_items(company_id, projection_date, bank_account_id)
    
    if not items:
        return {"items": [], "date": projection_date, "income": 0, "expenses": 0, "net_flow": 0}
    
    income = sum(item.amount for item in items if item.item_type == "income")
    expenses = sum(item.amount for item in items if item.item_type == "expense")
    
    return {
        "date": projection_date,
        "income": income,
        "expenses": expenses,
        "net_flow": income - expenses,
        "items": items
    }

@router.get("/{company_id}/summary")
def get_projection_summary(
    company_id: int,
    view: str = Query("monthly", description="Summary view: daily, weekly, monthly, quarterly, yearly"),
    start_date: Optional[date] = Query(None, description="Start date (defaults to current date)"),
    end_date: Optional[date] = Query(None, description="End date (defaults to 1 year from start)"),
    bank_account_id: Optional[int] = Query(None, description="Filter by specific bank account (None for consolidated view)"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Get projection summary grouped by time period"""
    if not start_date:
        start_date = date.today()
    
    if not end_date:
        if view == "yearly":
            end_date = start_date + timedelta(days=365 * 3)  # 3 years for yearly view
        else:
            end_date = start_date + timedelta(days=365)  # 1 year default
    
    projection_service = ProjectionCalculationService(db)
    projections = projection_service.get_projections(company_id, start_date, end_date, bank_account_id)
    
    if not projections:
        return {"summary": [], "view": view, "start_date": start_date, "end_date": end_date}
    
    # Group projections by period
    grouped_data = []
    
    if view == "daily":
        for projection in projections:
            grouped_data.append({
                "period": projection.projection_date.strftime("%Y-%m-%d"),
                "income": projection.income_amount,
                "expenses": projection.expense_amount,
                "net_flow": projection.net_flow,
                "running_balance": projection.running_balance
            })
    
    elif view == "weekly":
        weekly_data = {}
        for projection in projections:
            # Get Monday of the week
            monday = projection.projection_date.date() - timedelta(days=projection.projection_date.weekday())
            week_key = monday.strftime("%Y-W%U")
            
            if week_key not in weekly_data:
                weekly_data[week_key] = {
                    "period": f"Week of {monday.strftime('%Y-%m-%d')}",
                    "income": Decimal('0'),
                    "expenses": Decimal('0'),
                    "net_flow": Decimal('0'),
                    "running_balance": projection.running_balance
                }
            
            weekly_data[week_key]["income"] += projection.income_amount
            weekly_data[week_key]["expenses"] += projection.expense_amount
            weekly_data[week_key]["net_flow"] += projection.net_flow
            weekly_data[week_key]["running_balance"] = projection.running_balance
        
        grouped_data = list(weekly_data.values())
    
    elif view == "monthly":
        monthly_data = {}
        for projection in projections:
            month_key = projection.projection_date.strftime("%Y-%m")
            
            if month_key not in monthly_data:
                monthly_data[month_key] = {
                    "period": projection.projection_date.strftime("%Y-%m"),
                    "income": Decimal('0'),
                    "expenses": Decimal('0'),
                    "net_flow": Decimal('0'),
                    "running_balance": projection.running_balance
                }
            
            monthly_data[month_key]["income"] += projection.income_amount
            monthly_data[month_key]["expenses"] += projection.expense_amount
            monthly_data[month_key]["net_flow"] += projection.net_flow
            # Always use the latest (end-of-month) running balance
            monthly_data[month_key]["running_balance"] = projection.running_balance
        
        grouped_data = list(monthly_data.values())
    
    elif view == "quarterly":
        quarterly_data = {}
        for projection in projections:
            quarter = (projection.projection_date.month - 1) // 3 + 1
            quarter_key = f"{projection.projection_date.year}-Q{quarter}"
            
            if quarter_key not in quarterly_data:
                quarterly_data[quarter_key] = {
                    "period": quarter_key,
                    "income": Decimal('0'),
                    "expenses": Decimal('0'),
                    "net_flow": Decimal('0'),
                    "running_balance": projection.running_balance
                }
            
            quarterly_data[quarter_key]["income"] += projection.income_amount
            quarterly_data[quarter_key]["expenses"] += projection.expense_amount
            quarterly_data[quarter_key]["net_flow"] += projection.net_flow
            quarterly_data[quarter_key]["running_balance"] = projection.running_balance
        
        grouped_data = list(quarterly_data.values())
    
    elif view == "yearly":
        yearly_data = {}
        for projection in projections:
            year_key = str(projection.projection_date.year)
            
            if year_key not in yearly_data:
                yearly_data[year_key] = {
                    "period": year_key,
                    "income": Decimal('0'),
                    "expenses": Decimal('0'),
                    "net_flow": Decimal('0'),
                    "running_balance": projection.running_balance
                }
            
            yearly_data[year_key]["income"] += projection.income_amount
            yearly_data[year_key]["expenses"] += projection.expense_amount
            yearly_data[year_key]["net_flow"] += projection.net_flow
            yearly_data[year_key]["running_balance"] = projection.running_balance
        
        grouped_data = list(yearly_data.values())
    
    return {
        "summary": grouped_data,
        "view": view,
        "start_date": start_date,
        "end_date": end_date
    }

@router.get("/{company_id}/bank-accounts")
def get_company_bank_accounts(
    company_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Get available bank accounts for projection filtering"""
    bank_accounts = db.query(BankAccount).filter(
        BankAccount.company_id == company_id,
        BankAccount.is_active == True
    ).all()
    
    return [
        {
            "id": account.id,
            "name": account.name,
            "account_type": account.account_type,
            "current_balance": float(account.current_balance),
            "is_default": account.is_default
        }
        for account in bank_accounts
    ]