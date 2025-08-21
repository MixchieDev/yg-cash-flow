#!/usr/bin/env python3
"""
Initialize the database by creating all tables.
Run this instead of alembic if you're having migration issues.
"""

from app.core.database import engine, Base
from app.models import user, company, customer, transaction, expense

def init_db():
    """Create all database tables."""
    print("Creating database tables...")
    Base.metadata.create_all(bind=engine)
    print("Database initialized successfully!")
    print(f"Database file: cashflow.db")

if __name__ == "__main__":
    init_db()