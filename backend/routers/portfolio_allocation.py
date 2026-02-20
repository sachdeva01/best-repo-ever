from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from database import get_db
from models import BrokerageAccount, Holding
import yfinance as yf
from datetime import datetime, timedelta

router = APIRouter()

# Target allocation with specific ETFs
TARGET_ALLOCATION = {
    "Dividend Growth Stocks": {
        "percentage": 0.30,
        "etfs": [
            {"symbol": "VYM", "name": "Vanguard High Dividend Yield ETF", "weight": 0.40},
            {"symbol": "SCHD", "name": "Schwab US Dividend Equity ETF", "weight": 0.40},
            {"symbol": "DGRO", "name": "iShares Core Dividend Growth ETF", "weight": 0.20}
        ]
    },
    "High-Yield Bonds": {
        "percentage": 0.20,
        "etfs": [
            {"symbol": "JEPI", "name": "JPMorgan Equity Premium Income ETF", "weight": 0.50},
            {"symbol": "JEPQ", "name": "JPMorgan Nasdaq Equity Premium Income ETF", "weight": 0.50}
        ]
    },
    "REITs": {
        "percentage": 0.10,
        "etfs": [
            {"symbol": "VNQ", "name": "Vanguard Real Estate ETF", "weight": 0.60},
            {"symbol": "SCHH", "name": "Schwab US REIT ETF", "weight": 0.40}
        ]
    },
    "Treasury/TIPS": {
        "percentage": 0.15,
        "etfs": [
            {"symbol": "TIP", "name": "iShares TIPS Bond ETF", "weight": 0.50},
            {"symbol": "VTIP", "name": "Vanguard Short-Term Inflation-Protected Securities ETF", "weight": 0.30},
            {"symbol": "GOVT", "name": "iShares US Treasury Bond ETF", "weight": 0.20}
        ]
    },
    "Preferred Stock": {
        "percentage": 0.05,
        "etfs": [
            {"symbol": "PFF", "name": "iShares Preferred and Income Securities ETF", "weight": 0.60},
            {"symbol": "PFFD", "name": "Global X US Preferred ETF", "weight": 0.40}
        ]
    },
    "Cash/Money Market": {
        "percentage": 0.08,
        "etfs": [
            {"symbol": "SGOV", "name": "iShares 0-3 Month Treasury Bond ETF", "weight": 0.60},
            {"symbol": "BIL", "name": "SPDR Bloomberg 1-3 Month T-Bill ETF", "weight": 0.40}
        ]
    },
    "Growth Equities": {
        "percentage": 0.12,
        "etfs": [
            {"symbol": "VOO", "name": "Vanguard S&P 500 ETF", "weight": 0.60},
            {"symbol": "VTI", "name": "Vanguard Total Stock Market ETF", "weight": 0.40}
        ]
    }
}


def get_current_yield(symbol: str) -> float:
    """Fetch current dividend yield for an ETF"""
    try:
        ticker = yf.Ticker(symbol)
        info = ticker.info

        # Try to get dividend yield from info
        dividend_yield = info.get('yield', None)
        if dividend_yield:
            return float(dividend_yield) * 100  # Convert to percentage

        # If not available, try trailing yield
        trailing_yield = info.get('trailingAnnualDividendYield', None)
        if trailing_yield:
            return float(trailing_yield) * 100

        # Fallback: calculate from dividend and price
        dividend = info.get('trailingAnnualDividendRate', 0)
        price = info.get('regularMarketPrice', info.get('currentPrice', 1))
        if dividend and price:
            return (float(dividend) / float(price)) * 100

        return 0.0
    except Exception as e:
        print(f"Error fetching yield for {symbol}: {e}")
        return 0.0


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
    """Calculate portfolio allocation with actual ETF yields"""
    from models import RetirementConfig

    # Get total portfolio value
    accounts = db.query(BrokerageAccount).all()
    total_portfolio_value = sum(acc.current_balance for acc in accounts)

    # Get tax rates from config
    config = db.query(RetirementConfig).first()
    qualified_div_tax_rate = config.qualified_dividend_tax_rate if config else 0.15
    ordinary_income_tax_rate = config.ordinary_income_tax_rate if config else 0.30

    # Define tax treatment for each category
    # qualified = qualified dividend treatment, ordinary = ordinary income treatment
    tax_treatment = {
        "Dividend Growth Stocks": "qualified",
        "High-Yield Bonds": "ordinary",  # JEPI/JEPQ are mostly ordinary income
        "REITs": "ordinary",  # REITs are mostly ordinary income
        "Treasury/TIPS": "ordinary",  # Interest income
        "Preferred Stock": "qualified",  # Preferred dividends are mostly qualified
        "Cash/Money Market": "ordinary",  # Interest income
        "Growth Equities": "qualified"  # Qualified dividends
    }

    allocation_details = {}
    total_annual_income = 0.0
    total_after_tax_income = 0.0
    category_yields = {}

    for category, details in TARGET_ALLOCATION.items():
        category_percentage = details["percentage"]
        category_value = total_portfolio_value * category_percentage

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
                "tax_rate": round(tax_rate * 100, 0)
            })

        # Calculate weighted average yield for category
        category_yield = (category_total_income / category_value * 100) if category_value > 0 else 0
        category_yields[category] = round(category_yield, 2)

        total_annual_income += category_total_income
        total_after_tax_income += category_after_tax_income

        allocation_details[category] = {
            "target_percentage": category_percentage * 100,
            "target_value": round(category_value, 2),
            "category_yield": round(category_yield, 2),
            "annual_income": round(category_total_income, 2),
            "after_tax_income": round(category_after_tax_income, 2),
            "tax_treatment": tax_treatment.get(category, "ordinary"),
            "tax_rate": round(tax_rate * 100, 0),
            "etfs": etf_details
        }

    # Calculate overall portfolio yield
    portfolio_yield = (total_annual_income / total_portfolio_value * 100) if total_portfolio_value > 0 else 0
    after_tax_yield = (total_after_tax_income / total_portfolio_value * 100) if total_portfolio_value > 0 else 0

    return {
        "total_portfolio_value": round(total_portfolio_value, 2),
        "total_annual_income": round(total_annual_income, 2),
        "total_after_tax_income": round(total_after_tax_income, 2),
        "portfolio_yield": round(portfolio_yield, 2),
        "after_tax_yield": round(after_tax_yield, 2),
        "allocation": allocation_details,
        "category_yields": category_yields,
        "tax_rates": {
            "qualified_dividend": round(qualified_div_tax_rate * 100, 0),
            "ordinary_income": round(ordinary_income_tax_rate * 100, 0)
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

    # Get total portfolio value from all accounts
    all_accounts = db.query(BrokerageAccount).all()
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
