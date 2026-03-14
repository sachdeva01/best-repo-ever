from fastapi import APIRouter, Depends, BackgroundTasks
from sqlalchemy.orm import Session
from database import get_db
from models import BrokerageAccount, Holding
import yfinance as yf
from datetime import datetime, timedelta
from concurrent.futures import ThreadPoolExecutor
from zoneinfo import ZoneInfo

router = APIRouter()

ET = ZoneInfo("America/New_York")

# TWO-SLEEVE STRATEGY: 80% Income Sleeve + 20% Growth Sleeve
# Target: 4.0% blended yield (minimum needed: 3.79%)
# Reduced JEPI/JEPQ exposure while maintaining income sufficiency
TARGET_ALLOCATION = {
    "Income Sleeve - Premium Income": {
        "percentage": 0.22,  # 22% of portfolio in JEPI/JEPQ (reduced from 33%)
        "sleeve": "income",
        "etfs": [
            {"symbol": "JEPI", "name": "JPMorgan Equity Premium Income ETF", "weight": 0.50},
            {"symbol": "JEPQ", "name": "JPMorgan Nasdaq Equity Premium Income ETF", "weight": 0.50}
        ]
    },
    "Income Sleeve - Dividend Growth": {
        "percentage": 0.38,  # 38% of portfolio in dividend stocks (increased from 32%)
        "sleeve": "income",
        "etfs": [
            {"symbol": "SCHD", "name": "Schwab US Dividend Equity ETF", "weight": 0.57},
            {"symbol": "VYM", "name": "Vanguard High Dividend Yield ETF", "weight": 0.43}
        ]
    },
    "Income Sleeve - Cash/T-Bills": {
        "percentage": 0.20,  # 20% of portfolio in cash/T-bills (increased from 15%)
        "sleeve": "income",
        "etfs": [
            {"symbol": "SGOV", "name": "iShares 0-3 Month Treasury Bond ETF", "weight": 1.0}
        ]
    },
    "Growth Sleeve": {
        "percentage": 0.20,  # 20% of portfolio in growth (0.75% yield, 8%+ growth target)
        "sleeve": "growth",
        "etfs": [
            {"symbol": "QQQ", "name": "Invesco QQQ Trust (Nasdaq-100)", "weight": 0.35},
            {"symbol": "VUG", "name": "Vanguard Growth ETF", "weight": 0.30},
            {"symbol": "VOOG", "name": "Vanguard S&P 500 Growth ETF", "weight": 0.20},
            {"symbol": "SCHG", "name": "Schwab US Large-Cap Growth ETF", "weight": 0.15}
        ]
    }
}

# Static fallback yields (used until live yields are fetched)
STATIC_YIELDS = {
    "JEPI": 7.2, "JEPQ": 9.0,
    "SCHD": 3.9, "VYM": 3.0,
    "SGOV": 3.5,
    "QQQ": 0.6, "VUG": 0.7, "VOOG": 1.3, "SCHG": 0.5,
}

# Static fallback prices (used on first load before background fetch completes)
STATIC_PRICES = {
    "JEPI": 59.0, "JEPQ": 55.0, "SCHD": 28.0,
    "VYM": 125.0, "SGOV": 100.5, "QQQ": 490.0,
    "VUG": 360.0, "VOOG": 310.0, "SCHG": 105.0,
}

# Yield cache (unchanged — 24h TTL)
_yield_cache: dict = {}
_YIELD_CACHE_TTL = 86400

# Price cache — keyed by market slot, refreshed at most twice per day
from typing import Optional

_price_cache: dict = {}
_price_slot: Optional[str] = None
_prices_last_fetched: Optional[datetime] = None


def _current_slot() -> str:
    """
    Returns a string identifying the current market-data slot:
      YYYY-MM-DD-am  — after 9:30 AM ET (morning prices)
      YYYY-MM-DD-pm  — after 4:00 PM ET (closing prices)
    Before 9:30 AM ET we use the previous day's pm slot so we
    never trigger a fetch outside market hours.
    """
    now = datetime.now(ET)
    date_str = now.strftime("%Y-%m-%d")
    if now.hour < 9 or (now.hour == 9 and now.minute < 30):
        yesterday = (now - timedelta(days=1)).strftime("%Y-%m-%d")
        return f"{yesterday}-pm"
    elif now.hour < 16:
        return f"{date_str}-am"
    else:
        return f"{date_str}-pm"


