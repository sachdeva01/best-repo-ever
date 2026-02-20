from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from datetime import datetime, timedelta
from database import get_db
from models import MarketData
from schemas import MarketDataResponse, AllMarketDataResponse
import yfinance as yf

router = APIRouter()

# Cache duration in minutes
CACHE_DURATION = 15


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
            # Fallback to fast_info if history is empty
            info = ticker.fast_info
            if data_type == "10-Year Treasury":
                return round(info.get('last_price', 0.0), 2)
            return round(info.get('last_price', 0.0), 2)

        # Get the most recent close price
        latest_price = data['Close'].iloc[-1]

        return round(float(latest_price), 2)

    except Exception as e:
        print(f"Error fetching market data for {data_type}: {e}")
        # Return fallback values if API fails
        fallback_data = {
            "10-Year Treasury": 4.25,
            "S&P 500": 5200.0,
            "Nasdaq": 16500.0
        }
        return fallback_data.get(data_type, 0.0)


@router.get("/market-data", response_model=AllMarketDataResponse)
async def get_all_market_data(db: Session = Depends(get_db)):
    """Get all current market indicators"""
    data_types = ["10-Year Treasury", "S&P 500", "Nasdaq"]
    result = {}

    for data_type in data_types:
        # Get from database
        market_data = db.query(MarketData).filter(
            MarketData.data_type == data_type
        ).first()

        # Check if needs refresh
        if not market_data or should_refresh_data(market_data.last_updated):
            # Fetch new data
            new_value = fetch_external_market_data(data_type)

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

        # Map to response keys
        key_map = {
            "10-Year Treasury": "treasury_10y",
            "S&P 500": "sp500",
            "Nasdaq": "nasdaq"
        }
        result[key_map[data_type]] = market_data

    return result


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
