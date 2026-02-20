from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from database import get_db
from models import BrokerageAccount, ExpenseCategory, RetirementConfig, Expense
from typing import List, Dict

router = APIRouter()


@router.get("/year-projection")
async def get_year_by_year_projection(db: Session = Depends(get_db)):
    """
    Generate year-by-year projection from current age to target age.
    Shows portfolio value, income, expenses, and surplus for each year.
    """
    # Get configuration
    config = db.query(RetirementConfig).first()
    if not config:
        return {"error": "Configuration not found"}

    accounts = db.query(BrokerageAccount).all()
    starting_portfolio_value = sum(acc.current_balance for acc in accounts)

    # Get expenses from actual expense records (only recurring)
    expenses = db.query(Expense).all()
    base_annual_expenses = 0.0

    for expense in expenses:
        if expense.is_recurring:
            if expense.recurrence_period == "MONTHLY":
                base_annual_expenses += expense.amount * 12
            elif expense.recurrence_period == "QUARTERLY":
                base_annual_expenses += expense.amount * 4
            elif expense.recurrence_period == "YEARLY":
                base_annual_expenses += expense.amount
            elif expense.recurrence_period == "MULTI_YEAR" and expense.recurrence_interval_years:
                base_annual_expenses += expense.amount / expense.recurrence_interval_years

    # Parameters
    current_age = config.current_age
    withdrawal_start_age = config.withdrawal_start_age
    social_security_start_age = config.social_security_start_age
    target_age = config.target_age
    inflation_rate = config.inflation_rate
    expected_return = 0.06  # 6% growth
    expected_yield = 0.0431  # 4.31% from optimal allocation
    social_security_monthly = config.estimated_social_security_monthly
    tax_rate = config.qualified_dividend_tax_rate

    # Contributions
    annual_reinvestment = 20000.0
    one_time_contribution = 250000.0

    years = target_age - current_age
    portfolio_value = starting_portfolio_value

    projections = []

    for year in range(years + 1):
        age = current_age + year

        # Save portfolio value at START of year (before any changes)
        portfolio_value_start = portfolio_value

        # Calculate inflation-adjusted expenses
        inflated_expenses = base_annual_expenses * ((1 + inflation_rate) ** year)

        # Calculate Social Security income
        social_security_income = 0.0
        if age >= social_security_start_age:
            social_security_income = social_security_monthly * 12 * ((1 + inflation_rate) ** (age - current_age))

        # Net expenses after Social Security
        net_expenses = inflated_expenses - social_security_income

        # Calculate income from portfolio (based on start of year value)
        portfolio_income_pretax = portfolio_value * expected_yield
        portfolio_income_aftertax = portfolio_income_pretax * (1 - tax_rate)

        # Add one-time contribution at age 54 (last year before withdrawal)
        contribution = 0.0
        if age == withdrawal_start_age - 1:
            contribution = one_time_contribution
            portfolio_value += contribution

        # Calculate surplus/deficit and reinvestment
        reinvestment = 0.0
        if age >= withdrawal_start_age:
            # In withdrawal phase - need to cover expenses
            surplus_deficit = portfolio_income_aftertax - net_expenses

            # If surplus, reinvest $20K back into portfolio
            if surplus_deficit > 0:
                reinvestment = min(annual_reinvestment, surplus_deficit)
                portfolio_value += reinvestment
                surplus_deficit -= reinvestment  # Remaining surplus after reinvestment
            # If deficit, withdraw from principal
            elif surplus_deficit < 0:
                portfolio_value += surplus_deficit  # Subtract deficit from portfolio
        else:
            # In accumulation phase - all income is surplus (no withdrawals yet)
            surplus_deficit = portfolio_income_aftertax

        # Apply growth at end of year (for next year's starting value)
        if year < years:  # Don't apply growth after final year
            portfolio_value *= (1 + expected_return)

        projections.append({
            "year": year,
            "age": age,
            "portfolio_value": round(portfolio_value_start, 2),
            "portfolio_income_pretax": round(portfolio_income_pretax, 2),
            "portfolio_income_aftertax": round(portfolio_income_aftertax, 2),
            "social_security_income": round(social_security_income, 2),
            "total_income_aftertax": round(portfolio_income_aftertax + social_security_income, 2),
            "expenses": round(inflated_expenses, 2),
            "net_expenses": round(net_expenses, 2),
            "contribution": round(contribution, 2),
            "reinvestment": round(reinvestment, 2),
            "surplus_deficit": round(surplus_deficit, 2),
            "phase": "Accumulation" if age < withdrawal_start_age else "Withdrawal",
            "milestone": (
                "🎂 Current Age" if age == current_age else
                "🎯 Withdrawal Starts" if age == withdrawal_start_age else
                "💰 Social Security Starts" if age == social_security_start_age else
                "🏁 Target Age" if age == target_age else
                None
            )
        })

    # Calculate summary statistics
    accumulation_years = [p for p in projections if p["phase"] == "Accumulation"]
    withdrawal_years = [p for p in projections if p["phase"] == "Withdrawal"]

    summary = {
        "starting_portfolio": round(starting_portfolio_value, 2),
        "ending_portfolio": round(projections[-1]["portfolio_value"], 2),
        "total_gain": round(projections[-1]["portfolio_value"] - starting_portfolio_value, 2),
        "peak_portfolio": round(max(p["portfolio_value"] for p in projections), 2),
        "years_in_accumulation": len(accumulation_years),
        "years_in_withdrawal": len(withdrawal_years),
        "total_contributions": round(sum(p["contribution"] for p in projections), 2),
        "total_income_generated": round(sum(p["total_income_aftertax"] for p in withdrawal_years), 2),
        "total_expenses": round(sum(p["net_expenses"] for p in withdrawal_years), 2),
        "success": projections[-1]["portfolio_value"] > 0
    }

    return {
        "projections": projections,
        "summary": summary,
        "assumptions": {
            "expected_return": expected_return,
            "expected_yield": expected_yield,
            "inflation_rate": inflation_rate,
            "tax_rate": tax_rate,
            "annual_reinvestment": annual_reinvestment,
            "one_time_contribution": one_time_contribution
        }
    }
