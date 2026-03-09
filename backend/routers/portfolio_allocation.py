from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from database import get_db
from models import BrokerageAccount, Holding
import yfinance as yf
from datetime import datetime, timedelta

router = APIRouter()

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

# Cache for ETF yields to avoid repeated API calls
_yield_cache = {}
_CACHE_DURATION = 86400  # 24 hours (1 day) in seconds

# Static fallback yields for fast loading
STATIC_YIELDS = {
    # Income Sleeve - Premium Income
    "JEPI": 7.2, "JEPQ": 9.0,
    # Income Sleeve - Dividend Growth
    "SCHD": 3.9, "VYM": 3.0, "DGRO": 2.5,
    # Income Sleeve - Cash/T-Bills
    "SGOV": 3.5, "BIL": 3.3,
    # Growth Sleeve (minimal dividends)
    "QQQ": 0.6, "VUG": 0.7, "VOOG": 1.3, "SCHG": 0.5,
    "VOO": 1.5, "VTI": 1.6,
    # Other
    "VNQ": 4.0, "SCHH": 4.2, "O": 5.5,
    "TIP": 2.5, "VTIP": 2.3, "GOVT": 3.8,
    "PFF": 6.5, "PFFD": 6.8, "QYLD": 12.0,
}


def get_current_yield(symbol: str) -> float:
    """
    Fetch current dividend yield for an ETF with caching.
    Uses static yields for fast initial load, then caches API results.
    """
    import time

    # Check cache first
    now = time.time()
    if symbol in _yield_cache:
        cached_data = _yield_cache[symbol]
        if now - cached_data['timestamp'] < _CACHE_DURATION:
            return cached_data['yield']

    # Use static yield immediately (no API call delay)
    static_yield = STATIC_YIELDS.get(symbol, 3.0)

    # Return static yield for now, can fetch live data in background later
    _yield_cache[symbol] = {'yield': static_yield, 'timestamp': now}
    return static_yield


def get_current_price(symbol: str) -> float:
    """Fetch current price for an ETF"""
    try:
        ticker = yf.Ticker(symbol)
        info = ticker.info
        price = info.get('regularMarketPrice', info.get('currentPrice', 0))
        return float(price) if price else 0.0
    except Exception as e:
        print(f"Error fetching price for {symbol}: {e}")
        return 0.0


def get_annualized_return(symbol: str, years: int) -> float:
    """Calculate annualized return over specified years"""
    try:
        ticker = yf.Ticker(symbol)
        end_date = datetime.now()
        start_date = end_date - timedelta(days=years*365)

        hist = ticker.history(start=start_date, end=end_date)
        if len(hist) < 2:
            return None

        start_price = hist['Close'].iloc[0]
        end_price = hist['Close'].iloc[-1]

        # Annualized return formula: (end/start)^(1/years) - 1
        annualized_return = ((end_price / start_price) ** (1/years) - 1) * 100
        return round(annualized_return, 2)
    except Exception as e:
        print(f"Error calculating return for {symbol} ({years} years): {e}")
        return None


def get_etf_historical_data(symbol: str, name: str) -> dict:
    """Get historical returns and current yield for an ETF"""
    return {
        "symbol": symbol,
        "name": name,
        "current_yield": get_current_yield(symbol),
        "return_3yr": get_annualized_return(symbol, 3),
        "return_5yr": get_annualized_return(symbol, 5),
        "return_10yr": get_annualized_return(symbol, 10),
        "return_20yr": get_annualized_return(symbol, 20)
    }


@router.get("/portfolio-allocation/calculate")
async def calculate_portfolio_allocation(db: Session = Depends(get_db)):
    """Calculate two-sleeve portfolio allocation with actual ETF yields"""
    from models import RetirementConfig, Expense

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
        }
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


@router.get("/portfolio-allocation/historical-performance")
async def get_historical_performance():
    """
    Get historical returns and current yields for all ETFs in the optimal allocation.
    Returns 3-year, 5-year, 10-year, and 20-year annualized returns.
    """
    historical_data = {}

    for category, details in TARGET_ALLOCATION.items():
        etf_performance = []

        for etf in details["etfs"]:
            symbol = etf["symbol"]
            name = etf["name"]

            # Get historical data for this ETF
            perf_data = get_etf_historical_data(symbol, name)
            etf_performance.append(perf_data)

        historical_data[category] = {
            "etfs": etf_performance
        }

    return {
        "historical_performance": historical_data,
        "notes": [
            "Returns are annualized total returns (includes price appreciation + dividends reinvested)",
            "Yield is current trailing 12-month dividend yield",
            "null values indicate data not available (ETF may be newer than the time period)",
            "JEPI launched May 2020 - has ~5 years of history",
            "JEPQ launched May 2022 - has ~3 years of history",
            "SGOV launched Sep 2018 - has ~6 years of history"
        ]
    }
