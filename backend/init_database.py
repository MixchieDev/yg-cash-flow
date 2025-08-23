#!/usr/bin/env python3
"""
Simple database initialization script that creates all tables.
This bypasses alembic for quick setup.
"""
import os
import sys
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.core.database import engine, Base
from app.models import user, company, customer, transaction, recurring_income, recurring_expense, one_off_item, bank_account, cash_flow_projection

def init_database():
    """Create all database tables"""
    try:
        print("Creating database tables...")
        Base.metadata.create_all(bind=engine)
        print("Database tables created successfully!")
        return True
    except Exception as e:
        print(f"Error creating database tables: {e}")
        return False

if __name__ == "__main__":
    success = init_database()
    sys.exit(0 if success else 1)