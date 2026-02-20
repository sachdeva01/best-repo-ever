from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from database import get_db
from models import BrokerageAccount, ExpenseCategory, RetirementConfig
from pydantic import BaseModel
from typing import Optional

router = APIRouter()


class ScenarioInput(BaseModel):
    # Portfolio assumptions
    portfolio_value: Optional[float] = None
    portfolio_yield: Optional[float] = None
    portfolio_growth_rate: Optional[float] = None

    # Retirement assumptions
    current_age: Optional[int] = None
    withdrawal_start_age: Optional[int] = None
    social_security_start_age: Optional[int] = None
    target_age: Optional[int] = None
    target_portfolio_value: Optional[float] = None

    # Income assumptions
    annual_expenses: Optional[float] = None
    social_security_monthly: Optional[float] = None

    # Economic assumptions
    inflation_rate: Optional[float] = None


def run_scenario_calculation(db: Session, scenario: ScenarioInput) -> dict:
    """
    Run retirement projection with custom scenario parameters.
    Uses current values as defaults if not specified.
    """
    # Get current config and portfolio data
    config = db.query(RetirementConfig).first()
    accounts = db.query(BrokerageAccount).all()
    current_net_worth = sum(acc.current_balance for acc in accounts)

    # Use scenario values or fall back to current
    portfolio_value = scenario.portfolio_value if scenario.portfolio_value is not None else current_net_worth
    current_age = scenario.current_age if scenario.current_age is not None else (config.current_age if config else 51)
    withdrawal_start_age = scenario.withdrawal_start_age if scenario.withdrawal_start_age is not None else (config.withdrawal_start_age if config else 55)
    social_security_start_age = scenario.social_security_start_age if scenario.social_security_start_age is not None else (config.social_security_start_age if config else 67)
    target_age = scenario.target_age if scenario.target_age is not None else (config.target_age if config else 90)
    target_portfolio_value = scenario.target_portfolio_value if scenario.target_portfolio_value is not None else (config.target_portfolio_value if config else 4250000)
    inflation_rate = scenario.inflation_rate if scenario.inflation_rate is not None else (config.inflation_rate if config else 0.03)
    portfolio_yield = scenario.portfolio_yield if scenario.portfolio_yield is not None else 0.0371
    portfolio_growth_rate = scenario.portfolio_growth_rate if scenario.portfolio_growth_rate is not None else 0.06
    ss_monthly = scenario.social_security_monthly if scenario.social_security_monthly is not None else (config.estimated_social_security_monthly if config else 3000)

    # Calculate annual expenses
    if scenario.annual_expenses is not None:
        annual_expenses = scenario.annual_expenses
    elif config and config.annual_expenses_override:
        annual_expenses = config.annual_expenses_override
    else:
        categories = db.query(ExpenseCategory).all()
        annual_expenses = sum(cat.annual_amount for cat in categories)

    # Calculate timeline
    years_to_withdrawal = withdrawal_start_age - current_age
    years_in_retirement = target_age - withdrawal_start_age
    years_before_ss = social_security_start_age - withdrawal_start_age
    years_with_ss = target_age - social_security_start_age

    # Calculate inflation-adjusted values
    expenses_at_withdrawal = annual_expenses * ((1 + inflation_rate) ** years_to_withdrawal)
    expenses_at_ss_start = expenses_at_withdrawal * ((1 + inflation_rate) ** years_before_ss)

    # Social Security income (inflation adjusted)
    ss_annual_at_start = (ss_monthly * 12) * ((1 + inflation_rate) ** (social_security_start_age - current_age))
    net_expenses_with_ss = expenses_at_ss_start - ss_annual_at_start

    # Income calculations
    annual_income = portfolio_value * portfolio_yield
    income_gap_before_ss = expenses_at_withdrawal - annual_income
    income_gap_after_ss = net_expenses_with_ss - annual_income

    # Portfolio projection
    portfolio_at_withdrawal = portfolio_value * ((1 + portfolio_growth_rate) ** years_to_withdrawal)

    # Simple projection: grow portfolio, generate income, cover expenses
    projected_portfolio = portfolio_at_withdrawal
    for year in range(years_in_retirement):
        age = withdrawal_start_age + year
        years_from_start = year

        # Calculate that year's expenses (inflation adjusted)
        year_expenses = expenses_at_withdrawal * ((1 + inflation_rate) ** years_from_start)

        # Calculate that year's income
        year_dividend_income = projected_portfolio * portfolio_yield

        # Calculate that year's SS income (if applicable)
        year_ss_income = 0
        if age >= social_security_start_age:
            years_since_ss = age - social_security_start_age
            year_ss_income = ss_annual_at_start * ((1 + inflation_rate) ** years_since_ss)

        # Net cash flow
        year_total_income = year_dividend_income + year_ss_income
        year_net_cash_flow = year_total_income - year_expenses

        # Update portfolio (grow and add/subtract net cash flow)
        projected_portfolio = projected_portfolio * (1 + portfolio_growth_rate) + year_net_cash_flow

    final_portfolio_value = projected_portfolio

    # Calculate success metrics
    income_sufficient_before_ss = annual_income >= expenses_at_withdrawal
    income_sufficient_after_ss = annual_income >= net_expenses_with_ss if net_expenses_with_ss > 0 else True
    target_met = final_portfolio_value >= target_portfolio_value

    # Progress metrics
    progress_to_target = (portfolio_value / target_portfolio_value * 100) if target_portfolio_value > 0 else 0
    required_growth_rate = ((target_portfolio_value / portfolio_value) ** (1 / (target_age - current_age)) - 1) if portfolio_value > 0 and (target_age - current_age) > 0 else 0

    return {
        "inputs": {
            "portfolio_value": round(portfolio_value, 2),
            "portfolio_yield": round(portfolio_yield, 4),
            "portfolio_growth_rate": round(portfolio_growth_rate, 4),
            "current_age": current_age,
            "withdrawal_start_age": withdrawal_start_age,
            "social_security_start_age": social_security_start_age,
            "target_age": target_age,
            "target_portfolio_value": round(target_portfolio_value, 2),
            "annual_expenses": round(annual_expenses, 2),
            "inflation_rate": round(inflation_rate, 4)
        },
        "timeline": {
            "years_to_withdrawal": years_to_withdrawal,
            "years_in_retirement": years_in_retirement,
            "years_before_social_security": years_before_ss,
            "years_with_social_security": years_with_ss
        },
        "income_analysis": {
            "annual_dividend_income": round(annual_income, 2),
            "expenses_at_withdrawal": round(expenses_at_withdrawal, 2),
            "income_gap_before_ss": round(income_gap_before_ss, 2),
            "expenses_at_ss_start": round(expenses_at_ss_start, 2),
            "social_security_annual": round(ss_annual_at_start, 2),
            "net_expenses_with_ss": round(net_expenses_with_ss, 2),
            "income_gap_after_ss": round(income_gap_after_ss, 2),
            "income_sufficient_before_ss": income_sufficient_before_ss,
            "income_sufficient_after_ss": income_sufficient_after_ss
        },
        "projections": {
            "portfolio_at_withdrawal": round(portfolio_at_withdrawal, 2),
            "final_portfolio_value": round(final_portfolio_value, 2),
            "surplus_or_deficit": round(final_portfolio_value - target_portfolio_value, 2),
            "target_met": target_met
        },
        "metrics": {
            "progress_to_target_percentage": round(progress_to_target, 2),
            "required_growth_rate": round(required_growth_rate, 4),
            "overall_success_score": calculate_success_score(
                income_sufficient_before_ss,
                income_sufficient_after_ss,
                target_met
            )
        }
    }


