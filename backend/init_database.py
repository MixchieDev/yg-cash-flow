#!/usr/bin/env python3
"""
Simple database initialization script that creates all tables.
This bypasses alembic for quick setup and forces SQLite usage.
"""
import os
import sys
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

# Force SQLite usage by setting environment variable before importing
os.environ['DATABASE_URL'] = 'sqlite:///app.db'

from sqlalchemy import create_engine
from app.core.database import Base
from app.models import user, company, customer, transaction, recurring_income, recurring_expense, one_off_item, bank_account, cash_flow_projection

def init_database():
    """Create all database tables"""
    try:
        print("Creating database tables with SQLite...")
        # Create SQLite engine directly
        engine = create_engine('sqlite:///app.db')
        Base.metadata.create_all(bind=engine)
        print("Database tables created successfully!")
        print("Database file: app.db")
        return True
    except Exception as e:
        print(f"Error creating database tables: {e}")
        return False

if __name__ == "__main__":
    success = init_database()
    sys.exit(0 if success else 1)