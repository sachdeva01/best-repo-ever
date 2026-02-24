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
    target_gross_income: Optional[float] = None  # Target gross income at retirement
    blended_tax_rate: Optional[float] = None  # Blended tax rate (e.g., 0.20 for 20%)
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

    # Tax calculations
    target_gross_income = scenario.target_gross_income if scenario.target_gross_income is not None else None
    blended_tax_rate = scenario.blended_tax_rate if scenario.blended_tax_rate is not None else 0.20

    if target_gross_income:
        gross_income = annual_income
        tax_on_income = gross_income * blended_tax_rate
        net_income_after_tax = gross_income - tax_on_income
        target_net_income = target_gross_income * (1 - blended_tax_rate)
        income_meets_target = gross_income >= target_gross_income
    else:
        gross_income = annual_income
        tax_on_income = gross_income * blended_tax_rate
        net_income_after_tax = gross_income - tax_on_income
        target_net_income = None
        income_meets_target = None

    income_gap_before_ss = expenses_at_withdrawal - net_income_after_tax
    income_gap_after_ss = net_expenses_with_ss - net_income_after_tax

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

    # Calculate success metrics (use net income after tax)
    income_sufficient_before_ss = net_income_after_tax >= expenses_at_withdrawal
    income_sufficient_after_ss = net_income_after_tax >= net_expenses_with_ss if net_expenses_with_ss > 0 else True
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
            "gross_income": round(gross_income, 2),
            "blended_tax_rate": round(blended_tax_rate, 4),
            "tax_on_income": round(tax_on_income, 2),
            "net_income_after_tax": round(net_income_after_tax, 2),
            "target_gross_income": round(target_gross_income, 2) if target_gross_income else None,
            "target_net_income": round(target_net_income, 2) if target_net_income else None,
            "income_meets_target": income_meets_target,
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
    portfolio_value_diff = round(scenario_result["projections"]["final_portfolio_value"] - baseline_result["projections"]["final_portfolio_value"], 2)
    income_gap_before_ss_diff = round(scenario_result["income_analysis"]["income_gap_before_ss"] - baseline_result["income_analysis"]["income_gap_before_ss"], 2)
    success_score_diff = scenario_result["metrics"]["overall_success_score"] - baseline_result["metrics"]["overall_success_score"]

    # Generate insights based on differences
    insights = []
    if abs(portfolio_value_diff) > 1000000:
        direction = "higher" if portfolio_value_diff > 0 else "lower"
        insights.append(f"This scenario results in a portfolio value {formatCurrency(abs(portfolio_value_diff))} {direction} than baseline.")

    if scenario_result["income_analysis"]["income_sufficient_before_ss"] != baseline_result["income_analysis"]["income_sufficient_before_ss"]:
        if scenario_result["income_analysis"]["income_sufficient_before_ss"]:
            insights.append("This scenario achieves income sufficiency before Social Security (improved from baseline).")
        else:
            insights.append("Warning: This scenario results in insufficient income before Social Security.")

    if success_score_diff > 0:
        insights.append(f"Overall success probability improved by {success_score_diff} points compared to baseline.")
    elif success_score_diff < 0:
        insights.append(f"Overall success probability decreased by {abs(success_score_diff)} points compared to baseline.")

    # Generate recommendations
    recommendations = []
    recommendation_text = generate_scenario_recommendation(scenario_result, {"portfolio_value_diff": portfolio_value_diff})

    if scenario_result["metrics"]["overall_success_score"] < 80:
        if scenario_result["income_analysis"]["income_gap_before_ss"] > 0:
            recommendations.append("Consider increasing portfolio yield or reducing expenses to close the income gap.")
        if not scenario_result["projections"]["target_met"]:
            recommendations.append("Consider delaying retirement or increasing contribution rate to meet target portfolio value.")
        if scenario_result["inputs"]["portfolio_growth_rate"] > 0.07:
            recommendations.append("Growth rate assumptions may be optimistic. Consider stress-testing with more conservative rates.")

    # Transform to frontend expected format
    return {
        "success_score": scenario_result["metrics"]["overall_success_score"],
        "comparison": {
            "baseline": {
                "net_worth": baseline_result["inputs"]["portfolio_value"],
                "annual_income": baseline_result["income_analysis"]["net_income_after_tax"],
                "required_yield": baseline_result["income_analysis"]["expenses_at_withdrawal"] / baseline_result["inputs"]["portfolio_value"] if baseline_result["inputs"]["portfolio_value"] > 0 else 0,
                "income_sufficient": baseline_result["income_analysis"]["income_sufficient_before_ss"],
                "on_track": baseline_result["projections"]["target_met"]
            },
            "scenario": {
                "net_worth": scenario_result["inputs"]["portfolio_value"],
                "annual_income": scenario_result["income_analysis"]["net_income_after_tax"],
                "required_yield": scenario_result["income_analysis"]["expenses_at_withdrawal"] / scenario_result["inputs"]["portfolio_value"] if scenario_result["inputs"]["portfolio_value"] > 0 else 0,
                "income_sufficient": scenario_result["income_analysis"]["income_sufficient_before_ss"],
                "on_track": scenario_result["projections"]["target_met"]
            }
        },
        "insights": insights,
        "recommendations": recommendations if recommendations else [recommendation_text],
        "scenario_details": {
            "portfolio_value": scenario_result["inputs"]["portfolio_value"],
            "portfolio_yield": scenario_result["inputs"]["portfolio_yield"],
            "portfolio_growth_rate": scenario_result["inputs"]["portfolio_growth_rate"],
            "years_to_withdrawal": scenario_result["timeline"]["years_to_withdrawal"],
            "years_in_retirement": scenario_result["timeline"]["years_in_retirement"],
            "inflation_rate": scenario_result["inputs"]["inflation_rate"]
        },
        "income_details": {
            "gross_income": scenario_result["income_analysis"]["gross_income"],
            "blended_tax_rate": scenario_result["income_analysis"]["blended_tax_rate"],
            "tax_on_income": scenario_result["income_analysis"]["tax_on_income"],
            "net_income_after_tax": scenario_result["income_analysis"]["net_income_after_tax"],
            "target_gross_income": scenario_result["income_analysis"]["target_gross_income"],
            "target_net_income": scenario_result["income_analysis"]["target_net_income"],
            "income_meets_target": scenario_result["income_analysis"]["income_meets_target"]
        }
    }


