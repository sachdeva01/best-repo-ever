from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from database import get_db
from models import BrokerageAccount, MarketData

router = APIRouter()

# Target portfolio allocation from retirement plan (Opus strategy)
TARGET_ALLOCATION = {
    "Dividend Growth Stocks": {"allocation": 0.30, "base_yield": 0.025},
    "High-Yield Bonds": {"allocation": 0.20, "base_yield": 0.055},
    "REITs": {"allocation": 0.10, "base_yield": 0.045},
    "Treasury/TIPS": {"allocation": 0.15, "base_yield": 0.040},
    "Preferred Stock": {"allocation": 0.05, "base_yield": 0.060},
    "Cash/Money Market": {"allocation": 0.08, "base_yield": 0.040},
    "Growth Equities": {"allocation": 0.12, "base_yield": 0.010}
}


def calculate_expected_yield_from_market(db: Session) -> float:
    """
    Calculate expected portfolio yield based on current market conditions.
    Adjusts base yields based on 10-Year Treasury rate.
    """
    # Get current 10-Year Treasury yield
    treasury_data = db.query(MarketData).filter(
        MarketData.data_type == "10-Year Treasury"
    ).first()

    treasury_yield = treasury_data.value / 100 if treasury_data else 0.0425

    # Adjust yields based on current treasury rate
    # If treasury is higher/lower than base assumption (4%), adjust all yields proportionally
    base_treasury = 0.04
    yield_adjustment = treasury_yield - base_treasury

    weighted_yield = 0.0

    for asset_class, details in TARGET_ALLOCATION.items():
        allocation = details["allocation"]
        base_yield = details["base_yield"]

        # Adjust yield based on treasury movement
        # Fixed income adjusts 1:1, equities adjust 0.5:1
        if "Bond" in asset_class or "Treasury" in asset_class or "Cash" in asset_class or "Preferred" in asset_class:
            adjusted_yield = base_yield + yield_adjustment
        else:
            # Equities and REITs adjust less with treasury changes
            adjusted_yield = base_yield + (yield_adjustment * 0.5)

        weighted_yield += allocation * adjusted_yield

    return weighted_yield


def calculate_expected_growth_rate(db: Session) -> float:
    """
    Calculate expected portfolio growth rate.
    Conservative estimate: 6% annually.
    """
    # Conservative growth rate assumption
    # Accounts for market volatility, economic cycles, and conservative planning
    conservative_growth_rate = 0.06

    return conservative_growth_rate


@router.get("/expected-returns")
async def get_expected_returns(db: Session = Depends(get_db)):
    """
    Get expected portfolio returns based on current market conditions
    and target asset allocation strategy.
    """
    # Get current net worth
    accounts = db.query(BrokerageAccount).all()
    current_net_worth = sum(acc.current_balance for acc in accounts)

    # Calculate expected yield based on market conditions
    expected_yield = calculate_expected_yield_from_market(db)

    # Calculate expected income
    expected_annual_income = current_net_worth * expected_yield

    # Calculate expected portfolio growth rate
    expected_growth_rate = calculate_expected_growth_rate(db)

    # Get current treasury rate for reference
    treasury_data = db.query(MarketData).filter(
        MarketData.data_type == "10-Year Treasury"
    ).first()
    current_treasury_yield = treasury_data.value / 100 if treasury_data else 0.0425

    return {
        "expected_annual_income": round(expected_annual_income, 2),
        "expected_portfolio_yield": round(expected_yield, 4),
        "expected_growth_rate": round(expected_growth_rate, 4),
        "current_treasury_yield": round(current_treasury_yield, 4),
        "target_allocation": TARGET_ALLOCATION,
        "notes": "Expected returns based on target asset allocation and current market conditions"
    }


@router.get("/income-comparison")
async def get_income_comparison(db: Session = Depends(get_db)):
    """
    Compare current actual income vs expected income from optimal allocation with real-time yields.
    """
    from models import Holding, RetirementConfig
    import sys
    sys.path.append('/Users/ssachdeva/Desktop/my-app/backend')
    from routers.portfolio_allocation import TARGET_ALLOCATION, get_current_yield

    # Get current net worth
    accounts = db.query(BrokerageAccount).all()
    current_net_worth = sum(acc.current_balance for acc in accounts)

    # Calculate current actual dividend income from holdings
    holdings = db.query(Holding).all()
    current_annual_income = 0.0
    for holding in holdings:
        if holding.dividend_yield:
            holding_value = holding.quantity * holding.price_per_share
            current_annual_income += holding_value * holding.dividend_yield

    # Calculate current actual yield
    current_yield = (current_annual_income / current_net_worth) if current_net_worth > 0 else 0.0

    # Get tax rates
    config = db.query(RetirementConfig).first()
    tax_rate = config.qualified_dividend_tax_rate if config else 0.2464  # Use blended rate

    # Calculate expected income from optimal allocation using real-time ETF yields
    expected_annual_income = 0.0
    for category, details in TARGET_ALLOCATION.items():
        category_percentage = details["percentage"]
        category_value = current_net_worth * category_percentage

        for etf in details["etfs"]:
            symbol = etf["symbol"]
            weight = etf["weight"]
            current_etf_yield = get_current_yield(symbol)

            etf_value = category_value * weight
            etf_annual_income = etf_value * (current_etf_yield / 100)
            expected_annual_income += etf_annual_income

    # Calculate expected yield
    expected_yield = (expected_annual_income / current_net_worth) if current_net_worth > 0 else 0.0

    # Calculate after-tax values
    current_after_tax_income = current_annual_income * (1 - tax_rate)
    expected_after_tax_income = expected_annual_income * (1 - tax_rate)

    # Calculate gaps
    income_gap = expected_annual_income - current_annual_income
    after_tax_income_gap = expected_after_tax_income - current_after_tax_income
    yield_gap = expected_yield - current_yield

    # Calculate how close to target
    progress_to_target = (current_annual_income / expected_annual_income * 100) if expected_annual_income > 0 else 0.0

    return {
        "current_annual_income": round(current_annual_income, 2),
        "current_after_tax_income": round(current_after_tax_income, 2),
        "current_yield": round(current_yield, 4),
        "expected_annual_income": round(expected_annual_income, 2),
        "expected_after_tax_income": round(expected_after_tax_income, 2),
        "expected_yield": round(expected_yield, 4),
        "income_gap": round(income_gap, 2),
        "after_tax_income_gap": round(after_tax_income_gap, 2),
        "yield_gap": round(yield_gap, 4),
        "progress_to_target_percentage": round(progress_to_target, 2),
        "tax_rate": round(tax_rate * 100, 2),
        "status": "On Track" if progress_to_target >= 90 else "Below Target" if progress_to_target >= 70 else "Needs Attention"
    }
