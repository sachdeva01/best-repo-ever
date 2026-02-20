from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from database import get_db
from models import BrokerageAccount, ExpenseCategory, RetirementConfig, Holding, Expense
from schemas import (
    RetirementCalculationResponse,
    RetirementConfigUpdate,
    RetirementConfigResponse,
    ScenarioRequest
)

router = APIRouter()


def calculate_annual_expenses_from_actual(db: Session) -> float:
    """
    Calculate total annual expenses from actual expense records.
    - For recurring expenses: annualize based on recurrence period
    - For household expenses: include if they repeat
    - One-time expenses are excluded from annual budget calculations
    """
    expenses = db.query(Expense).all()
    total_annual = 0.0

    for expense in expenses:
        # Only include recurring expenses in annual calculations
        if expense.is_recurring:
            if expense.recurrence_period == "MONTHLY":
                total_annual += expense.amount * 12
            elif expense.recurrence_period == "QUARTERLY":
                total_annual += expense.amount * 4
            elif expense.recurrence_period == "YEARLY":
                total_annual += expense.amount
            elif expense.recurrence_period == "MULTI_YEAR" and expense.recurrence_interval_years:
                # Amortize over the interval (e.g., car every 5 years = amount / 5 per year)
                total_annual += expense.amount / expense.recurrence_interval_years

    return total_annual