def formatCurrency(value):
    """Helper to format currency for insights"""
    return f"${abs(value):,.0f}"


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

    # Calculate split portfolio values
    total_investments = sum(acc.investments or 0 for acc in accounts)
    total_cash = sum(acc.cash or 0 for acc in accounts)

    # Calculate weighted cash yield
    cash_accounts = [acc for acc in accounts if (acc.cash or 0) > 0 and acc.dividend_yield]
    if cash_accounts:
        weighted_cash_yield = sum(acc.cash * acc.dividend_yield for acc in cash_accounts) / sum(acc.cash for acc in cash_accounts)
    else:
        weighted_cash_yield = 0.0365  # Default 3.65%

    categories = db.query(ExpenseCategory).all()
    annual_expenses = sum(cat.annual_amount for cat in categories)

    # Scenario 1: Retire at 53 with $250K added to investments
    # Years to grow: 2 (from age 51 to 53)
    investments_at_53 = (total_investments + 250000) * (1.08 ** 2)
    cash_at_53 = total_cash * ((1 + weighted_cash_yield) ** 2)
    portfolio_at_53 = investments_at_53 + cash_at_53

    # Calculate blended yield at 53
    # Investments portion yield (assuming ~2.5% dividend on investments)
    investment_yield_53 = 0.025
    cash_yield_53 = weighted_cash_yield
    blended_yield_53 = (investments_at_53 * investment_yield_53 + cash_at_53 * cash_yield_53) / portfolio_at_53

    # Scenario 2: Retire at 57 with $600K added to investments
    # Years to grow: 6 (from age 51 to 57)
    investments_at_57 = (total_investments + 600000) * (1.08 ** 6)
    cash_at_57 = total_cash * ((1 + weighted_cash_yield) ** 6)
    portfolio_at_57 = investments_at_57 + cash_at_57

    # Calculate blended yield at 57
    blended_yield_57 = (investments_at_57 * investment_yield_53 + cash_at_57 * cash_yield_53) / portfolio_at_57

    # Calculate projected income for both scenarios
    gross_income_53 = portfolio_at_53 * blended_yield_53
    net_income_53 = gross_income_53 * 0.80  # After 20% tax

    gross_income_57 = portfolio_at_57 * blended_yield_57
    net_income_57 = gross_income_57 * 0.80  # After 20% tax

    # OPTION 1: Pure yield increase strategy
    portfolio_option1 = portfolio_at_53
    yield_option1 = 0.0318  # 3.18% yield needed
    gross_income_option1 = portfolio_option1 * yield_option1
    net_income_option1 = gross_income_option1 * 0.80

    # OPTION 2: Balanced approach - add $500K more + modest yield increase
    investments_balanced = (total_investments + 750000) * (1.08 ** 2)  # $750K total instead of $250K
    cash_balanced = total_cash * ((1 + weighted_cash_yield) ** 2)
    portfolio_balanced = investments_balanced + cash_balanced
    yield_balanced = 0.0303  # 3.03% yield needed
    gross_income_balanced = portfolio_balanced * yield_balanced
    net_income_balanced = gross_income_balanced * 0.80

    # OPTION 3: Pure investment strategy - add $1.45M total
    investments_pure = (total_investments + 1451456) * (1.08 ** 2)
    cash_pure = total_cash * ((1 + weighted_cash_yield) ** 2)
    portfolio_pure = investments_pure + cash_pure
    # Recalculate blended yield with new amounts
    yield_pure = (investments_pure * 0.025 + cash_pure * weighted_cash_yield) / portfolio_pure
    gross_income_pure = portfolio_pure * yield_pure
    net_income_pure = gross_income_pure * 0.80

    presets = [
        {
            "name": "🎯 Retire at 53 - Current Plan (+$250K)",
            "description": f"Falls SHORT of target. Portfolio: ${portfolio_at_53:,.0f} → Gross: ${gross_income_53:,.0f} (Need $320K)",
            "scenario": ScenarioInput(
                portfolio_value=round(portfolio_at_53, 2),
                portfolio_yield=round(blended_yield_53, 4),
                portfolio_growth_rate=0.065,
                target_gross_income=320000.0,
                blended_tax_rate=0.20,
                current_age=51,
                withdrawal_start_age=53,
                social_security_start_age=67,
                target_age=90
            )
        },
        {
            "name": "✅ Option 1: Increase Yield to 3.18%",
            "description": f"Keep portfolio ${portfolio_option1:,.0f}, boost yield to 3.18%. Gross: ${gross_income_option1:,.0f} ✓",
            "scenario": ScenarioInput(
                portfolio_value=round(portfolio_option1, 2),
                portfolio_yield=round(yield_option1, 4),
                portfolio_growth_rate=0.065,
                target_gross_income=320000.0,
                blended_tax_rate=0.20,
                current_age=51,
                withdrawal_start_age=53,
                social_security_start_age=67,
                target_age=90
            )
        },
        {
            "name": "✅ Option 2: Add $500K + 3.03% Yield (RECOMMENDED)",
            "description": f"Balanced approach. Portfolio: ${portfolio_balanced:,.0f} at 3.03% → Gross: ${gross_income_balanced:,.0f} ✓",
            "scenario": ScenarioInput(
                portfolio_value=round(portfolio_balanced, 2),
                portfolio_yield=round(yield_balanced, 4),
                portfolio_growth_rate=0.065,
                target_gross_income=320000.0,
                blended_tax_rate=0.20,
                current_age=51,
                withdrawal_start_age=53,
                social_security_start_age=67,
                target_age=90
            )
        },
        {
            "name": "✅ Option 3: Add $1.45M (No Yield Change)",
            "description": f"Pure investment strategy. Portfolio: ${portfolio_pure:,.0f} → Gross: ${gross_income_pure:,.0f} ✓",
            "scenario": ScenarioInput(
                portfolio_value=round(portfolio_pure, 2),
                portfolio_yield=round(yield_pure, 4),
                portfolio_growth_rate=0.065,
                target_gross_income=320000.0,
                blended_tax_rate=0.20,
                current_age=51,
                withdrawal_start_age=53,
                social_security_start_age=67,
                target_age=90
            )
        },
        {
            "name": "🎯 Retire at 57 (+$600K) - Original Plan",
            "description": f"Target: $320K gross income. Portfolio: ${portfolio_at_57:,.0f} → Gross: ${gross_income_57:,.0f}, Net (20% tax): ${net_income_57:,.0f}",
            "scenario": ScenarioInput(
                portfolio_value=round(portfolio_at_57, 2),
                portfolio_yield=round(blended_yield_57, 4),
                portfolio_growth_rate=0.065,  # Blended growth rate
                target_gross_income=320000.0,
                blended_tax_rate=0.20,
                current_age=51,
                withdrawal_start_age=57,
                social_security_start_age=67,
                target_age=90
            )
        },
        {
            "name": "🎯 TWO-SLEEVE @ 53 - Balanced 4.5% Yield (RECOMMENDED)",
            "description": "Retire at 53! Income: $7.1M @ 4.5%, Growth: $3.0M. Add $750K total. Ends at $49.1M - BEST option!",
            "scenario": ScenarioInput(
                portfolio_value=10118677.0,
                portfolio_yield=0.045,  # 4.5% balanced yield
                portfolio_growth_rate=0.04,
                target_gross_income=320000.0,
                blended_tax_rate=0.20,
                current_age=51,
                withdrawal_start_age=53,
                social_security_start_age=67,
                target_age=90,
                annual_expenses=225000.0,
                target_portfolio_value=49080902.0
            )
        },
        {
            "name": "🎯 TWO-SLEEVE @ 53 - Aggressive 5% Yield",
            "description": "Retire at 53 with high yield! Income: $6.4M @ 5%, Growth: $3.7M. Add $750K. Ends at $54.8M!",
            "scenario": ScenarioInput(
                portfolio_value=10118677.0,
                portfolio_yield=0.05,  # 5% aggressive yield
                portfolio_growth_rate=0.04,
                target_gross_income=320000.0,
                blended_tax_rate=0.20,
                current_age=51,
                withdrawal_start_age=53,
                social_security_start_age=67,
                target_age=90,
                annual_expenses=225000.0,
                target_portfolio_value=54792651.0
            )
        },
        {
            "name": "🎯 TWO-SLEEVE @ 54 - Balanced 4.5% Yield",
            "description": "Retire at 54! Income: $7.1M @ 4.5%, Growth: $3.4M. Add $750K over 3 yrs. Ends at $48.6M!",
            "scenario": ScenarioInput(
                portfolio_value=10508224.0,
                portfolio_yield=0.045,
                portfolio_growth_rate=0.04,
                target_gross_income=320000.0,
                blended_tax_rate=0.20,
                current_age=51,
                withdrawal_start_age=54,
                social_security_start_age=67,
                target_age=90,
                annual_expenses=225000.0,
                target_portfolio_value=48625102.0
            )
        },
        {
            "name": "🎯 TWO-SLEEVE @ 57 - Conservative 4% (SPREADSHEET)",
            "description": "Income: $7.5M @ 4%, Growth: $4.4M. Add $900K over 6 yrs. $300K/yr income. Ends at $39.6M.",
            "scenario": ScenarioInput(
                portfolio_value=11876690.0,
                portfolio_yield=0.04,
                portfolio_growth_rate=0.04,
                target_gross_income=300000.0,
                blended_tax_rate=0.20,
                current_age=51,
                withdrawal_start_age=57,
                social_security_start_age=67,
                target_age=90,
                annual_expenses=225000.0,
                target_portfolio_value=39602033.0
            )
        },
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
