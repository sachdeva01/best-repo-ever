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
    portfolio_growth_rate: Optional[float] = None  # Used only when two-sleeve is disabled

    # Retirement assumptions
    current_age: Optional[int] = None
    withdrawal_start_age: Optional[int] = None
    social_security_start_age: Optional[int] = None
    target_age: Optional[int] = None
    target_portfolio_value: Optional[float] = None

    # Income assumptions
    target_gross_income: Optional[float] = None
    blended_tax_rate: Optional[float] = None
    annual_expenses: Optional[float] = None
    social_security_monthly: Optional[float] = None

    # Economic assumptions
    inflation_rate: Optional[float] = None

    # Two-sleeve parameters (set income_sleeve_pct > 0 to enable)
    income_sleeve_pct: Optional[float] = None       # e.g. 0.72 = 72% in income sleeve
    dividend_growth_rate: Optional[float] = None    # Annual yield growth on income sleeve (default 3.5%)
    growth_sleeve_return: Optional[float] = None    # Annual return of growth sleeve (default 6.5%)


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

    # Resolve two-sleeve parameters (fall back to config if available)
    config = db.query(RetirementConfig).first()
    income_sleeve_pct = scenario.income_sleeve_pct
    dividend_growth_rate = scenario.dividend_growth_rate
    growth_sleeve_return = scenario.growth_sleeve_return
    if income_sleeve_pct is None:
        income_sleeve_pct = getattr(config, 'income_sleeve_pct', 0.0) or 0.0
    if dividend_growth_rate is None:
        dividend_growth_rate = getattr(config, 'dividend_growth_rate', 0.035) or 0.035
    if growth_sleeve_return is None:
        growth_sleeve_return = getattr(config, 'growth_sleeve_return', 0.065) or 0.065

    two_sleeve = income_sleeve_pct > 0

    if two_sleeve:
        # --- Two-Sleeve Projection ---
        # Income sleeve: fixed principal, yield grows via dividend growth
        # Growth sleeve: compounds at growth_sleeve_return, receives surplus each year
        income_sleeve = portfolio_at_withdrawal * income_sleeve_pct
        growth_sleeve = portfolio_at_withdrawal * (1 - income_sleeve_pct)

        for year in range(years_in_retirement):
            age = withdrawal_start_age + year

            # Expenses grow with inflation
            year_expenses = expenses_at_withdrawal * ((1 + inflation_rate) ** year)

            # Income sleeve yield grows via dividend growth (SCHD, VIG effect)
            year_gross_income = income_sleeve * portfolio_yield * ((1 + dividend_growth_rate) ** year)
            year_net_income = year_gross_income * (1 - blended_tax_rate)

            # SS income inflation-adjusted from SS start
            year_ss_income = 0.0
            if age >= social_security_start_age:
                years_since_ss = age - social_security_start_age
                year_ss_income = ss_annual_at_start * ((1 + inflation_rate) ** years_since_ss)

            # Net cash flow after expenses
            year_total_income = year_net_income + year_ss_income
            year_net_cash_flow = year_total_income - year_expenses

            # Surplus → reinvested into growth sleeve; deficit → drawn from growth sleeve
            growth_sleeve += year_net_cash_flow

            # Growth sleeve compounds at growth_sleeve_return
            growth_sleeve *= (1 + growth_sleeve_return)

        final_portfolio_value = income_sleeve + growth_sleeve
    else:
        # --- Single Portfolio Projection (original logic) ---
        projected_portfolio = portfolio_at_withdrawal
        for year in range(years_in_retirement):
            age = withdrawal_start_age + year

            year_expenses = expenses_at_withdrawal * ((1 + inflation_rate) ** year)
            year_dividend_income = projected_portfolio * portfolio_yield

            year_ss_income = 0
            if age >= social_security_start_age:
                years_since_ss = age - social_security_start_age
                year_ss_income = ss_annual_at_start * ((1 + inflation_rate) ** years_since_ss)

            year_total_income = year_dividend_income + year_ss_income
            year_net_cash_flow = year_total_income - year_expenses
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


