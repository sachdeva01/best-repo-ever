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

    # Parameters — all sourced from config, no hardcoded values
    current_age = config.current_age
    withdrawal_start_age = config.withdrawal_start_age
    social_security_start_age = config.social_security_start_age
    target_age = config.target_age
    inflation_rate = config.inflation_rate
    expected_return = config.expected_portfolio_return  # default 6%
    expected_yield = config.expected_dividend_yield     # default 3%
    social_security_monthly = config.estimated_social_security_monthly
    tax_rate = config.qualified_dividend_tax_rate
    current_annual_income = config.current_annual_income
    income_growth_rate = config.income_growth_rate

    # Contributions — sourced from config
    annual_reinvestment = config.annual_reinvestment_amount
    one_time_contribution = config.pre_retirement_lump_sum

    # Two-sleeve parameters
    income_sleeve_pct = config.income_sleeve_pct or 0.0
    dividend_growth_rate = config.dividend_growth_rate or 0.035
    growth_sleeve_return = config.growth_sleeve_return or 0.065
    two_sleeve = income_sleeve_pct > 0

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

        # Calculate income from portfolio
        if two_sleeve and age >= withdrawal_start_age:
            # Two-sleeve: income sleeve principal is fixed; yield grows via dividend growth
            years_in_withdrawal = age - withdrawal_start_age
            income_sleeve_value = starting_portfolio_value * income_sleeve_pct
            portfolio_income_pretax = income_sleeve_value * expected_yield * ((1 + dividend_growth_rate) ** years_in_withdrawal)
        else:
            # Single portfolio: income based on current portfolio value
            portfolio_income_pretax = portfolio_value * expected_yield
        portfolio_income_aftertax = portfolio_income_pretax * (1 - tax_rate)

        # Add one-time contribution at age 54 (last year before withdrawal)
        contribution = 0.0
        if age == withdrawal_start_age - 1:
            contribution = one_time_contribution
            portfolio_value += contribution

        # Income grows at income_growth_rate during accumulation
        earned_income = 0.0
        if age < withdrawal_start_age:
            earned_income = current_annual_income * ((1 + income_growth_rate) ** year)

        # Calculate surplus/deficit and reinvestment
        reinvestment = 0.0
        if age >= withdrawal_start_age:
            # In withdrawal phase — cover expenses from portfolio income
            surplus_deficit = portfolio_income_aftertax - net_expenses

            # If surplus, reinvest back into portfolio
            if surplus_deficit > 0:
                reinvestment = min(annual_reinvestment, surplus_deficit)
                portfolio_value += reinvestment
                surplus_deficit -= reinvestment  # Remaining surplus after reinvestment
            # If deficit, withdraw from principal
            elif surplus_deficit < 0:
                portfolio_value += surplus_deficit  # Subtract deficit from portfolio
        else:
            # In accumulation phase — earned income + portfolio income vs expenses
            surplus_deficit = earned_income + portfolio_income_aftertax - inflated_expenses

        # Apply growth at end of year (for next year's starting value)
        if year < years:
            if two_sleeve and age >= withdrawal_start_age:
                # Income sleeve principal stays fixed; only growth sleeve compounds
                income_sleeve_value = starting_portfolio_value * income_sleeve_pct
                growth_sleeve_value = portfolio_value - income_sleeve_value
                growth_sleeve_value *= (1 + growth_sleeve_return)
                portfolio_value = income_sleeve_value + growth_sleeve_value
            else:
                portfolio_value *= (1 + expected_return)

        projections.append({
            "year": year,
            "age": age,
            "portfolio_value": round(portfolio_value_start, 2),
            "earned_income": round(earned_income, 2),
            "portfolio_income_pretax": round(portfolio_income_pretax, 2),
            "portfolio_income_aftertax": round(portfolio_income_aftertax, 2),
            "social_security_income": round(social_security_income, 2),
            "total_income_aftertax": round(earned_income + portfolio_income_aftertax + social_security_income, 2),
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
            "one_time_contribution": one_time_contribution,
            "current_annual_income": current_annual_income,
            "income_growth_rate": income_growth_rate,
            "two_sleeve_enabled": two_sleeve,
            "income_sleeve_pct": income_sleeve_pct if two_sleeve else None,
            "dividend_growth_rate": dividend_growth_rate if two_sleeve else None,
            "growth_sleeve_return": growth_sleeve_return if two_sleeve else None,
        }
    }