def _needs_price_refresh() -> bool:
    return _current_slot() != _price_slot


def _fetch_price_single(symbol: str) -> tuple:
    try:
        info = yf.Ticker(symbol).info
        price = info.get("regularMarketPrice") or info.get("currentPrice")
        return symbol, float(price) if price else STATIC_PRICES.get(symbol, 100.0)
    except Exception:
        return symbol, STATIC_PRICES.get(symbol, 100.0)


def _refresh_prices_background() -> None:
    """Fetch all ETF prices in parallel and update the cache. Runs as a background task."""
    global _price_cache, _price_slot, _prices_last_fetched
    all_symbols = [
        etf["symbol"]
        for details in TARGET_ALLOCATION.values()
        for etf in details["etfs"]
    ]
    slot = _current_slot()
    with ThreadPoolExecutor(max_workers=len(all_symbols)) as executor:
        results = dict(executor.map(_fetch_price_single, all_symbols))
    _price_cache.update(results)
    _price_slot = slot
    _prices_last_fetched = datetime.now(ET)
    print(f"[prices] refreshed for slot {slot}: {results}")


def get_current_yield(symbol: str) -> float:
    import time
    now = time.time()
    cached = _yield_cache.get(symbol)
    if cached and now - cached["timestamp"] < _YIELD_CACHE_TTL:
        return cached["yield"]
    static_yield = STATIC_YIELDS.get(symbol, 3.0)
    _yield_cache[symbol] = {"yield": static_yield, "timestamp": now}
    return static_yield


def get_current_price(symbol: str) -> float:
    """Return cached price immediately (lazy — background task keeps it fresh)."""
    return _price_cache.get(symbol) or STATIC_PRICES.get(symbol, 100.0)


