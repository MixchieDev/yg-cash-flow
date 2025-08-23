"""Add address column to companies

Revision ID: c5fb2b6c9cd4
Revises: 7a37d758645b
Create Date: 2025-08-22 16:36:22.578702

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'c5fb2b6c9cd4'
down_revision = '7a37d758645b'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Add missing columns to companies table
    op.add_column('companies', sa.Column('address', sa.String(), nullable=True))
    op.add_column('companies', sa.Column('phone', sa.String(), nullable=True))
    op.add_column('companies', sa.Column('email', sa.String(), nullable=True))
    op.add_column('companies', sa.Column('website', sa.String(), nullable=True))
    op.add_column('companies', sa.Column('tax_number', sa.String(), nullable=True))
    op.add_column('companies', sa.Column('vat_rate', sa.Numeric(precision=5, scale=2), nullable=True))


def downgrade() -> None:
    # Remove the columns
    op.drop_column('companies', 'vat_rate')
    op.drop_column('companies', 'tax_number')
    op.drop_column('companies', 'website')
    op.drop_column('companies', 'email')
    op.drop_column('companies', 'phone')
    op.drop_column('companies', 'address')