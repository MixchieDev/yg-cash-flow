from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import os
import sys

# Add the backend directory to Python path  
backend_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, backend_dir)

# Import the main FastAPI app
try:
    from app.main import app as fastapi_app
    app = fastapi_app
except Exception as e:
    # Fallback if import fails
    app = FastAPI(title="Cash Flow Management API")
    
    # Add CORS middleware
    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],
        allow_credentials=False,
        allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS", "HEAD"],
        allow_headers=["*"],
    )
    
    @app.get("/")
    async def root():
        return {"message": "Cash Flow Management API - Fallback", "error": str(e)}