def calculate_success_score(income_before: bool, income_after: bool, target: bool) -> int:
    """Calculate overall success score (0-100)"""
    score = 0
    if income_before:
        score += 40
    if income_after:
        score += 30
    if target:
        score += 30
    return score


@router.post("/scenario/analyze")
async def analyze_scenario(scenario: ScenarioInput, db: Session = Depends(get_db)):
    """
    Analyze a what-if scenario with custom parameters.
    Returns detailed projections and comparison to baseline.
    """
    # Run scenario
    scenario_result = run_scenario_calculation(db, scenario)

    # Run baseline (current settings)
    baseline_result = run_scenario_calculation(db, ScenarioInput())

    # Calculate differences
    differences = {
        "portfolio_value_diff": round(scenario_result["projections"]["final_portfolio_value"] - baseline_result["projections"]["final_portfolio_value"], 2),
        "income_gap_before_ss_diff": round(scenario_result["income_analysis"]["income_gap_before_ss"] - baseline_result["income_analysis"]["income_gap_before_ss"], 2),
        "success_score_diff": scenario_result["metrics"]["overall_success_score"] - baseline_result["metrics"]["overall_success_score"]
    }

    return {
        "scenario": scenario_result,
        "baseline": baseline_result,
        "differences": differences,
        "recommendation": generate_scenario_recommendation(scenario_result, differences)
    }


def generate_scenario_recommendation(result: dict, differences: dict) -> str:
    """Generate a recommendation based on scenario results"""
    score = result["metrics"]["overall_success_score"]

    if score >= 90:
        return "Excellent scenario! All retirement goals are met with this configuration."
    elif score >= 70:
        return "Good scenario. Most goals are achievable, but consider increasing income or reducing expenses."
    elif score >= 50:
        return "Moderate concerns. Significant adjustments needed to meet retirement goals."
    else:
        return "High risk scenario. Major changes required to achieve financial security in retirement."


@router.get("/scenario/presets")
async def get_scenario_presets(db: Session = Depends(get_db)):
    """Get pre-defined scenarios to test"""
    config = db.query(RetirementConfig).first()
    accounts = db.query(BrokerageAccount).all()
    current_net_worth = sum(acc.current_balance for acc in accounts)

    categories = db.query(ExpenseCategory).all()
    annual_expenses = sum(cat.annual_amount for cat in categories)

    presets = [
        {
            "name": "Conservative (3% growth, 2.5% yield)",
            "description": "Lower return assumptions for market downturns",
            "scenario": ScenarioInput(
                portfolio_growth_rate=0.03,
                portfolio_yield=0.025,
                inflation_rate=0.035
            )
        },
        {
            "name": "Optimistic (8% growth, 4.5% yield)",
            "description": "Higher returns in favorable market conditions",
            "scenario": ScenarioInput(
                portfolio_growth_rate=0.08,
                portfolio_yield=0.045,
                inflation_rate=0.025
            )
        },
        {
            "name": "Retire Earlier (Age 53)",
            "description": "Retire 2 years earlier than planned",
            "scenario": ScenarioInput(
                withdrawal_start_age=53
            )
        },
        {
            "name": "Retire Later (Age 60)",
            "description": "Delay retirement for more growth",
            "scenario": ScenarioInput(
                withdrawal_start_age=60
            )
        },
        {
            "name": "Higher Expenses (+25%)",
            "description": "Test with 25% higher annual expenses",
            "scenario": ScenarioInput(
                annual_expenses=annual_expenses * 1.25
            )
        },
        {
            "name": "Lower Expenses (-25%)",
            "description": "Test with 25% lower annual expenses",
            "scenario": ScenarioInput(
                annual_expenses=annual_expenses * 0.75
            )
        }
    ]

    return {"presets": presets}
