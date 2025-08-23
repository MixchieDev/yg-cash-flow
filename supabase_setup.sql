-- Cash Flow Management Database Schema
-- Run this in Supabase SQL Editor

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    email VARCHAR UNIQUE NOT NULL,
    hashed_password VARCHAR NOT NULL,
    full_name VARCHAR,
    is_active BOOLEAN DEFAULT true,
    is_superuser BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Companies table
CREATE TABLE companies (
    id SERIAL PRIMARY KEY,
    name VARCHAR NOT NULL,
    description TEXT,
    currency VARCHAR(3) DEFAULT 'USD',
    owner_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Bank accounts table
CREATE TABLE bank_accounts (
    id SERIAL PRIMARY KEY,
    name VARCHAR NOT NULL,
    account_number VARCHAR,
    account_type VARCHAR NOT NULL,
    bank_name VARCHAR,
    current_balance DECIMAL(15, 2) DEFAULT 0.0,
    is_active BOOLEAN DEFAULT true,
    is_default BOOLEAN DEFAULT false,
    company_id INTEGER REFERENCES companies(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Customers table
CREATE TABLE customers (
    id SERIAL PRIMARY KEY,
    name VARCHAR NOT NULL,
    email VARCHAR,
    phone VARCHAR,
    address TEXT,
    company_id INTEGER REFERENCES companies(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Expense categories table
CREATE TABLE expense_categories (
    id SERIAL PRIMARY KEY,
    name VARCHAR NOT NULL,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Insert default expense categories
INSERT INTO expense_categories (name, description) VALUES
('Office Supplies', 'Pens, paper, and other office materials'),
('Rent & Utilities', 'Office rent and utility bills'),
('Marketing & Advertising', 'Promotional activities and advertising costs'),
('Travel & Transportation', 'Business travel and transportation expenses'),
('Professional Services', 'Legal, accounting, and consulting fees'),
('Insurance', 'Business insurance premiums'),
('Equipment & Software', 'Computers, software licenses, and equipment'),
('Office Maintenance', 'Cleaning, repairs, and maintenance'),
('Telecommunications', 'Phone, internet, and communication services'),
('Other', 'Miscellaneous business expenses');

-- Recurring income table
CREATE TABLE recurring_income (
    id SERIAL PRIMARY KEY,
    name VARCHAR NOT NULL,
    description TEXT,
    amount DECIMAL(15, 2) NOT NULL,
    vat_amount DECIMAL(15, 2) DEFAULT 0.0,
    frequency VARCHAR NOT NULL CHECK (frequency IN ('weekly', 'monthly', 'quarterly', 'annually')),
    start_date DATE NOT NULL,
    end_date DATE,
    day_of_month INTEGER CHECK (day_of_month >= 1 AND day_of_month <= 31),
    day_of_week INTEGER CHECK (day_of_week >= 0 AND day_of_week <= 6),
    is_active VARCHAR DEFAULT 'active' CHECK (is_active IN ('active', 'paused', 'ended')),
    notes TEXT,
    company_id INTEGER REFERENCES companies(id) ON DELETE CASCADE,
    customer_id INTEGER REFERENCES customers(id) ON DELETE SET NULL,
    bank_account_id INTEGER REFERENCES bank_accounts(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Recurring expenses table
CREATE TABLE recurring_expenses (
    id SERIAL PRIMARY KEY,
    name VARCHAR NOT NULL,
    description TEXT,
    amount DECIMAL(15, 2) NOT NULL,
    vat_amount DECIMAL(15, 2) DEFAULT 0.0,
    frequency VARCHAR NOT NULL CHECK (frequency IN ('weekly', 'monthly', 'quarterly', 'annually')),
    start_date DATE NOT NULL,
    end_date DATE,
    day_of_month INTEGER CHECK (day_of_month >= 1 AND day_of_month <= 31),
    day_of_week INTEGER CHECK (day_of_week >= 0 AND day_of_week <= 6),
    is_active VARCHAR DEFAULT 'active' CHECK (is_active IN ('active', 'paused', 'ended')),
    supplier VARCHAR,
    reference VARCHAR,
    notes TEXT,
    company_id INTEGER REFERENCES companies(id) ON DELETE CASCADE,
    category_id INTEGER REFERENCES expense_categories(id) ON DELETE SET NULL,
    bank_account_id INTEGER REFERENCES bank_accounts(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- One-off items table
CREATE TABLE one_off_items (
    id SERIAL PRIMARY KEY,
    name VARCHAR NOT NULL,
    description TEXT,
    amount DECIMAL(15, 2) NOT NULL,
    vat_amount DECIMAL(15, 2) DEFAULT 0.0,
    item_type VARCHAR NOT NULL CHECK (item_type IN ('income', 'expense')),
    planned_date DATE NOT NULL,
    is_confirmed VARCHAR DEFAULT 'planned' CHECK (is_confirmed IN ('planned', 'confirmed', 'completed', 'cancelled')),
    source VARCHAR,
    reference VARCHAR,
    notes TEXT,
    company_id INTEGER REFERENCES companies(id) ON DELETE CASCADE,
    category_id INTEGER REFERENCES expense_categories(id) ON DELETE SET NULL,
    bank_account_id INTEGER REFERENCES bank_accounts(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Cash flow projections table
CREATE TABLE cash_flow_projections (
    id SERIAL PRIMARY KEY,
    projection_date DATE NOT NULL,
    income_amount DECIMAL(15, 2) DEFAULT 0.0,
    expense_amount DECIMAL(15, 2) DEFAULT 0.0,
    net_flow DECIMAL(15, 2) DEFAULT 0.0,
    running_balance DECIMAL(15, 2) DEFAULT 0.0,
    company_id INTEGER REFERENCES companies(id) ON DELETE CASCADE,
    bank_account_id INTEGER REFERENCES bank_accounts(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Projection items table
CREATE TABLE projection_items (
    id SERIAL PRIMARY KEY,
    projection_date DATE NOT NULL,
    item_name VARCHAR NOT NULL,
    item_type VARCHAR NOT NULL CHECK (item_type IN ('income', 'expense')),
    amount DECIMAL(15, 2) NOT NULL,
    vat_amount DECIMAL(15, 2) DEFAULT 0.0,
    source_type VARCHAR NOT NULL,
    source_id INTEGER NOT NULL,
    company_id INTEGER REFERENCES companies(id) ON DELETE CASCADE,
    bank_account_id INTEGER REFERENCES bank_accounts(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Transactions table (for actual recorded transactions)
CREATE TABLE transactions (
    id SERIAL PRIMARY KEY,
    description VARCHAR NOT NULL,
    amount DECIMAL(15, 2) NOT NULL,
    transaction_date DATE NOT NULL,
    transaction_type VARCHAR NOT NULL CHECK (transaction_type IN ('income', 'expense')),
    category VARCHAR,
    reference VARCHAR,
    notes TEXT,
    company_id INTEGER REFERENCES companies(id) ON DELETE CASCADE,
    bank_account_id INTEGER REFERENCES bank_accounts(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for better performance
CREATE INDEX idx_companies_owner_id ON companies(owner_id);
CREATE INDEX idx_bank_accounts_company_id ON bank_accounts(company_id);
CREATE INDEX idx_customers_company_id ON customers(company_id);
CREATE INDEX idx_recurring_income_company_id ON recurring_income(company_id);
CREATE INDEX idx_recurring_expenses_company_id ON recurring_expenses(company_id);
CREATE INDEX idx_one_off_items_company_id ON one_off_items(company_id);
CREATE INDEX idx_cash_flow_projections_company_id ON cash_flow_projections(company_id);
CREATE INDEX idx_cash_flow_projections_date ON cash_flow_projections(projection_date);
CREATE INDEX idx_projection_items_company_id ON projection_items(company_id);
CREATE INDEX idx_projection_items_date ON projection_items(projection_date);
CREATE INDEX idx_transactions_company_id ON transactions(company_id);
CREATE INDEX idx_transactions_date ON transactions(transaction_date);