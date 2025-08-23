#!/bin/bash

# Set default port if not provided
export PORT=${PORT:-8000}

# Run database migrations
alembic upgrade head

# Start the FastAPI server
uvicorn app.main:app --host 0.0.0.0 --port $PORT --workers 1