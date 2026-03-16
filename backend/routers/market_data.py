import logging
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from datetime import datetime, timedelta
from database import get_db
from models import MarketData
from schemas import MarketDataResponse, AllMarketDataResponse
import yfinance as yf
import asyncio
from concurrent.futures import ThreadPoolExecutor

logger = logging.getLogger(__name__)

router = APIRouter()

# Cache duration in minutes — 60 min is sufficient for market indices
CACHE_DURATION = 60

_executor = ThreadPoolExecutor(max_workers=3)


def should_refresh_data(last_updated: datetime) -> bool:
    """Check if data needs refresh (older than 15 minutes)"""
    if not last_updated:
        return True
    return datetime.utcnow() - last_updated > timedelta(minutes=CACHE_DURATION)


def fetch_external_market_data(data_type: str) -> float:
    """
    Fetch live market data from Yahoo Finance.

    Tickers:
    - ^TNX: 10-Year Treasury Yield
    - ^GSPC: S&P 500 Index
    - ^IXIC: Nasdaq Composite
    """
    try:
        ticker_map = {
            "10-Year Treasury": "^TNX",
            "S&P 500": "^GSPC",
            "Nasdaq": "^IXIC"
        }

        ticker_symbol = ticker_map.get(data_type)
        if not ticker_symbol:
            return 0.0

        # Fetch current price
        ticker = yf.Ticker(ticker_symbol)
        data = ticker.history(period="1d")

        if data.empty:
            # Fallback to fast_info — must use attribute access, not .get()
            # (.get() on LazyLoadingDict silently returns the default without fetching)
            info = ticker.fast_info
            try:
                last_price = info.last_price
                if last_price and last_price > 0:
                    return round(float(last_price), 2)
            except Exception:
                pass
            # Both history and fast_info failed — log and fall through to hardcoded fallbacks
            logger.warning("Empty history and no fast_info price for %s — using fallback", data_type)

        # Get the most recent close price
        latest_price = data['Close'].iloc[-1]

        return round(float(latest_price), 2)

    except Exception as e:
        logger.error("Error fetching market data for %s: %s", data_type, e)
        # Return fallback values if API fails
        fallback_data = {
            "10-Year Treasury": 4.25,
            "S&P 500": 5200.0,
            "Nasdaq": 16500.0
        }
        return fallback_data.get(data_type, 0.0)


@router.get("/market-data", response_model=AllMarketDataResponse)
async def get_all_market_data(db: Session = Depends(get_db)):
    """Get all current market indicators, fetching stale tickers in parallel."""
    data_types = ["10-Year Treasury", "S&P 500", "Nasdaq"]
    key_map = {"10-Year Treasury": "treasury_10y", "S&P 500": "sp500", "Nasdaq": "nasdaq"}

    # Identify which tickers need a refresh
    rows = {
        dt: db.query(MarketData).filter(MarketData.data_type == dt).first()
        for dt in data_types
    }
    stale = [dt for dt, row in rows.items() if not row or should_refresh_data(row.last_updated)]

    if stale:
        # Fetch all stale tickers in parallel
        loop = asyncio.get_event_loop()
        new_values = await asyncio.gather(
            *[loop.run_in_executor(_executor, fetch_external_market_data, dt) for dt in stale]
        )

        # Single batch commit
        for dt, value in zip(stale, new_values):
            if rows[dt]:
                rows[dt].value = value
                rows[dt].last_updated = datetime.utcnow()
            else:
                rows[dt] = MarketData(data_type=dt, value=value)
                db.add(rows[dt])
        db.commit()
        for dt in stale:
            db.refresh(rows[dt])

    return {key_map[dt]: rows[dt] for dt in data_types}


@router.get("/market-data/treasury-10y", response_model=MarketDataResponse)
async def get_treasury_yield(db: Session = Depends(get_db)):
    """Get 10-year Treasury yield"""
    market_data = db.query(MarketData).filter(
        MarketData.data_type == "10-Year Treasury"
    ).first()

    if not market_data or should_refresh_data(market_data.last_updated):
        new_value = fetch_external_market_data("10-Year Treasury")

        if market_data:
            market_data.value = new_value
            market_data.last_updated = datetime.utcnow()
        else:
            market_data = MarketData(
                data_type="10-Year Treasury",
                value=new_value
            )
            db.add(market_data)

        db.commit()
        db.refresh(market_data)

    return market_data


@router.get("/market-data/sp500", response_model=MarketDataResponse)
async def get_sp500(db: Session = Depends(get_db)):
    """Get S&P 500 index"""
    market_data = db.query(MarketData).filter(
        MarketData.data_type == "S&P 500"
    ).first()

    if not market_data or should_refresh_data(market_data.last_updated):
        new_value = fetch_external_market_data("S&P 500")

        if market_data:
            market_data.value = new_value
            market_data.last_updated = datetime.utcnow()
        else:
            market_data = MarketData(
                data_type="S&P 500",
                value=new_value
            )
            db.add(market_data)

        db.commit()
        db.refresh(market_data)

    return market_data


@router.get("/market-data/nasdaq", response_model=MarketDataResponse)
async def get_nasdaq(db: Session = Depends(get_db)):
    """Get Nasdaq index"""
    market_data = db.query(MarketData).filter(
        MarketData.data_type == "Nasdaq"
    ).first()

    if not market_data or should_refresh_data(market_data.last_updated):
        new_value = fetch_external_market_data("Nasdaq")

        if market_data:
            market_data.value = new_value
            market_data.last_updated = datetime.utcnow()
        else:
            market_data = MarketData(
                data_type="Nasdaq",
                value=new_value
            )
            db.add(market_data)

        db.commit()
        db.refresh(market_data)

    return market_data


@router.post("/market-data/refresh")
async def refresh_market_data(db: Session = Depends(get_db)):
    """Force refresh all market data"""
    data_types = ["10-Year Treasury", "S&P 500", "Nasdaq"]
    refreshed = []

    for data_type in data_types:
        new_value = fetch_external_market_data(data_type)

        market_data = db.query(MarketData).filter(
            MarketData.data_type == data_type
        ).first()

        if market_data:
            market_data.value = new_value
            market_data.last_updated = datetime.utcnow()
        else:
            market_data = MarketData(
                data_type=data_type,
                value=new_value
            )
            db.add(market_data)

        db.commit()
        db.refresh(market_data)
        refreshed.append({
            "data_type": data_type,
            "value": new_value,
            "last_updated": market_data.last_updated
        })

    return {
        "message": "Market data refreshed successfully",
        "data": refreshed
    }
