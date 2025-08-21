from typing import List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.auth import get_current_active_user
from app.schemas.company import Company, CompanyCreate, CompanyUpdate
from app.models.user import User
from app.models.company import Company as CompanyModel

router = APIRouter()

@router.post("/", response_model=Company)
def create_company(
    company: CompanyCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    db_company = CompanyModel(**company.dict(), owner_id=current_user.id)
    db.add(db_company)
    db.commit()
    db.refresh(db_company)
    return db_company

@router.get("/", response_model=List[Company])
def read_companies(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    companies = db.query(CompanyModel).filter(CompanyModel.owner_id == current_user.id).offset(skip).limit(limit).all()
    return companies

@router.get("/{company_id}", response_model=Company)
def read_company(
    company_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    company = db.query(CompanyModel).filter(
        CompanyModel.id == company_id,
        CompanyModel.owner_id == current_user.id
    ).first()
    if company is None:
        raise HTTPException(status_code=404, detail="Company not found")
    return company

@router.put("/{company_id}", response_model=Company)
def update_company(
    company_id: int,
    company_update: CompanyUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    company = db.query(CompanyModel).filter(
        CompanyModel.id == company_id,
        CompanyModel.owner_id == current_user.id
    ).first()
    if company is None:
        raise HTTPException(status_code=404, detail="Company not found")
    
    update_data = company_update.dict(exclude_unset=True)
    for field, value in update_data.items():
        setattr(company, field, value)
    
    db.commit()
    db.refresh(company)
    return company

@router.delete("/{company_id}")
def delete_company(
    company_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    company = db.query(CompanyModel).filter(
        CompanyModel.id == company_id,
        CompanyModel.owner_id == current_user.id
    ).first()
    if company is None:
        raise HTTPException(status_code=404, detail="Company not found")
    
    db.delete(company)
    db.commit()
    return {"message": "Company deleted successfully"}