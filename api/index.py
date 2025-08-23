import os
import sys

# Add the backend directory to Python path
backend_dir = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'backend')
sys.path.insert(0, backend_dir)

from app.main import app as fastapi_app

# Export the FastAPI app for Vercel
app = fastapi_app