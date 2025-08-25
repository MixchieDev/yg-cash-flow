# Cash Flow Management System

A comprehensive full-stack cash flow management application built with FastAPI and React, featuring advanced projection capabilities and CSV import/export functionality.

## Architecture

### Backend (FastAPI)
- **Framework**: FastAPI with Pydantic validation
- **Database**: PostgreSQL with SQLAlchemy ORM
- **Authentication**: JWT tokens with OAuth2
- **Features**: REST API, auto-generated docs, type safety

### Frontend (React + TypeScript)
- **Framework**: React 18 with TypeScript
- **Build Tool**: Vite for fast development
- **State Management**: Zustand for global state
- **UI Components**: Tailwind CSS + Headless UI
- **Charts**: Chart.js with react-chartjs-2

## Project Structure

```
cash-flow-app-python/
├── backend/                 # FastAPI backend
│   ├── app/
│   │   ├── api/            # API routes
│   │   ├── core/           # Core configurations
│   │   ├── models/         # SQLAlchemy models
│   │   ├── schemas/        # Pydantic schemas
│   │   ├── services/       # Business logic
│   │   └── main.py         # FastAPI app entry
│   ├── alembic/            # Database migrations
│   ├── requirements.txt    # Python dependencies
│   └── .env               # Environment variables
├── frontend/               # React frontend
│   ├── src/
│   │   ├── components/     # React components
│   │   ├── pages/          # Page components
│   │   ├── stores/         # Zustand stores
│   │   ├── services/       # API services
│   │   └── types/          # TypeScript types
│   ├── public/             # Static assets
│   └── package.json        # Node dependencies
└── docker-compose.yml      # Development environment
```

## Core Features

✅ **Multi-Company Management** - Separate data per company with secure access control
✅ **Customer Management** - Customer database with payment terms and contact info
✅ **Expense Categories** - Standardized expense categorization system
✅ **Recurring Income & Expenses** - Automated recurring transaction patterns
✅ **One-off Items** - Planned future income/expenses with status tracking
✅ **Cash Flow Projections** - Advanced projection engine with multiple view modes
✅ **Interactive Charts** - Real-time line charts and data visualization
✅ **CSV Import/Export** - Bulk import/export for customers and expense categories
✅ **PDF Export** - Export projections with embedded charts
✅ **Advanced Search & Filtering** - Comprehensive search across all modules

## Recent Enhancements

🆕 **Projection System** - Complete rebuild with daily/weekly/monthly/yearly views
🆕 **CSV Templates** - Download sample templates for bulk imports
🆕 **Running Balance** - Real-time balance calculations in projections
🆕 **Status Tracking** - Track progress of planned items (planned → confirmed → completed)
🆕 **Enhanced UI** - Modern, responsive interface with improved UX

## Development Setup

### Prerequisites
- Python 3.11+
- Node.js 18+
- PostgreSQL 15+
- Docker (optional)

### Quick Start

1. **Backend Setup**
```bash
cd backend
python -m venv venv
source venv/bin/activate  # or venv\Scripts\activate on Windows
pip install -r requirements.txt

# Initialize database (for fresh setup)
python init_database.py

# Apply migrations (if needed)
alembic upgrade head

uvicorn app.main:app --reload
```

2. **Frontend Setup**
```bash
cd frontend
npm install
npm run dev
```

3. **Using Docker**
```bash
docker-compose up -d
```

## API Documentation

FastAPI provides automatic API documentation:
- Swagger UI: http://localhost:8000/docs
- ReDoc: http://localhost:8000/redoc

## Deployment

### Railway (Recommended - Free Tier Available)

**Backend Deployment:**
1. Connect your GitHub repo to Railway
2. Add a PostgreSQL service to your project
3. Deploy from the `backend` folder
4. Railway will automatically:
   - Install dependencies from `requirements.txt`
   - Run `init_database.py` to create tables
   - Apply migrations with `alembic upgrade head`  
   - Start the server with `uvicorn`

**Frontend Deployment:**
- Deploy separately from the `frontend` folder
- Set `VITE_API_URL` to your Railway backend URL

**Environment Variables (Auto-configured):**
- `DATABASE_URL` - Automatically provided by Railway PostgreSQL
- `SECRET_KEY` - Set manually in Railway dashboard
- `PORT` - Automatically set by Railway

### Other Platforms

- **Backend**: Docker + PostgreSQL on any cloud provider  
- **Frontend**: Static hosting (Vercel, Netlify) or Docker
- **Database**: Managed PostgreSQL (AWS RDS, Google Cloud SQL)