def calculate_retirement_metrics(
    db: Session,
    config: RetirementConfig = None,
    scenario_params: ScenarioRequest = None
) -> RetirementCalculationResponse:
    """
    Calculate retirement metrics using capital preservation strategy.
    Can use either saved config or scenario parameters.
    """
    # Get or use config
    if config is None:
        config = db.query(RetirementConfig).first()
        if not config:
            raise HTTPException(status_code=404, detail="Retirement config not found")

    # Use scenario params if provided, otherwise use config
    current_age = scenario_params.current_age if scenario_params and scenario_params.current_age else config.current_age
    withdrawal_start_age = scenario_params.withdrawal_start_age if scenario_params and scenario_params.withdrawal_start_age else config.withdrawal_start_age
    social_security_start_age = scenario_params.social_security_start_age if scenario_params and scenario_params.social_security_start_age else config.social_security_start_age
    target_age = scenario_params.target_age if scenario_params and scenario_params.target_age else config.target_age
    target_portfolio_value = scenario_params.target_portfolio_value if scenario_params and scenario_params.target_portfolio_value else config.target_portfolio_value
    inflation_rate = scenario_params.inflation_rate if scenario_params and scenario_params.inflation_rate else config.inflation_rate
    expected_dividend_yield = scenario_params.expected_dividend_yield if scenario_params and scenario_params.expected_dividend_yield else config.expected_dividend_yield
    estimated_social_security_monthly = scenario_params.estimated_social_security_monthly if scenario_params and scenario_params.estimated_social_security_monthly else config.estimated_social_security_monthly

    # Calculate current net worth
    accounts = db.query(BrokerageAccount).all()
    current_net_worth = sum(acc.current_balance for acc in accounts)

    # Calculate current portfolio dividend yield
    total_holdings_value = 0.0
    total_dividend_income = 0.0

    for account in accounts:
        holdings = db.query(Holding).filter(Holding.account_id == account.id).all()
        for holding in holdings:
            holding_value = holding.quantity * holding.price_per_share
            total_holdings_value += holding_value
            if holding.dividend_yield:
                total_dividend_income += holding_value * holding.dividend_yield

    current_portfolio_dividend_yield = (total_dividend_income / current_net_worth) if current_net_worth > 0 else 0.0
    current_annual_dividend_income = total_dividend_income

    # Calculate annual expenses
    if scenario_params and scenario_params.annual_expenses:
        annual_expenses = scenario_params.annual_expenses
    elif config.annual_expenses_override:
        annual_expenses = config.annual_expenses_override
    else:
        # Calculate from actual expense records
        annual_expenses = calculate_annual_expenses_from_actual(db)

    # Calculate years in different phases
    years_to_withdrawal = withdrawal_start_age - current_age
    years_before_ss = social_security_start_age - withdrawal_start_age
    years_with_ss = target_age - social_security_start_age
    years_in_retirement = target_age - withdrawal_start_age

    # Calculate inflation-adjusted expenses
    expenses_at_55 = annual_expenses * ((1 + inflation_rate) ** years_to_withdrawal)

    # Calculate Social Security income at age 67 (adjusted for inflation)
    annual_social_security_at_67 = (estimated_social_security_monthly * 12) * (
        (1 + inflation_rate) ** (social_security_start_age - current_age)
    )

    # Phase 1: Ages 55-67 (before Social Security)
    expenses_at_67 = expenses_at_55 * ((1 + inflation_rate) ** years_before_ss)

    # Phase 2: Ages 67-90 (with Social Security)
    net_expenses_at_67 = expenses_at_67 - annual_social_security_at_67

    # Required dividend yields
    required_dividend_yield_at_55 = (expenses_at_55 / current_net_worth) if current_net_worth > 0 else 0.0
    required_dividend_yield_at_67 = (net_expenses_at_67 / current_net_worth) if current_net_worth > 0 else 0.0

    # Income gap
    dividend_income_gap = expenses_at_55 - current_annual_dividend_income

    # Capital target analysis
    progress_to_target_percentage = (current_net_worth / target_portfolio_value) * 100 if target_portfolio_value > 0 else 0.0
    gap_to_target = target_portfolio_value - current_net_worth

    # Required annual growth rate to reach target
    years_to_target = target_age - current_age
    if current_net_worth > 0 and years_to_target > 0:
        required_annual_growth_rate = (
            ((target_portfolio_value / current_net_worth) ** (1 / years_to_target)) - 1
        ) * 100
    else:
        required_annual_growth_rate = 0.0

    # Status flags
    income_sufficient_before_ss = current_annual_dividend_income >= expenses_at_55
    income_sufficient_after_ss = current_annual_dividend_income >= net_expenses_at_67 if net_expenses_at_67 > 0 else True

    # Simple on-track calculation (can be enhanced)
    on_track_for_target = progress_to_target_percentage >= 50.0  # At least 50% progress

    return RetirementCalculationResponse(
        current_net_worth=current_net_worth,
        current_age=current_age,
        withdrawal_start_age=withdrawal_start_age,
        social_security_start_age=social_security_start_age,
        target_age=target_age,
        target_portfolio_value=target_portfolio_value,
        current_annual_expenses=annual_expenses,
        expenses_at_withdrawal_start=expenses_at_55,
        current_portfolio_dividend_yield=current_portfolio_dividend_yield,
        current_annual_dividend_income=current_annual_dividend_income,
        required_dividend_yield_at_55=required_dividend_yield_at_55,
        required_dividend_yield_at_67=required_dividend_yield_at_67,
        dividend_income_gap=dividend_income_gap,
        estimated_social_security_annual=annual_social_security_at_67,
        years_before_social_security=years_before_ss,
        years_with_social_security=years_with_ss,
        net_expenses_with_social_security=net_expenses_at_67,
        progress_to_target_percentage=progress_to_target_percentage,
        gap_to_target=gap_to_target,
        required_annual_growth_rate=required_annual_growth_rate,
        years_to_withdrawal=years_to_withdrawal,
        years_in_retirement=years_in_retirement,
        inflation_rate=inflation_rate,
        income_sufficient_before_ss=income_sufficient_before_ss,
        income_sufficient_after_ss=income_sufficient_after_ss,
        on_track_for_target=on_track_for_target
    )


@router.get("/retirement/calculation", response_model=RetirementCalculationResponse)
async def get_retirement_calculation(db: Session = Depends(get_db)):
    """Calculate current retirement metrics based on saved configuration"""
    return calculate_retirement_metrics(db)


@router.post("/retirement/scenario", response_model=RetirementCalculationResponse)
async def calculate_scenario(
    scenario: ScenarioRequest,
    db: Session = Depends(get_db)
):
    """Calculate retirement metrics for a what-if scenario without saving"""
    return calculate_retirement_metrics(db, scenario_params=scenario)


