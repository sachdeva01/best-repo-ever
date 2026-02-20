from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from database import get_db
from schemas import ModelPortfolioRequest, ModelPortfolioResponse, AssetAllocation

router = APIRouter()


def generate_model_portfolio(required_yield: float) -> ModelPortfolioResponse:
    """
    Generate a model portfolio allocation to achieve the required yield.

    Asset classes with typical yield ranges:
    - High Dividend Stocks: 4-5%
    - REITs: 5-7%
    - Dividend Growth Stocks: 2-3%
    - Bonds/Fixed Income: 3-5%
    - Cash Equivalents: 4-5%
    """

    # Define asset classes with their expected yields
    asset_classes = {
        "High Dividend Stocks": {"min_yield": 0.04, "max_yield": 0.05, "default_yield": 0.045},
        "REITs": {"min_yield": 0.05, "max_yield": 0.07, "default_yield": 0.06},
        "Dividend Growth Stocks": {"min_yield": 0.02, "max_yield": 0.03, "default_yield": 0.025},
        "Bonds/Fixed Income": {"min_yield": 0.03, "max_yield": 0.05, "default_yield": 0.04},
        "Cash Equivalents": {"min_yield": 0.04, "max_yield": 0.05, "default_yield": 0.045}
    }

    allocations = []

    if required_yield <= 0.025:
        # Conservative allocation for low yield requirement
        allocations = [
            AssetAllocation(asset_class="Dividend Growth Stocks", allocation_percentage=40.0, expected_yield=0.025),
            AssetAllocation(asset_class="Bonds/Fixed Income", allocation_percentage=35.0, expected_yield=0.04),
            AssetAllocation(asset_class="High Dividend Stocks", allocation_percentage=15.0, expected_yield=0.045),
            AssetAllocation(asset_class="Cash Equivalents", allocation_percentage=10.0, expected_yield=0.045)
        ]
    elif required_yield <= 0.035:
        # Moderate allocation
        allocations = [
            AssetAllocation(asset_class="High Dividend Stocks", allocation_percentage=30.0, expected_yield=0.045),
            AssetAllocation(asset_class="Dividend Growth Stocks", allocation_percentage=25.0, expected_yield=0.025),
            AssetAllocation(asset_class="Bonds/Fixed Income", allocation_percentage=25.0, expected_yield=0.04),
            AssetAllocation(asset_class="REITs", allocation_percentage=15.0, expected_yield=0.06),
            AssetAllocation(asset_class="Cash Equivalents", allocation_percentage=5.0, expected_yield=0.045)
        ]
    elif required_yield <= 0.045:
        # Balanced allocation for moderate yield
        allocations = [
            AssetAllocation(asset_class="High Dividend Stocks", allocation_percentage=35.0, expected_yield=0.045),
            AssetAllocation(asset_class="REITs", allocation_percentage=25.0, expected_yield=0.06),
            AssetAllocation(asset_class="Dividend Growth Stocks", allocation_percentage=20.0, expected_yield=0.025),
            AssetAllocation(asset_class="Bonds/Fixed Income", allocation_percentage=15.0, expected_yield=0.04),
            AssetAllocation(asset_class="Cash Equivalents", allocation_percentage=5.0, expected_yield=0.045)
        ]
    else:
        # Aggressive allocation for high yield requirement
        allocations = [
            AssetAllocation(asset_class="REITs", allocation_percentage=35.0, expected_yield=0.06),
            AssetAllocation(asset_class="High Dividend Stocks", allocation_percentage=40.0, expected_yield=0.045),
            AssetAllocation(asset_class="Bonds/Fixed Income", allocation_percentage=15.0, expected_yield=0.04),
            AssetAllocation(asset_class="Dividend Growth Stocks", allocation_percentage=5.0, expected_yield=0.025),
            AssetAllocation(asset_class="Cash Equivalents", allocation_percentage=5.0, expected_yield=0.045)
        ]

    # Calculate weighted average yield
    weighted_yield = sum(
        (alloc.allocation_percentage / 100) * alloc.expected_yield
        for alloc in allocations
    )

    return ModelPortfolioResponse(
        required_yield=required_yield,
        allocations=allocations,
        weighted_average_yield=round(weighted_yield, 4)
    )


@router.post("/portfolio/model", response_model=ModelPortfolioResponse)
async def create_model_portfolio(
    request: ModelPortfolioRequest,
    db: Session = Depends(get_db)
):
    """
    Generate a model portfolio allocation to achieve the required dividend yield.

    The algorithm balances different asset classes to meet the yield target while
    considering risk and diversification.
    """
    return generate_model_portfolio(request.required_yield)


@router.get("/portfolio/allocation")
async def get_recommended_allocation(db: Session = Depends(get_db)):
    """
    Get recommended asset allocation based on current retirement needs.

    This endpoint calculates the required yield from retirement config and
    generates an appropriate model portfolio.
    """
    from models import RetirementConfig, BrokerageAccount, ExpenseCategory

    # Get retirement config
    config = db.query(RetirementConfig).first()
    if not config:
        return {"error": "Retirement config not found"}

    # Calculate current net worth
    accounts = db.query(BrokerageAccount).all()
    current_net_worth = sum(acc.current_balance for acc in accounts)

    # Calculate annual expenses
    if config.annual_expenses_override:
        annual_expenses = config.annual_expenses_override
    else:
        categories = db.query(ExpenseCategory).all()
        annual_expenses = sum(cat.annual_amount for cat in categories)

    # Calculate required yield at withdrawal start (age 55)
    years_to_withdrawal = config.withdrawal_start_age - config.current_age
    expenses_at_55 = annual_expenses * ((1 + config.inflation_rate) ** years_to_withdrawal)
    required_yield = (expenses_at_55 / current_net_worth) if current_net_worth > 0 else 0.035

    # Generate model portfolio
    model = generate_model_portfolio(required_yield)

    return {
        "current_net_worth": current_net_worth,
        "annual_expenses_at_withdrawal": round(expenses_at_55, 2),
        "required_yield": round(required_yield, 4),
        "model_portfolio": model
    }