@router.get("/scenario/crisis")
async def get_crisis_scenario(db: Session = Depends(get_db)):
    """
    Model a 2007-2008 financial crisis applied to the current portfolio.
    Returns year-by-year impact on portfolio value, income, expenses, and cushion needed.
    """
    accounts = db.query(BrokerageAccount).all()
    config = db.query(RetirementConfig).first()
    categories = db.query(ExpenseCategory).all()

    total_investments = sum(acc.investments or 0 for acc in accounts)
    total_cash = sum(acc.cash or 0 for acc in accounts)
    total_portfolio = total_investments + total_cash

    current_age = config.current_age if config else 51
    retirement_age = config.withdrawal_start_age if config else 55
    inflation_rate = config.inflation_rate if config else 0.03
    annual_expenses_today = sum(cat.annual_amount for cat in categories) if categories else 250000
    tax_rate = 0.20

    equity_yield_normal = 0.028
    cash_yield_normal = 0.0365

    # Actual S&P 500 year-by-year returns + yield/rate environment during 2007-2008 crisis
    crisis_params = [
        ("pre-crash",   0.055,  equity_yield_normal,        cash_yield_normal),
        ("crash",      -0.370,  equity_yield_normal * 0.78, 0.015),
        ("bottom",      0.265,  equity_yield_normal * 0.72, 0.002),
        ("recovery 1",  0.151,  equity_yield_normal * 0.82, 0.002),
        ("recovery 2",  0.021,  equity_yield_normal * 0.90, 0.002),
        ("recovery 3",  0.160,  equity_yield_normal * 0.95, 0.003),
        ("full recovery", 0.324, equity_yield_normal,       0.005),
        ("post-recovery 1", 0.135, equity_yield_normal,     0.010),
        ("post-recovery 2", 0.012, equity_yield_normal,     0.015),
        ("post-recovery 3", 0.210, equity_yield_normal,     0.020),
    ]

    inv = total_investments
    cash = total_cash
    years = []
    cumulative_cushion = 0
    self_sufficient_age = None

    for i, (phase, eq_ret, eq_yld, cash_yld) in enumerate(crisis_params):
        age = current_age + i + 1
        inv = inv * (1 + eq_ret)
        portfolio = inv + cash

        gross_income = (inv * eq_yld) + (cash * cash_yld)
        net_income = gross_income * (1 - tax_rate)

        yr_expenses = annual_expenses_today * ((1 + inflation_rate) ** (i + 1))
        retired = age >= retirement_age
        annual_gap = max(0, yr_expenses - net_income) if retired else 0
        cumulative_cushion += annual_gap

        if retired and net_income >= yr_expenses and self_sufficient_age is None:
            self_sufficient_age = age

        years.append({
            "year": i + 1,
            "age": age,
            "phase": phase,
            "retired": retired,
            "portfolio": round(portfolio, 0),
            "investments": round(inv, 0),
            "cash": round(cash, 0),
            "gross_income": round(gross_income, 0),
            "net_income": round(net_income, 0),
            "expenses": round(yr_expenses, 0),
            "annual_gap": round(annual_gap, 0),
            "cumulative_cushion": round(cumulative_cushion, 0),
            "self_sufficient": net_income >= yr_expenses if retired else None,
            "equity_return": eq_ret,
            "equity_yield": round(eq_yld, 4),
            "cash_yield": round(cash_yld, 4),
        })

        if self_sufficient_age is not None:
            break

    # Baseline at retirement (no crash)
    years_to_retirement = retirement_age - current_age
    baseline_portfolio = total_portfolio * ((1.06) ** years_to_retirement)
    baseline_gross = baseline_portfolio * 0.0371
    baseline_net = baseline_gross * (1 - tax_rate)
    expenses_at_retirement = annual_expenses_today * ((1 + inflation_rate) ** years_to_retirement)

    crash_at_retirement = next((y for y in years if y["age"] == retirement_age), None)

    return {
        "summary": {
            "starting_portfolio": round(total_portfolio, 0),
            "investments": round(total_investments, 0),
            "cash": round(total_cash, 0),
            "cash_pct": round(total_cash / total_portfolio * 100, 1) if total_portfolio > 0 else 0,
            "current_age": current_age,
            "retirement_age": retirement_age,
            "total_cushion_needed": round(cumulative_cushion, 0),
            "cushion_with_buffer": round(cumulative_cushion * 1.20, 0),
            "cash_sufficient": total_cash >= cumulative_cushion * 1.20,
            "remaining_cash_after": round(total_cash - cumulative_cushion, 0),
            "self_sufficient_age": self_sufficient_age,
        },
        "baseline_at_retirement": {
            "portfolio": round(baseline_portfolio, 0),
            "gross_income": round(baseline_gross, 0),
            "net_income": round(baseline_net, 0),
            "expenses": round(expenses_at_retirement, 0),
        },
        "crash_at_retirement": crash_at_retirement,
        "years": years,
    }


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
            "name": "⭐ PRIMARY: TWO-SLEEVE @ 53 - Balanced 4.5% (RECOMMENDED)",
            "description": "PRIMARY PLAN. Add $400K over 2 yrs ($200K/yr). Portfolio: $9.7M. Income: $7.0M @ 4.5% (72%), Growth: $2.7M (28%). Dividend yield grows 3.5%/yr. $275K/yr expenses.",
            "scenario": ScenarioInput(
                portfolio_value=9700000.0,
                portfolio_yield=0.045,
                income_sleeve_pct=0.72,
                dividend_growth_rate=0.035,
                growth_sleeve_return=0.065,
                target_gross_income=316000.0,
                blended_tax_rate=0.13,
                current_age=51,
                withdrawal_start_age=53,
                social_security_start_age=67,
                target_age=90,
                annual_expenses=275000.0,
                target_portfolio_value=49000000.0
            )
        },
        {
            "name": "⭐ PRIMARY: TWO-SLEEVE @ 53 - Conservative 4% (Safer)",
            "description": "PRIMARY PLAN (safer). Portfolio: $9.7M. Income: $7.9M @ 4% (81%), Growth: $1.8M (19%). Dividend yield grows 3.5%/yr. $275K/yr expenses.",
            "scenario": ScenarioInput(
                portfolio_value=9700000.0,
                portfolio_yield=0.04,
                income_sleeve_pct=0.81,
                dividend_growth_rate=0.035,
                growth_sleeve_return=0.065,
                target_gross_income=316000.0,
                blended_tax_rate=0.13,
                current_age=51,
                withdrawal_start_age=53,
                social_security_start_age=67,
                target_age=90,
                annual_expenses=275000.0,
                target_portfolio_value=44000000.0
            )
        },
        {
            "name": "⚠️ WORST CASE: TWO-SLEEVE @ 53 - Wife Retires at 55",
            "description": "Worst case: wife retires 55 (not 59). Only 2yr income bridge. Growth sleeve $3.7M at age 55. Dividend yield grows 3.5%/yr. Total estate ~$32M at 90. Still safe.",
            "scenario": ScenarioInput(
                portfolio_value=9700000.0,
                portfolio_yield=0.045,
                income_sleeve_pct=0.72,
                dividend_growth_rate=0.035,
                growth_sleeve_return=0.065,
                target_gross_income=316000.0,
                blended_tax_rate=0.13,
                current_age=51,
                withdrawal_start_age=55,
                social_security_start_age=67,
                target_age=90,
                annual_expenses=275000.0,
                target_portfolio_value=32000000.0
            )
        },
        {
            "name": "🔵 BACKUP: TWO-SLEEVE @ 57 - Conservative 4% (Spreadsheet)",
            "description": "BACKUP PLAN. Income: $7.9M @ 4% (62%), Growth: $4.8M (38%). Add $900K over 6 yrs. Dividend yield grows 3.5%/yr. $316K/yr gross income. $275K/yr expenses.",
            "scenario": ScenarioInput(
                portfolio_value=12700000.0,
                portfolio_yield=0.04,
                income_sleeve_pct=0.62,
                dividend_growth_rate=0.035,
                growth_sleeve_return=0.065,
                target_gross_income=316000.0,
                blended_tax_rate=0.13,
                current_age=51,
                withdrawal_start_age=57,
                social_security_start_age=67,
                target_age=90,
                annual_expenses=275000.0,
                target_portfolio_value=40000000.0
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
