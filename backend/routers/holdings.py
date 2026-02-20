from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from database import get_db
from models import Holding, BrokerageAccount
from schemas import HoldingCreate, HoldingUpdate, HoldingResponse

router = APIRouter()


@router.post("/holdings", response_model=HoldingResponse)
async def create_holding(holding: HoldingCreate, db: Session = Depends(get_db)):
    """Create a new holding"""
    # Verify account exists
    account = db.query(BrokerageAccount).filter(
        BrokerageAccount.id == holding.account_id
    ).first()
    if not account:
        raise HTTPException(status_code=404, detail="Account not found")

    db_holding = Holding(
        account_id=holding.account_id,
        symbol=holding.symbol,
        name=holding.name,
        asset_type=holding.asset_type,
        quantity=holding.quantity,
        price_per_share=holding.price_per_share,
        dividend_yield=holding.dividend_yield
    )
    db.add(db_holding)
    db.commit()
    db.refresh(db_holding)
    return db_holding


@router.get("/holdings", response_model=List[HoldingResponse])
async def get_holdings(account_id: int = None, db: Session = Depends(get_db)):
    """Get all holdings, optionally filtered by account_id"""
    query = db.query(Holding)
    if account_id:
        query = query.filter(Holding.account_id == account_id)
    holdings = query.all()
    return holdings


@router.get("/holdings/{holding_id}", response_model=HoldingResponse)
async def get_holding(holding_id: int, db: Session = Depends(get_db)):
    """Get a specific holding by ID"""
    holding = db.query(Holding).filter(Holding.id == holding_id).first()
    if not holding:
        raise HTTPException(status_code=404, detail="Holding not found")
    return holding


@router.put("/holdings/{holding_id}", response_model=HoldingResponse)
async def update_holding(
    holding_id: int,
    holding_update: HoldingUpdate,
    db: Session = Depends(get_db)
):
    """Update an existing holding"""
    holding = db.query(Holding).filter(Holding.id == holding_id).first()
    if not holding:
        raise HTTPException(status_code=404, detail="Holding not found")

    # Update only provided fields
    if holding_update.quantity is not None:
        holding.quantity = holding_update.quantity
    if holding_update.price_per_share is not None:
        holding.price_per_share = holding_update.price_per_share
    if holding_update.dividend_yield is not None:
        holding.dividend_yield = holding_update.dividend_yield

    db.commit()
    db.refresh(holding)
    return holding


@router.delete("/holdings/{holding_id}")
async def delete_holding(holding_id: int, db: Session = Depends(get_db)):
    """Delete a holding"""
    holding = db.query(Holding).filter(Holding.id == holding_id).first()
    if not holding:
        raise HTTPException(status_code=404, detail="Holding not found")

    db.delete(holding)
    db.commit()
    return {"message": "Holding deleted successfully"}
