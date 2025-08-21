from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional

from app.core.database import get_db
from app.core.auth import get_current_active_user
from app.models.user import User
from app.models.one_off_item import OneOffItem
from app.schemas.one_off_item import OneOffItemCreate, OneOffItemUpdate, OneOffItem as OneOffItemSchema

router = APIRouter()

@router.get("/company/{company_id}", response_model=List[OneOffItemSchema])
def get_one_off_items_by_company(
    company_id: int,
    item_type: Optional[str] = None,  # Filter by income/expense
    status: Optional[str] = None,     # Filter by planned/confirmed/completed/cancelled
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Get all one-off items for a company"""
    query = db.query(OneOffItem).filter(OneOffItem.company_id == company_id)
    
    if item_type:
        query = query.filter(OneOffItem.item_type == item_type)
    
    if status:
        query = query.filter(OneOffItem.is_confirmed == status)
    
    items = query.order_by(OneOffItem.planned_date).all()
    return items

@router.get("/{item_id}", response_model=OneOffItemSchema)
def get_one_off_item(
    item_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Get a specific one-off item"""
    item = db.query(OneOffItem).filter(OneOffItem.id == item_id).first()
    if not item:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="One-off item not found"
        )
    return item

@router.post("/", response_model=OneOffItemSchema)
def create_one_off_item(
    item: OneOffItemCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Create a new one-off item"""
    import logging
    logger = logging.getLogger(__name__)
    
    try:
        logger.info(f"Received one-off item data: {item.dict()}")
        
        item_data = item.dict()
        db_item = OneOffItem(**item_data)
        
        db.add(db_item)
        db.commit()
        db.refresh(db_item)
        
        logger.info(f"Successfully created one-off item with ID: {db_item.id}")
        return db_item
        
    except Exception as e:
        logger.error(f"Error creating one-off item: {str(e)}")
        logger.error(f"Exception type: {type(e).__name__}")
        db.rollback()
        
        if hasattr(e, 'orig') and hasattr(e.orig, 'diag'):
            detail = f"Database error: {e.orig.diag.message_primary}"
        else:
            detail = f"Validation error: {str(e)}"
            
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=detail
        )

@router.put("/{item_id}", response_model=OneOffItemSchema)
def update_one_off_item(
    item_id: int,
    item_update: OneOffItemUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Update a one-off item"""
    db_item = db.query(OneOffItem).filter(OneOffItem.id == item_id).first()
    if not db_item:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="One-off item not found"
        )
    
    update_data = item_update.dict(exclude_unset=True)
    for field, value in update_data.items():
        setattr(db_item, field, value)
    
    db.commit()
    db.refresh(db_item)
    return db_item

@router.delete("/{item_id}")
def delete_one_off_item(
    item_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Delete a one-off item"""
    db_item = db.query(OneOffItem).filter(OneOffItem.id == item_id).first()
    if not db_item:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="One-off item not found"
        )
    
    db.delete(db_item)
    db.commit()
    return {"detail": "One-off item deleted successfully"}

from pydantic import BaseModel

class StatusUpdate(BaseModel):
    new_status: str

@router.put("/{item_id}/status", response_model=OneOffItemSchema)
def update_item_status(
    item_id: int,
    status_update: StatusUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Update the status of a one-off item (planned, confirmed, completed, cancelled)"""
    valid_statuses = ["planned", "confirmed", "completed", "cancelled"]
    if status_update.new_status not in valid_statuses:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid status. Must be one of: {', '.join(valid_statuses)}"
        )
    
    db_item = db.query(OneOffItem).filter(OneOffItem.id == item_id).first()
    if not db_item:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="One-off item not found"
        )
    
    db_item.is_confirmed = status_update.new_status
    db.commit()
    db.refresh(db_item)
    return db_item