@router.get("/portfolio-allocation/calculate")
async def calculate_portfolio_allocation(
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
):
    """
    Returns allocation instantly using cached prices.
    If the market-data slot has changed (i.e. it's a new AM or PM window),
    a background task refreshes all prices in parallel via ThreadPoolExecutor
    so the next request gets updated values.
    """
    from models import RetirementConfig, Expense

    # Trigger background price refresh if slot has changed (at most twice per day)
    if _needs_price_refresh():
        background_tasks.add_task(_refresh_prices_background)

    # Get total portfolio value from all accounts EXCEPT "Recommended Portfolio"
    accounts = db.query(BrokerageAccount).filter(
        BrokerageAccount.name != "Recommended Portfolio"
    ).all()
    total_portfolio_value = sum(acc.current_balance for acc in accounts)

    # Get tax rates from config
    config = db.query(RetirementConfig).first()
    qualified_div_tax_rate = config.qualified_dividend_tax_rate if config else 0.15
    ordinary_income_tax_rate = config.ordinary_income_tax_rate if config else 0.30

    # Calculate current annual expenses from actual expense records
    expenses = db.query(Expense).all()
    annual_expenses = 0.0
    for expense in expenses:
        if expense.is_recurring:
            if expense.recurrence_period == "MONTHLY":
                annual_expenses += expense.amount * 12
            elif expense.recurrence_period == "QUARTERLY":
                annual_expenses += expense.amount * 4
            elif expense.recurrence_period == "YEARLY":
                annual_expenses += expense.amount
            elif expense.recurrence_period == "MULTI_YEAR" and expense.recurrence_interval_years:
                annual_expenses += expense.amount / expense.recurrence_interval_years

    # Define tax treatment for each category
    tax_treatment = {
        "Income Sleeve - Premium Income": "ordinary",  # JEPI/JEPQ mostly ordinary
        "Income Sleeve - Dividend Growth": "qualified",  # SCHD/VYM qualified dividends
        "Income Sleeve - Cash/T-Bills": "ordinary",  # Interest income
        "Growth Sleeve": "qualified"  # Minimal qualified dividends
    }

    allocation_details = {}
    total_annual_income = 0.0
    total_after_tax_income = 0.0
    category_yields = {}

    # Track sleeve totals
    income_sleeve_value = 0.0
    income_sleeve_income = 0.0
    income_sleeve_after_tax = 0.0
    growth_sleeve_value = 0.0
    growth_sleeve_income = 0.0
    growth_sleeve_after_tax = 0.0

    for category, details in TARGET_ALLOCATION.items():
        category_percentage = details["percentage"]
        category_value = total_portfolio_value * category_percentage
        sleeve_type = details.get("sleeve", "income")

        etf_details = []
        category_total_income = 0.0
        category_after_tax_income = 0.0

        # Determine tax rate for this category
        is_qualified = tax_treatment.get(category, "ordinary") == "qualified"
        tax_rate = qualified_div_tax_rate if is_qualified else ordinary_income_tax_rate

        for etf in details["etfs"]:
            symbol = etf["symbol"]
            weight = etf["weight"]

            # Get current yield and price
            current_yield = get_current_yield(symbol)
            current_price = get_current_price(symbol)

            # Calculate allocation for this ETF
            etf_value = category_value * weight
            etf_quantity = etf_value / current_price if current_price > 0 else 0
            etf_annual_income = etf_value * (current_yield / 100)
            etf_after_tax_income = etf_annual_income * (1 - tax_rate)

            category_total_income += etf_annual_income
            category_after_tax_income += etf_after_tax_income

            etf_details.append({
                "symbol": symbol,
                "name": etf["name"],
                "weight_in_category": weight,
                "allocation_value": round(etf_value, 2),
                "current_price": round(current_price, 2),
                "quantity": round(etf_quantity, 2),
                "current_yield": round(current_yield, 2),
                "annual_income": round(etf_annual_income, 2),
                "after_tax_income": round(etf_after_tax_income, 2),
                "tax_rate": round(tax_rate * 100, 1)
            })

        # Calculate weighted average yield for category
        category_yield = (category_total_income / category_value * 100) if category_value > 0 else 0
        category_yields[category] = round(category_yield, 2)

        total_annual_income += category_total_income
        total_after_tax_income += category_after_tax_income

        # Track sleeve totals
        if sleeve_type == "income":
            income_sleeve_value += category_value
            income_sleeve_income += category_total_income
            income_sleeve_after_tax += category_after_tax_income
        else:
            growth_sleeve_value += category_value
            growth_sleeve_income += category_total_income
            growth_sleeve_after_tax += category_after_tax_income

        allocation_details[category] = {
            "target_percentage": category_percentage * 100,
            "target_value": round(category_value, 2),
            "category_yield": round(category_yield, 2),
            "annual_income": round(category_total_income, 2),
            "after_tax_income": round(category_after_tax_income, 2),
            "tax_treatment": tax_treatment.get(category, "ordinary"),
            "tax_rate": round(tax_rate * 100, 1),
            "sleeve": sleeve_type,
            "etfs": etf_details
        }

    # Calculate overall portfolio yield
    portfolio_yield = (total_annual_income / total_portfolio_value * 100) if total_portfolio_value > 0 else 0
    after_tax_yield = (total_after_tax_income / total_portfolio_value * 100) if total_portfolio_value > 0 else 0

    # Calculate income vs expense comparison
    after_tax_surplus = total_after_tax_income - annual_expenses
    coverage_ratio = (total_after_tax_income / annual_expenses * 100) if annual_expenses > 0 else 0

    return {
        "total_portfolio_value": round(total_portfolio_value, 2),
        "total_annual_income": round(total_annual_income, 2),
        "total_after_tax_income": round(total_after_tax_income, 2),
        "portfolio_yield": round(portfolio_yield, 2),
        "after_tax_yield": round(after_tax_yield, 2),
        "allocation": allocation_details,
        "category_yields": category_yields,
        "tax_rates": {
            "qualified_dividend": round(qualified_div_tax_rate * 100, 1),
            "ordinary_income": round(ordinary_income_tax_rate * 100, 1)
        },
        "sleeve_summary": {
            "income_sleeve": {
                "value": round(income_sleeve_value, 2),
                "percentage": round(income_sleeve_value / total_portfolio_value * 100, 1) if total_portfolio_value > 0 else 0,
                "annual_income": round(income_sleeve_income, 2),
                "after_tax_income": round(income_sleeve_after_tax, 2),
                "yield": round(income_sleeve_income / income_sleeve_value * 100, 2) if income_sleeve_value > 0 else 0
            },
            "growth_sleeve": {
                "value": round(growth_sleeve_value, 2),
                "percentage": round(growth_sleeve_value / total_portfolio_value * 100, 1) if total_portfolio_value > 0 else 0,
                "annual_income": round(growth_sleeve_income, 2),
                "after_tax_income": round(growth_sleeve_after_tax, 2),
                "yield": round(growth_sleeve_income / growth_sleeve_value * 100, 2) if growth_sleeve_value > 0 else 0
            }
        },
        "expense_analysis": {
            "annual_expenses": round(annual_expenses, 2),
            "after_tax_income": round(total_after_tax_income, 2),
            "after_tax_surplus": round(after_tax_surplus, 2),
            "coverage_ratio": round(coverage_ratio, 1),
            "income_sufficient": after_tax_surplus >= 0
        },
        "prices_last_updated": _prices_last_fetched.isoformat() if _prices_last_fetched else None,
        "prices_slot": _price_slot,
        "prices_source": "live" if _prices_last_fetched else "static_fallback",
    }


