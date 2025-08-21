#!/bin/bash

echo "🚀 Setting up Cash Flow Management System"

# Check if Python is installed
if ! command -v python3 &> /dev/null; then
    echo "❌ Python 3 is required but not installed."
    exit 1
fi

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is required but not installed."
    exit 1
fi

# Check if PostgreSQL is available
if ! command -v psql &> /dev/null; then
    echo "⚠️  PostgreSQL not found. Please ensure it's installed and running."
    echo "   You can use Docker: docker run --name postgres -e POSTGRES_PASSWORD=cashflow123 -p 5432:5432 -d postgres:15"
fi

echo "📦 Setting up Backend..."
cd backend

# Create virtual environment
if [ ! -d "venv" ]; then
    python3 -m venv venv
fi

# Activate virtual environment
source venv/bin/activate || source venv/Scripts/activate

# Install dependencies
pip install -r requirements.txt

# Copy environment file
if [ ! -f ".env" ]; then
    cp ../.env.example .env
    echo "📝 Created .env file. Please update it with your database credentials."
fi

echo "📦 Setting up Frontend..."
cd ../frontend

# Install dependencies
npm install

# Copy environment file
if [ ! -f ".env" ]; then
    cp ../.env.example .env.local
fi

cd ..

echo "✅ Setup complete!"
echo ""
echo "Next steps:"
echo "1. Start PostgreSQL database"
echo "2. Update backend/.env with your database credentials"
echo "3. Run database migrations: cd backend && alembic upgrade head"
echo "4. Start the backend: cd backend && uvicorn app.main:app --reload"
echo "5. Start the frontend: cd frontend && npm run dev"
echo ""
echo "Or use Docker: docker-compose up -d"