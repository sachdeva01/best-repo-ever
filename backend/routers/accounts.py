from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from database import get_db
from models import BrokerageAccount, Holding, AccountSnapshot
from schemas import (
    AccountCreate, AccountUpdate, AccountResponse,
    SnapshotCreate, SnapshotResponse
)

router = APIRouter()


@router.post("/accounts", response_model=AccountResponse)
async def create_account(account: AccountCreate, db: Session = Depends(get_db)):
    """Create a new brokerage account"""
    db_account = BrokerageAccount(
        name=account.name,
        brokerage_name=account.brokerage_name,
        account_type=account.account_type,
        current_balance=account.current_balance,
        dividend_yield=account.dividend_yield
    )
    db.add(db_account)
    db.commit()
    db.refresh(db_account)
    return db_account


@router.get("/accounts", response_model=List[AccountResponse])
async def get_accounts(db: Session = Depends(get_db)):
    """Get all brokerage accounts"""
    accounts = db.query(BrokerageAccount).all()
    return accounts


@router.get("/accounts/{account_id}", response_model=AccountResponse)
async def get_account(account_id: int, db: Session = Depends(get_db)):
    """Get a specific account by ID"""
    account = db.query(BrokerageAccount).filter(BrokerageAccount.id == account_id).first()
    if not account:
        raise HTTPException(status_code=404, detail="Account not found")
    return account


@router.put("/accounts/{account_id}", response_model=AccountResponse)
async def update_account(
    account_id: int,
    account_update: AccountUpdate,
    db: Session = Depends(get_db)
):
    """Update an existing account"""
    account = db.query(BrokerageAccount).filter(BrokerageAccount.id == account_id).first()
    if not account:
        raise HTTPException(status_code=404, detail="Account not found")

    # Update only provided fields
    if account_update.name is not None:
        account.name = account_update.name
    if account_update.current_balance is not None:
        account.current_balance = account_update.current_balance
    if account_update.dividend_yield is not None:
        account.dividend_yield = account_update.dividend_yield

    db.commit()
    db.refresh(account)
    return account


@router.delete("/accounts/{account_id}")
async def delete_account(account_id: int, db: Session = Depends(get_db)):
    """Delete an account (cascade deletes holdings and snapshots)"""
    account = db.query(BrokerageAccount).filter(BrokerageAccount.id == account_id).first()
    if not account:
        raise HTTPException(status_code=404, detail="Account not found")

    db.delete(account)
    db.commit()
    return {"message": "Account deleted successfully"}


@router.get("/accounts/{account_id}/history", response_model=List[SnapshotResponse])
async def get_account_history(account_id: int, db: Session = Depends(get_db)):
    """Get historical snapshots for an account"""
    # Verify account exists
    account = db.query(BrokerageAccount).filter(BrokerageAccount.id == account_id).first()
    if not account:
        raise HTTPException(status_code=404, detail="Account not found")

    snapshots = db.query(AccountSnapshot).filter(
        AccountSnapshot.account_id == account_id
    ).order_by(AccountSnapshot.snapshot_date.desc()).all()

    return snapshots


@router.post("/accounts/{account_id}/snapshot", response_model=SnapshotResponse)
async def create_snapshot(
    account_id: int,
    snapshot: SnapshotCreate,
    db: Session = Depends(get_db)
):
    """Create a balance snapshot for an account"""
    # Verify account exists
    account = db.query(BrokerageAccount).filter(BrokerageAccount.id == account_id).first()
    if not account:
        raise HTTPException(status_code=404, detail="Account not found")

    db_snapshot = AccountSnapshot(
        account_id=account_id,
        balance=snapshot.balance,
        snapshot_date=snapshot.snapshot_date,
        notes=snapshot.notes
    )
    db.add(db_snapshot)
    db.commit()
    db.refresh(db_snapshot)
    return db_snapshot
