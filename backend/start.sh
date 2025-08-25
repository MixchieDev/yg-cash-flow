#!/bin/bash

# Set default port if not provided
export PORT=${PORT:-8000}

# Wait for database to be ready
echo "Waiting for database to be ready..."
sleep 5

# Initialize database with retry logic
echo "Initializing database..."
max_retries=5
retry_count=0

while [ $retry_count -lt $max_retries ]; do
    if python init_database.py; then
        echo "Database initialized successfully"
        break
    else
        retry_count=$((retry_count + 1))
        echo "Database initialization failed. Retry $retry_count/$max_retries in 10 seconds..."
        sleep 10
    fi
done

if [ $retry_count -eq $max_retries ]; then
    echo "Failed to initialize database after $max_retries attempts"
    exit 1
fi

# Run database migrations
echo "Running migrations..."
alembic upgrade head

# Start the FastAPI server
echo "Starting server on port $PORT..."
uvicorn app.main:app --host 0.0.0.0 --port $PORT --workers 1