from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from database import get_db
from models import BrokerageAccount, Holding, AccountSnapshot, ExpenseCategory
from schemas import PortfolioSummaryResponse
from datetime import datetime, timedelta

router = APIRouter()


@router.get("/dashboard/summary", response_model=PortfolioSummaryResponse)
async def get_portfolio_summary(db: Session = Depends(get_db)):
    """Get complete portfolio summary"""

    # Get all accounts
    accounts = db.query(BrokerageAccount).all()
    total_net_worth = sum(acc.current_balance for acc in accounts)
    total_accounts = len(accounts)

    # Get all holdings
    all_holdings = db.query(Holding).all()
    total_holdings = len(all_holdings)

    # Calculate annual dividend income
    annual_dividend_income = 0.0
    for holding in all_holdings:
        if holding.dividend_yield:
            holding_value = holding.quantity * holding.price_per_share
            annual_dividend_income += holding_value * holding.dividend_yield

    # Calculate current portfolio yield
    current_portfolio_yield = (annual_dividend_income / total_net_worth) if total_net_worth > 0 else 0.0

    return PortfolioSummaryResponse(
        total_net_worth=total_net_worth,
        total_accounts=total_accounts,
        total_holdings=total_holdings,
        annual_dividend_income=annual_dividend_income,
        current_portfolio_yield=current_portfolio_yield
    )


@router.get("/dashboard/net-worth")
async def get_net_worth_history(db: Session = Depends(get_db)):
    """Get net worth over time from account snapshots"""

    # Get all snapshots, grouped by date
    snapshots = db.query(AccountSnapshot).order_by(AccountSnapshot.snapshot_date).all()

    if not snapshots:
        # If no snapshots, return current balance
        accounts = db.query(BrokerageAccount).all()
        current_total = sum(acc.current_balance for acc in accounts)

        return {
            "history": [{
                "date": datetime.utcnow().isoformat(),
                "net_worth": current_total
            }],
            "current_net_worth": current_total,
            "data_points": 1
        }

    # Group by date and sum
    date_totals = {}
    for snapshot in snapshots:
        date_key = snapshot.snapshot_date.date().isoformat()
        if date_key not in date_totals:
            date_totals[date_key] = 0.0
        date_totals[date_key] += snapshot.balance

    # Format for response
    history = [
        {"date": date, "net_worth": total}
        for date, total in sorted(date_totals.items())
    ]

    # Add current balance as most recent point
    accounts = db.query(BrokerageAccount).all()
    current_total = sum(acc.current_balance for acc in accounts)

    return {
        "history": history,
        "current_net_worth": current_total,
        "data_points": len(history)
    }


@router.get("/dashboard/allocation")
async def get_asset_allocation(db: Session = Depends(get_db)):
    """Get asset allocation breakdown"""

    holdings = db.query(Holding).all()

    if not holdings:
        return {
            "allocation": [],
            "total_value": 0.0
        }

    # Group by asset type
    allocation_map = {}
    total_value = 0.0

    for holding in holdings:
        holding_value = holding.quantity * holding.price_per_share
        asset_type = holding.asset_type

        if asset_type not in allocation_map:
            allocation_map[asset_type] = 0.0

        allocation_map[asset_type] += holding_value
        total_value += holding_value

    # Calculate percentages
    allocation = []
    for asset_type, value in allocation_map.items():
        percentage = (value / total_value * 100) if total_value > 0 else 0.0
        allocation.append({
            "asset_type": asset_type,
            "value": round(value, 2),
            "percentage": round(percentage, 2)
        })

    # Sort by value descending
    allocation.sort(key=lambda x: x["value"], reverse=True)

    return {
        "allocation": allocation,
        "total_value": round(total_value, 2)
    }


@router.get("/dashboard/quick-stats")
async def get_quick_stats(db: Session = Depends(get_db)):
    """Get quick statistics for dashboard cards"""
    from models import RetirementConfig
    import sys
    sys.path.append('/Users/ssachdeva/Desktop/my-app/backend')
    from routers.portfolio_allocation import TARGET_ALLOCATION, get_current_yield

    # Get portfolio summary
    accounts = db.query(BrokerageAccount).all()
    total_net_worth = sum(acc.current_balance for acc in accounts)

    # Get tax rates from config
    config = db.query(RetirementConfig).first()
    qualified_div_tax_rate = config.qualified_dividend_tax_rate if config else 0.15
    ordinary_income_tax_rate = config.ordinary_income_tax_rate if config else 0.30

    # Define tax treatment for each category
    tax_treatment = {
        "Dividend Growth Stocks": "qualified",
        "High-Yield Bonds": "ordinary",
        "REITs": "ordinary",
        "Treasury/TIPS": "ordinary",
        "Preferred Stock": "qualified",
        "Cash/Money Market": "ordinary",
        "Growth Equities": "qualified"
    }

    # Calculate expected annual income from optimal allocation
    annual_dividend_income = 0.0
    after_tax_annual_income = 0.0

    for category, details in TARGET_ALLOCATION.items():
        category_percentage = details["percentage"]
        category_value = total_net_worth * category_percentage

        # Determine tax rate for this category
        is_qualified = tax_treatment.get(category, "ordinary") == "qualified"
        tax_rate = qualified_div_tax_rate if is_qualified else ordinary_income_tax_rate

        for etf in details["etfs"]:
            symbol = etf["symbol"]
            weight = etf["weight"]
            current_yield = get_current_yield(symbol)

            etf_value = category_value * weight
            etf_annual_income = etf_value * (current_yield / 100)
            etf_after_tax_income = etf_annual_income * (1 - tax_rate)

            annual_dividend_income += etf_annual_income
            after_tax_annual_income += etf_after_tax_income

    # Get retirement config
    if config:
        progress_percentage = (total_net_worth / config.target_portfolio_value * 100) if config.target_portfolio_value > 0 else 0.0
        years_to_withdrawal = config.withdrawal_start_age - config.current_age
    else:
        progress_percentage = 0.0
        years_to_withdrawal = 0

    # Calculate total annual expenses
    expense_categories = db.query(ExpenseCategory).all()
    total_annual_expenses = sum(cat.annual_amount for cat in expense_categories)

    # Calculate projected net worth at withdrawal (4 years from now)
    # Includes: 6% annual growth + $20K/year reinvestment from surplus + $250K one-time contribution
    from routers.expected_returns import calculate_expected_growth_rate
    expected_growth_rate = calculate_expected_growth_rate(db)  # Conservative 6% growth
    years_to_withdrawal_calc = years_to_withdrawal if years_to_withdrawal > 0 else 4
    annual_reinvestment = 20000.0  # From surplus
    one_time_contribution = 250000.0

    # Calculate with annual reinvestment (future value of annuity)
    balance = total_net_worth
    for year in range(years_to_withdrawal_calc):
        balance += annual_reinvestment  # Add reinvestment at beginning of year
        balance *= (1 + expected_growth_rate)  # Apply growth

    projected_net_worth_at_withdrawal = balance + one_time_contribution

    return {
        "total_net_worth": round(total_net_worth, 2),
        "projected_net_worth_at_withdrawal": round(projected_net_worth_at_withdrawal, 2),
        "annual_dividend_income": round(annual_dividend_income, 2),
        "after_tax_annual_income": round(after_tax_annual_income, 2),
        "total_annual_expenses": round(total_annual_expenses, 2),
        "progress_to_target_percentage": round(progress_percentage, 2),
        "years_to_withdrawal": years_to_withdrawal
    }