@router.get("/retirement/config", response_model=RetirementConfigResponse)
async def get_retirement_config(db: Session = Depends(get_db)):
    """Get current retirement configuration"""
    config = db.query(RetirementConfig).first()
    if not config:
        raise HTTPException(status_code=404, detail="Retirement config not found")
    return config


@router.post("/retirement/config", response_model=RetirementConfigResponse)
async def update_retirement_config(
    config_update: RetirementConfigUpdate,
    db: Session = Depends(get_db)
):
    """Update retirement configuration"""
    config = db.query(RetirementConfig).first()
    if not config:
        raise HTTPException(status_code=404, detail="Retirement config not found")

    # Update only provided fields
    if config_update.current_age is not None:
        config.current_age = config_update.current_age
    if config_update.withdrawal_start_age is not None:
        config.withdrawal_start_age = config_update.withdrawal_start_age
    if config_update.social_security_start_age is not None:
        config.social_security_start_age = config_update.social_security_start_age
    if config_update.target_age is not None:
        config.target_age = config_update.target_age
    if config_update.target_portfolio_value is not None:
        config.target_portfolio_value = config_update.target_portfolio_value
    if config_update.inflation_rate is not None:
        config.inflation_rate = config_update.inflation_rate
    if config_update.annual_expenses_override is not None:
        config.annual_expenses_override = config_update.annual_expenses_override
    if config_update.expected_dividend_yield is not None:
        config.expected_dividend_yield = config_update.expected_dividend_yield
    if config_update.estimated_social_security_monthly is not None:
        config.estimated_social_security_monthly = config_update.estimated_social_security_monthly
    if config_update.qualified_dividend_tax_rate is not None:
        config.qualified_dividend_tax_rate = config_update.qualified_dividend_tax_rate
    if config_update.ordinary_income_tax_rate is not None:
        config.ordinary_income_tax_rate = config_update.ordinary_income_tax_rate

    db.commit()
    db.refresh(config)
    return config


@router.get("/retirement/projection")
async def get_retirement_projection(db: Session = Depends(get_db)):
    """Get retirement projection with year-by-year breakdown"""
    config = db.query(RetirementConfig).first()
    if not config:
        raise HTTPException(status_code=404, detail="Retirement config not found")

    # Get annual expenses
    categories = db.query(ExpenseCategory).all()
    annual_expenses = config.annual_expenses_override if config.annual_expenses_override else sum(
        cat.annual_amount for cat in categories
    )

    projection = []
    for year in range(config.target_age - config.current_age + 1):
        age = config.current_age + year
        years_from_now = year

        # Calculate inflation-adjusted expenses
        inflated_expenses = annual_expenses * ((1 + config.inflation_rate) ** years_from_now)

        # Calculate Social Security income if applicable
        ss_income = 0.0
        if age >= config.social_security_start_age:
            years_to_ss = config.social_security_start_age - config.current_age
            ss_income = (config.estimated_social_security_monthly * 12) * (
                (1 + config.inflation_rate) ** years_to_ss
            )
            # Adjust for inflation from SS start to current year
            if age > config.social_security_start_age:
                years_since_ss_start = age - config.social_security_start_age
                ss_income *= ((1 + config.inflation_rate) ** years_since_ss_start)

        net_expenses = inflated_expenses - ss_income

        projection.append({
            "age": age,
            "year": 2026 + years_from_now,  # Assuming current year is 2026
            "total_expenses": round(inflated_expenses, 2),
            "social_security_income": round(ss_income, 2),
            "net_expenses": round(net_expenses, 2),
            "in_retirement": age >= config.withdrawal_start_age
        })

    return {
        "projection": projection,
        "summary": {
            "total_years": len(projection),
            "retirement_years": sum(1 for p in projection if p["in_retirement"]),
            "years_before_ss": config.social_security_start_age - config.withdrawal_start_age,
            "years_with_ss": config.target_age - config.social_security_start_age
        }
    }
