#!/usr/bin/env python3
"""
Database initialization script that creates all tables.
Works with both SQLite (dev) and PostgreSQL (production).
"""
import os
import sys
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from sqlalchemy import create_engine
from app.core.config import settings
from app.core.database import Base
from app.models import user, company, customer, transaction, recurring_income, recurring_expense, one_off_item, bank_account, cash_flow_projection

def init_database():
    """Create all database tables"""
    try:
        # Use DATABASE_URL from environment or config
        database_url = settings.database_url
        
        # For local dev, default to SQLite if no DATABASE_URL is set
        if not os.getenv('DATABASE_URL') and database_url == "sqlite:///./cashflow.db":
            database_url = 'sqlite:///app.db'
            print("Creating database tables with SQLite...")
        else:
            print(f"Creating database tables with: {database_url.split('@')[1] if '@' in database_url else 'SQLite'}")
        
        engine = create_engine(database_url)
        Base.metadata.create_all(bind=engine)
        print("Database tables created successfully!")
        
        if 'sqlite' in database_url.lower():
            print("Database file: app.db")
        else:
            print("Connected to PostgreSQL database")
            
        return True
    except Exception as e:
        print(f"Error creating database tables: {e}")
        return False

if __name__ == "__main__":
    success = init_database()
    sys.exit(0 if success else 1)