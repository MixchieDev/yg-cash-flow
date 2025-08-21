from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
import logging
import traceback
from app.core.config import settings
from app.api import companies, users, customers, transactions, auth
from app.api.v1 import recurring_income, recurring_expenses, projections, one_off_items, expense_categories

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(
    title="Cash Flow Management API",
    description="A comprehensive cash flow management system",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000", "http://localhost:3001", "http://localhost:3002", "http://127.0.0.1:3002", "http://localhost:3003", "http://127.0.0.1:3003"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.middleware("http")
async def log_requests(request: Request, call_next):
    try:
        response = await call_next(request)
        return response
    except Exception as e:
        logger.error(f"Unhandled exception for {request.method} {request.url}: {str(e)}")
        logger.error(f"Traceback: {traceback.format_exc()}")
        raise e

app.include_router(auth.router, prefix="/api/v1/auth", tags=["authentication"])
app.include_router(users.router, prefix="/api/v1/users", tags=["users"])
app.include_router(companies.router, prefix="/api/v1/companies", tags=["companies"])
app.include_router(customers.router, prefix="/api/v1/customers", tags=["customers"])
app.include_router(transactions.router, prefix="/api/v1/transactions", tags=["transactions"])
app.include_router(recurring_income.router, prefix="/api/v1/recurring-income", tags=["recurring-income"])
app.include_router(recurring_expenses.router, prefix="/api/v1/recurring-expenses", tags=["recurring-expenses"])
app.include_router(one_off_items.router, prefix="/api/v1/one-off-items", tags=["one-off-items"])
app.include_router(projections.router, prefix="/api/v1/projections", tags=["projections"])
app.include_router(expense_categories.router, prefix="/api/v1/expense-categories", tags=["expense-categories"])

@app.get("/")
async def root():
    return {"message": "Cash Flow Management API", "version": "1.0.0"}

@app.get("/health")
async def health_check():
    return {"status": "healthy"}