"""Fix frequency field to use string instead of enum

Revision ID: 738ce09051d8
Revises: 2f8b338b678c
Create Date: 2025-08-22 18:30:49.046136

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '738ce09051d8'
down_revision = '2f8b338b678c'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Change frequency columns from enum to string
    # This handles the case where enum types might not exist
    try:
        # For recurring_income table
        op.execute("ALTER TABLE recurring_income ALTER COLUMN frequency TYPE VARCHAR USING frequency::VARCHAR")
        
        # For recurring_expenses table  
        op.execute("ALTER TABLE recurring_expenses ALTER COLUMN frequency TYPE VARCHAR USING frequency::VARCHAR")
        
        # Drop the enum type if it exists
        op.execute("DROP TYPE IF EXISTS frequencytype")
    except Exception:
        # If enum doesn't exist, just ensure columns are varchar
        op.execute("ALTER TABLE recurring_income ALTER COLUMN frequency TYPE VARCHAR")
        op.execute("ALTER TABLE recurring_expenses ALTER COLUMN frequency TYPE VARCHAR")


def downgrade() -> None:
    # Create enum type and change back if needed
    op.execute("CREATE TYPE frequencytype AS ENUM ('weekly', 'monthly', 'quarterly', 'annually')")
    op.execute("ALTER TABLE recurring_income ALTER COLUMN frequency TYPE frequencytype USING frequency::frequencytype")
    op.execute("ALTER TABLE recurring_expenses ALTER COLUMN frequency TYPE frequencytype USING frequency::frequencytype")