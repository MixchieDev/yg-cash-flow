from datetime import datetime, timedelta, date
from dateutil.relativedelta import relativedelta
from sqlalchemy.orm import Session
from sqlalchemy import and_
from typing import List, Dict, Optional
from decimal import Decimal

from app.models.recurring_income import RecurringIncome, FrequencyType as IncomeFrequency
from app.models.recurring_expense import RecurringExpense, FrequencyType as ExpenseFrequency
from app.models.one_off_item import OneOffItem
from app.models.cash_flow_projection import CashFlowProjection, ProjectionItem
from app.models.bank_account import BankAccount

class ProjectionCalculationService:
    def __init__(self, db: Session):
        self.db = db

    def generate_projections(self, company_id: int, start_date: date, end_date: date, starting_balance: Optional[Decimal] = None):
        """Generate cash flow projections for a company over a date range with per-account tracking"""
        
        # Clear existing projections for this date range
        self.db.query(CashFlowProjection).filter(
            and_(
                CashFlowProjection.company_id == company_id,
                CashFlowProjection.projection_date >= start_date,
                CashFlowProjection.projection_date <= end_date
            )
        ).delete()
        
        self.db.query(ProjectionItem).filter(
            and_(
                ProjectionItem.company_id == company_id,
                ProjectionItem.projection_date >= start_date,
                ProjectionItem.projection_date <= end_date
            )
        ).delete()

        # Get all bank accounts for this company
        bank_accounts = self.db.query(BankAccount).filter(
            and_(
                BankAccount.company_id == company_id,
                BankAccount.is_active == True
            )
        ).all()
        
        if not bank_accounts:
            raise ValueError("No active bank accounts found for company. Please create at least one bank account.")

        # Get all active recurring income and expenses
        recurring_incomes = self.db.query(RecurringIncome).filter(
            and_(
                RecurringIncome.company_id == company_id,
                RecurringIncome.is_active == "active"
            )
        ).all()

        recurring_expenses = self.db.query(RecurringExpense).filter(
            and_(
                RecurringExpense.company_id == company_id,
                RecurringExpense.is_active == "active"
            )
        ).all()

        # Get all one-off items in the date range (planned and confirmed items)
        one_off_items = self.db.query(OneOffItem).filter(
            and_(
                OneOffItem.company_id == company_id,
                OneOffItem.planned_date >= start_date,
                OneOffItem.planned_date <= end_date,
                OneOffItem.is_confirmed.in_(["planned", "confirmed"])
            )
        ).all()

        # Generate all projection items with bank account assignments
        all_items = []
        
        # Process recurring income
        for income in recurring_incomes:
            items = self._generate_income_items(income, start_date, end_date)
            all_items.extend(items)
        
        # Process recurring expenses
        for expense in recurring_expenses:
            items = self._generate_expense_items(expense, start_date, end_date)
            all_items.extend(items)
        
        # Process one-off items
        for one_off in one_off_items:
            item = self._generate_one_off_item(one_off)
            all_items.append(item)

        # Sort by date
        all_items.sort(key=lambda x: x.projection_date)

        # Initialize account balances
        account_balances = {}
        for account in bank_accounts:
            account_balances[account.id] = account.current_balance

        # Generate per-account projections and consolidated view
        current_date = start_date
        while current_date <= end_date:
            # Calculate per-account flows for this date
            account_flows = {account.id: {'income': Decimal('0.00'), 'expense': Decimal('0.00')} for account in bank_accounts}
            
            # Sum up all items for this date by account
            for item in all_items:
                if item.projection_date.date() == current_date:
                    account_id = item.bank_account_id
                    if account_id and account_id in account_flows:
                        if item.item_type == "income":
                            account_flows[account_id]['income'] += item.amount
                        else:
                            account_flows[account_id]['expense'] += item.amount

            # Create per-account projections
            total_income = Decimal('0.00')
            total_expense = Decimal('0.00')
            
            for account in bank_accounts:
                account_id = account.id
                daily_income = account_flows[account_id]['income']
                daily_expense = account_flows[account_id]['expense']
                net_flow = daily_income - daily_expense
                
                # Update account balance
                account_balances[account_id] += net_flow
                
                # Create per-account projection (only if there's activity or we want daily snapshots)
                if daily_income > 0 or daily_expense > 0 or current_date == start_date:
                    projection = CashFlowProjection(
                        company_id=company_id,
                        bank_account_id=account_id,
                        projection_date=datetime.combine(current_date, datetime.min.time()),
                        income_amount=daily_income,
                        expense_amount=daily_expense,
                        net_flow=net_flow,
                        running_balance=account_balances[account_id]
                    )
                    self.db.add(projection)
                
                # Add to totals for consolidated view
                total_income += daily_income
                total_expense += daily_expense

            # Create consolidated company-wide projection
            total_net_flow = total_income - total_expense
            total_balance = sum(account_balances.values())
            
            consolidated_projection = CashFlowProjection(
                company_id=company_id,
                bank_account_id=None,  # NULL for consolidated view
                projection_date=datetime.combine(current_date, datetime.min.time()),
                income_amount=total_income,
                expense_amount=total_expense,
                net_flow=total_net_flow,
                running_balance=total_balance
            )
            self.db.add(consolidated_projection)
            
            current_date += timedelta(days=1)

        # Bulk insert all projection items
        for item in all_items:
            self.db.add(item)

        self.db.commit()

    def _generate_income_items(self, income: RecurringIncome, start_date: date, end_date: date) -> List[ProjectionItem]:
        """Generate projection items for a recurring income"""
        items = []
        
        # Find the first occurrence on or after the start_date
        current_date = max(start_date, income.start_date.date())
        end_limit = min(end_date, income.end_date.date() if income.end_date else end_date)

        # Check if there's an occurrence in the current month/period that we should include
        first_occurrence = self._find_first_occurrence(current_date, income.frequency, income.day_of_month, income.day_of_week)
        
        while first_occurrence <= end_limit:
            if first_occurrence >= current_date:  # Only include if on or after start date
                item = ProjectionItem(
                    company_id=income.company_id,
                    projection_date=datetime.combine(first_occurrence, datetime.min.time()),
                    item_name=income.name,
                    item_type="income",
                    amount=income.amount,
                    vat_amount=income.vat_amount or Decimal('0.00'),
                    source_type="recurring_income",
                    source_id=income.id,
                    bank_account_id=income.bank_account_id
                )
                items.append(item)
            
            # Move to next occurrence
            first_occurrence = self._calculate_next_occurrence(first_occurrence, income.frequency, income.day_of_month, income.day_of_week)

        return items

    def _generate_expense_items(self, expense: RecurringExpense, start_date: date, end_date: date) -> List[ProjectionItem]:
        """Generate projection items for a recurring expense"""
        items = []
        
        # Find the first occurrence on or after the start_date
        current_date = max(start_date, expense.start_date.date())
        end_limit = min(end_date, expense.end_date.date() if expense.end_date else end_date)

        # Check if there's an occurrence in the current month/period that we should include
        first_occurrence = self._find_first_occurrence(current_date, expense.frequency, expense.day_of_month, expense.day_of_week)
        
        while first_occurrence <= end_limit:
            if first_occurrence >= current_date:  # Only include if on or after start date
                item = ProjectionItem(
                    company_id=expense.company_id,
                    projection_date=datetime.combine(first_occurrence, datetime.min.time()),
                    item_name=expense.name,
                    item_type="expense",
                    amount=expense.amount,
                    vat_amount=expense.vat_amount or Decimal('0.00'),
                    source_type="recurring_expense",
                    source_id=expense.id,
                    bank_account_id=expense.bank_account_id
                )
                items.append(item)
            
            # Move to next occurrence
            first_occurrence = self._calculate_next_occurrence(first_occurrence, expense.frequency, expense.day_of_month, expense.day_of_week)

        return items

    def _find_first_occurrence(self, start_date: date, frequency: str, day_of_month: Optional[int], day_of_week: Optional[int]) -> date:
        """Find the first occurrence on or after start_date"""
        if frequency == "monthly":
            if day_of_month:
                # Check if the day has already passed this month
                try:
                    current_month_date = start_date.replace(day=day_of_month)
                    if current_month_date >= start_date:
                        return current_month_date
                except ValueError:
                    # Day doesn't exist in this month, use last day of month
                    current_month_date = start_date.replace(day=28)
                    if current_month_date >= start_date:
                        return current_month_date
                
                # If we've passed the day this month, go to next month
                next_month = start_date.replace(day=1) + relativedelta(months=1)
                try:
                    return next_month.replace(day=day_of_month)
                except ValueError:
                    return next_month.replace(day=28)
            else:
                return start_date
        
        elif frequency == "weekly":
            if day_of_week is not None:
                days_ahead = (day_of_week - start_date.weekday()) % 7
                return start_date + timedelta(days=days_ahead)
            else:
                return start_date
        
        elif frequency == "quarterly":
            if day_of_month:
                # Similar logic to monthly but for quarters
                try:
                    current_period_date = start_date.replace(day=day_of_month)
                    if current_period_date >= start_date:
                        return current_period_date
                except ValueError:
                    current_period_date = start_date.replace(day=28)
                    if current_period_date >= start_date:
                        return current_period_date
                
                # Move to next quarter
                next_quarter = start_date.replace(day=1) + relativedelta(months=3)
                try:
                    return next_quarter.replace(day=day_of_month)
                except ValueError:
                    return next_quarter.replace(day=28)
            else:
                return start_date
        
        elif frequency == "annually":
            try:
                current_year_date = start_date.replace(month=start_date.month, day=day_of_month if day_of_month else start_date.day)
                if current_year_date >= start_date:
                    return current_year_date
            except ValueError:
                pass
            
            # Move to next year
            return start_date + relativedelta(years=1)
        
        # Default fallback
        return start_date

    def _calculate_next_occurrence(self, current_date: date, frequency: str, day_of_month: Optional[int], day_of_week: Optional[int]) -> date:
        """Calculate the next occurrence based on frequency and rules"""
        
        if frequency == "weekly":
            # Calculate next occurrence of the specified day of week
            days_ahead = (day_of_week - current_date.weekday()) % 7
            if days_ahead == 0 and current_date == current_date:  # If it's the same day, move to next week
                days_ahead = 7
            return current_date + timedelta(days=days_ahead)
            
        elif frequency == "monthly":
            # Next month, same day
            if day_of_month:
                next_month = current_date.replace(day=1) + relativedelta(months=1)
                try:
                    return next_month.replace(day=min(day_of_month, 28))  # Avoid invalid dates
                except ValueError:
                    return next_month.replace(day=28)  # Fallback for invalid dates
            else:
                return current_date + relativedelta(months=1)
                
        elif frequency == "quarterly":
            # Next quarter, same day
            if day_of_month:
                next_quarter = current_date.replace(day=1) + relativedelta(months=3)
                try:
                    return next_quarter.replace(day=min(day_of_month, 28))
                except ValueError:
                    return next_quarter.replace(day=28)
            else:
                return current_date + relativedelta(months=3)
                
        elif frequency == "annually":
            # Next year, same date
            try:
                return current_date + relativedelta(years=1)
            except ValueError:
                # Handle leap year edge case
                return current_date.replace(month=2, day=28) + relativedelta(years=1)
        
        # Default fallback
        return current_date + timedelta(days=30)

    def _generate_one_off_item(self, one_off: OneOffItem) -> ProjectionItem:
        """Generate a projection item from a one-off item"""
        item = ProjectionItem(
            company_id=one_off.company_id,
            projection_date=one_off.planned_date,
            item_name=one_off.name,
            item_type=one_off.item_type,
            amount=one_off.amount,
            vat_amount=one_off.vat_amount or Decimal('0.00'),
            source_type="one_off_item",
            source_id=one_off.id,
            bank_account_id=one_off.bank_account_id
        )
        return item

    def get_projections(self, company_id: int, start_date: date, end_date: date, bank_account_id: Optional[int] = None) -> List[CashFlowProjection]:
        """Get cash flow projections for a date range, optionally filtered by bank account"""
        query = self.db.query(CashFlowProjection).filter(
            and_(
                CashFlowProjection.company_id == company_id,
                CashFlowProjection.projection_date >= start_date,
                CashFlowProjection.projection_date <= end_date
            )
        )
        
        if bank_account_id is not None:
            query = query.filter(CashFlowProjection.bank_account_id == bank_account_id)
        else:
            # Return consolidated view (bank_account_id is NULL)
            query = query.filter(CashFlowProjection.bank_account_id.is_(None))
            
        return query.order_by(CashFlowProjection.projection_date).all()

    def get_projection_items(self, company_id: int, projection_date: date, bank_account_id: Optional[int] = None) -> List[ProjectionItem]:
        """Get detailed projection items for a specific date, optionally filtered by bank account"""
        query = self.db.query(ProjectionItem).filter(
            and_(
                ProjectionItem.company_id == company_id,
                ProjectionItem.projection_date == datetime.combine(projection_date, datetime.min.time())
            )
        )
        
        if bank_account_id is not None:
            query = query.filter(ProjectionItem.bank_account_id == bank_account_id)
            
        return query.order_by(ProjectionItem.item_name).all()