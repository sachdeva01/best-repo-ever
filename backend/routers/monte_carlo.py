from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from database import get_db
from models import BrokerageAccount, ExpenseCategory, RetirementConfig, Expense
import numpy as np
from typing import List, Dict

router = APIRouter()


def run_monte_carlo_simulation(
    db: Session,
    num_simulations: int = 1000,
    years: int = 39
) -> Dict:
    """
    Run Monte Carlo simulation for retirement planning.
    Uses normal distribution for returns with volatility.
    """
    # Get configuration
    config = db.query(RetirementConfig).first()
    if not config:
        return {"error": "Configuration not found"}

    accounts = db.query(BrokerageAccount).all()
    current_portfolio_value = sum(acc.current_balance for acc in accounts)

    # Get expenses from actual expense records (only recurring)
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

    # Simulation parameters
    expected_return = 0.06  # 6% expected return
    volatility = 0.15  # 15% standard deviation (market volatility)
    inflation_rate = config.inflation_rate
    current_age = config.current_age
    withdrawal_start_age = config.withdrawal_start_age
    social_security_start_age = config.social_security_start_age
    target_age = config.target_age
    social_security_monthly = config.estimated_social_security_monthly
    tax_rate = config.qualified_dividend_tax_rate

    # Annual contributions
    annual_reinvestment = 20000.0
    years_until_withdrawal = withdrawal_start_age - current_age
    one_time_contribution = 250000.0
    expected_yield = 0.0431  # 4.31% from optimal allocation

    # Storage for all simulation results
    all_simulations = []
    success_count = 0
    final_values = []

    for sim in range(num_simulations):
        portfolio_value = current_portfolio_value
        year_results = []

        for year in range(years):
            age = current_age + year

            # Save portfolio value at START of year
            portfolio_value_start = portfolio_value

            # Generate random return for this year (normal distribution)
            random_return = np.random.normal(expected_return, volatility)

            # Add one-time contribution at age 54 (last year before withdrawal)
            if age == withdrawal_start_age - 1:
                portfolio_value += one_time_contribution

            # Calculate portfolio income (based on start of year value)
            portfolio_income_pretax = portfolio_value * expected_yield
            portfolio_income_aftertax = portfolio_income_pretax * (1 - tax_rate)

            # Calculate expenses for this year (inflation-adjusted)
            current_expenses = annual_expenses * ((1 + inflation_rate) ** year)

            # Calculate Social Security income if applicable
            social_security_income = 0
            if age >= social_security_start_age:
                social_security_income = social_security_monthly * 12 * ((1 + inflation_rate) ** year)

            # Net expenses after Social Security
            net_expenses = current_expenses - social_security_income

            # Handle withdrawal phase
            if age >= withdrawal_start_age:
                # Calculate surplus/deficit
                surplus_deficit = portfolio_income_aftertax - net_expenses

                # If surplus, reinvest $20K back into portfolio
                if surplus_deficit > 0:
                    reinvestment = min(annual_reinvestment, surplus_deficit)
                    portfolio_value += reinvestment
                # If deficit, withdraw from principal
                else:
                    portfolio_value += surplus_deficit  # Subtract deficit

            # Apply market return (for next year's starting value)
            portfolio_value *= (1 + random_return)

            # Don't let portfolio go negative
            if portfolio_value < 0:
                portfolio_value = 0

            year_results.append({
                "year": year,
                "age": age,
                "portfolio_value": portfolio_value_start,
                "return": random_return
            })

        all_simulations.append(year_results)
        final_values.append(portfolio_value)

        # Count as success if portfolio value > 0 at target age
        if portfolio_value > 0:
            success_count += 1

    # Calculate statistics
    success_rate = (success_count / num_simulations) * 100

    # Calculate percentiles for each year
    percentiles = {}
    for year in range(years):
        year_values = [sim[year]["portfolio_value"] for sim in all_simulations]
        percentiles[year] = {
            "year": year,
            "age": current_age + year,
            "p10": round(np.percentile(year_values, 10), 2),
            "p25": round(np.percentile(year_values, 25), 2),
            "p50": round(np.percentile(year_values, 50), 2),  # Median
            "p75": round(np.percentile(year_values, 75), 2),
            "p90": round(np.percentile(year_values, 90), 2),
            "mean": round(np.mean(year_values), 2)
        }

    # Final value statistics
    final_stats = {
        "mean": round(np.mean(final_values), 2),
        "median": round(np.median(final_values), 2),
        "min": round(np.min(final_values), 2),
        "max": round(np.max(final_values), 2),
        "p10": round(np.percentile(final_values, 10), 2),
        "p90": round(np.percentile(final_values, 90), 2)
    }

    return {
        "num_simulations": num_simulations,
        "years": years,
        "success_rate": round(success_rate, 2),
        "final_value_stats": final_stats,
        "percentiles_by_year": list(percentiles.values()),
        "parameters": {
            "starting_portfolio": round(current_portfolio_value, 2),
            "expected_return": expected_return,
            "volatility": volatility,
            "inflation_rate": inflation_rate,
            "annual_expenses": round(annual_expenses, 2),
            "annual_reinvestment": annual_reinvestment,
            "one_time_contribution": one_time_contribution,
            "tax_rate": tax_rate
        }
    }


@router.get("/monte-carlo/simulate")
async def get_monte_carlo_simulation(
    simulations: int = 1000,
    db: Session = Depends(get_db)
):
    """
    Run Monte Carlo simulation for retirement planning.
    Default: 1000 simulations over 39 years (age 51 to 90).
    """
    result = run_monte_carlo_simulation(db, num_simulations=simulations)
    return result
