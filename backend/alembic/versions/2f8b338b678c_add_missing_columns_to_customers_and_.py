"""Add missing columns to customers and bank_accounts

Revision ID: 2f8b338b678c
Revises: c5fb2b6c9cd4
Create Date: 2025-08-22 16:43:28.293525

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '2f8b338b678c'
down_revision = 'c5fb2b6c9cd4'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Add missing columns to customers table
    op.add_column('customers', sa.Column('contact_person', sa.String(), nullable=True))
    op.add_column('customers', sa.Column('payment_terms', sa.String(), nullable=True))
    op.add_column('customers', sa.Column('is_active', sa.Boolean(), nullable=True, default=True))
    op.add_column('customers', sa.Column('notes', sa.Text(), nullable=True))
    op.add_column('customers', sa.Column('company_name', sa.String(), nullable=True))
    op.add_column('customers', sa.Column('product_type', sa.String(), nullable=True))
    op.add_column('customers', sa.Column('revenue_model', sa.String(), nullable=True))
    op.add_column('customers', sa.Column('partner', sa.String(), nullable=True))
    op.add_column('customers', sa.Column('contract_start', sa.DateTime(timezone=True), nullable=True))
    
    # Add missing column to bank_accounts table
    op.add_column('bank_accounts', sa.Column('notes', sa.Text(), nullable=True))


def downgrade() -> None:
    # Remove columns from bank_accounts
    op.drop_column('bank_accounts', 'notes')
    
    # Remove columns from customers
    op.drop_column('customers', 'contract_start')
    op.drop_column('customers', 'partner')
    op.drop_column('customers', 'revenue_model')
    op.drop_column('customers', 'product_type')
    op.drop_column('customers', 'company_name')
    op.drop_column('customers', 'notes')
    op.drop_column('customers', 'is_active')
    op.drop_column('customers', 'payment_terms')
    op.drop_column('customers', 'contact_person')