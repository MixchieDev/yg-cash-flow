#!/bin/bash

# Set default port if not provided
export PORT=${PORT:-8000}

# Initialize database if it doesn't exist or if using PostgreSQL
echo "Initializing database..."
python init_database.py

# Run database migrations
echo "Running migrations..."
alembic upgrade head

# Start the FastAPI server
echo "Starting server on port $PORT..."
uvicorn app.main:app --host 0.0.0.0 --port $PORT --workers 1