@router.post("/portfolio-allocation/implement")
async def implement_portfolio_allocation(db: Session = Depends(get_db)):
    """
    Implement the recommended portfolio allocation by creating actual holdings.
    This will clear existing holdings and create new ones based on recommendations.
    """

    # Get or create a default account for the allocation
    account = db.query(BrokerageAccount).filter(
        BrokerageAccount.name == "Recommended Portfolio"
    ).first()

    if not account:
        # Create a new account for the recommended allocation
        account = BrokerageAccount(
            name="Recommended Portfolio",
            brokerage_name="FIDELITY",
            account_type="TAXABLE",
            current_balance=0.0,
            dividend_yield=0.0
        )
        db.add(account)
        db.commit()
        db.refresh(account)

    # Delete existing holdings in this account
    db.query(Holding).filter(Holding.account_id == account.id).delete()
    db.commit()

    # Get total portfolio value from all accounts EXCEPT the "Recommended Portfolio" account
    # This prevents double-counting when re-implementing the allocation
    all_accounts = db.query(BrokerageAccount).filter(
        BrokerageAccount.name != "Recommended Portfolio"
    ).all()
    total_portfolio_value = sum(acc.current_balance for acc in all_accounts)

    # Create holdings based on allocation
    holdings_created = []
    total_value = 0.0
    total_annual_income = 0.0

    for category, details in TARGET_ALLOCATION.items():
        category_percentage = details["percentage"]
        category_value = total_portfolio_value * category_percentage

        for etf in details["etfs"]:
            symbol = etf["symbol"]
            name = etf["name"]
            weight = etf["weight"]

            # Get current data
            current_yield = get_current_yield(symbol)
            current_price = get_current_price(symbol)

            if current_price == 0:
                continue

            # Calculate position
            etf_value = category_value * weight
            etf_quantity = etf_value / current_price
            etf_annual_income = etf_value * (current_yield / 100)

            # Map category to asset type
            asset_type_map = {
                "Dividend Growth Stocks": "STOCK",
                "High-Yield Bonds": "ETF",
                "REITs": "ETF",
                "Treasury/TIPS": "BOND",
                "Preferred Stock": "STOCK",
                "Cash/Money Market": "CASH",
                "Growth Equities": "ETF"
            }

            # Create holding
            holding = Holding(
                account_id=account.id,
                symbol=symbol,
                name=name,
                asset_type=asset_type_map.get(category, "ETF"),
                quantity=etf_quantity,
                price_per_share=current_price,
                dividend_yield=current_yield,
                last_updated=datetime.utcnow()
            )
            db.add(holding)

            total_value += etf_value
            total_annual_income += etf_annual_income

            holdings_created.append({
                "symbol": symbol,
                "name": name,
                "quantity": round(etf_quantity, 2),
                "price": round(current_price, 2),
                "value": round(etf_value, 2),
                "yield": round(current_yield, 2),
                "annual_income": round(etf_annual_income, 2)
            })

    # Update account balance and dividend yield
    account.current_balance = total_value
    account.dividend_yield = (total_annual_income / total_value * 100) if total_value > 0 else 0

    db.commit()

    return {
        "success": True,
        "account_name": account.name,
        "account_id": account.id,
        "total_value": round(total_value, 2),
        "total_annual_income": round(total_annual_income, 2),
        "portfolio_yield": round(account.dividend_yield, 2),
        "holdings_created": len(holdings_created),
        "holdings": holdings_created
    }


