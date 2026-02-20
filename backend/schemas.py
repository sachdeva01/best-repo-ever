from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime


# Account Schemas
class AccountBase(BaseModel):
    name: str
    brokerage_name: str
    account_type: str


class AccountCreate(AccountBase):
    current_balance: float = 0.0
    dividend_yield: Optional[float] = None


class AccountUpdate(BaseModel):
    name: Optional[str] = None
    current_balance: Optional[float] = None
    dividend_yield: Optional[float] = None


class AccountResponse(AccountBase):
    id: int
    current_balance: float
    dividend_yield: Optional[float]
    created_at: datetime
    updated_at: Optional[datetime]

    class Config:
        from_attributes = True


# Holding Schemas
class HoldingBase(BaseModel):
    symbol: str
    name: str
    asset_type: str
    quantity: float
    price_per_share: float
    dividend_yield: Optional[float] = None


class HoldingCreate(HoldingBase):
    account_id: int


class HoldingUpdate(BaseModel):
    quantity: Optional[float] = None
    price_per_share: Optional[float] = None
    dividend_yield: Optional[float] = None


class HoldingResponse(HoldingBase):
    id: int
    account_id: int
    total_value: float
    last_updated: datetime

    class Config:
        from_attributes = True


# Account Snapshot Schemas
class SnapshotCreate(BaseModel):
    balance: float
    snapshot_date: datetime
    notes: Optional[str] = None


class SnapshotResponse(BaseModel):
    id: int
    account_id: int
    balance: float
    snapshot_date: datetime
    notes: Optional[str]

    class Config:
        from_attributes = True


# Expense Category Schemas
class CategoryBase(BaseModel):
    name: str
    description: Optional[str] = None
    annual_amount: float = 0.0


class CategoryUpdate(BaseModel):
    annual_amount: float


class CategoryResponse(CategoryBase):
    id: int

    class Config:
        from_attributes = True


# Expense Schemas
class ExpenseBase(BaseModel):
    amount: float
    description: Optional[str] = None
    expense_date: datetime
    is_recurring: bool = False
    recurrence_period: Optional[str] = None  # MONTHLY, QUARTERLY, YEARLY, MULTI_YEAR
    recurrence_interval_years: Optional[int] = None  # For multi-year recurrence (e.g., 5 for every 5 years)
    expense_type: str = "HOUSEHOLD"  # HOUSEHOLD, ONE_TIME, RECURRING


class ExpenseCreate(ExpenseBase):
    category_id: int


class ExpenseUpdate(BaseModel):
    amount: Optional[float] = None
    description: Optional[str] = None
    category_id: Optional[int] = None
    expense_date: Optional[datetime] = None
    is_recurring: Optional[bool] = None
    recurrence_period: Optional[str] = None
    recurrence_interval_years: Optional[int] = None
    expense_type: Optional[str] = None


class ExpenseResponse(ExpenseBase):
    id: int
    category_id: int
    created_at: datetime

    class Config:
        from_attributes = True


# Retirement Config Schemas
class RetirementConfigUpdate(BaseModel):
    current_age: Optional[int] = None
    withdrawal_start_age: Optional[int] = None
    social_security_start_age: Optional[int] = None
    target_age: Optional[int] = None
    target_portfolio_value: Optional[float] = None
    inflation_rate: Optional[float] = None
    annual_expenses_override: Optional[float] = None
    expected_dividend_yield: Optional[float] = None
    estimated_social_security_monthly: Optional[float] = None
    qualified_dividend_tax_rate: Optional[float] = None
    ordinary_income_tax_rate: Optional[float] = None


class RetirementConfigResponse(BaseModel):
    id: int
    current_age: int
    withdrawal_start_age: int
    social_security_start_age: int
    target_age: int
    target_portfolio_value: float
    inflation_rate: float
    annual_expenses_override: Optional[float]
    expected_dividend_yield: float
    estimated_social_security_monthly: float
    qualified_dividend_tax_rate: float
    ordinary_income_tax_rate: float
    created_at: datetime
    updated_at: Optional[datetime]

    class Config:
        from_attributes = True


# Retirement Calculation Response
class RetirementCalculationResponse(BaseModel):
    current_net_worth: float
    current_age: int
    withdrawal_start_age: int
    social_security_start_age: int
    target_age: int
    target_portfolio_value: float

    # Current status
    current_annual_expenses: float
    expenses_at_withdrawal_start: float

    # Income analysis
    current_portfolio_dividend_yield: float
    current_annual_dividend_income: float
    required_dividend_yield_at_55: float
    required_dividend_yield_at_67: float
    dividend_income_gap: float

    # Social Security
    estimated_social_security_annual: float
    years_before_social_security: int
    years_with_social_security: int
    net_expenses_with_social_security: float

    # Capital target analysis
    progress_to_target_percentage: float
    gap_to_target: float
    required_annual_growth_rate: float

    # Projections
    years_to_withdrawal: int
    years_in_retirement: int
    inflation_rate: float

    # Status flags
    income_sufficient_before_ss: bool
    income_sufficient_after_ss: bool
    on_track_for_target: bool


# Scenario Request
class ScenarioRequest(BaseModel):
    current_age: Optional[int] = None
    withdrawal_start_age: Optional[int] = None
    social_security_start_age: Optional[int] = None
    target_age: Optional[int] = None
    target_portfolio_value: Optional[float] = None
    inflation_rate: Optional[float] = None
    expected_dividend_yield: Optional[float] = None
    estimated_social_security_monthly: Optional[float] = None
    annual_expenses: Optional[float] = None


# Market Data Schemas
class MarketDataResponse(BaseModel):
    data_type: str
    value: float
    last_updated: datetime

    class Config:
        from_attributes = True


class AllMarketDataResponse(BaseModel):
    treasury_10y: Optional[MarketDataResponse]
    sp500: Optional[MarketDataResponse]
    nasdaq: Optional[MarketDataResponse]


# Portfolio Builder Schemas
class ModelPortfolioRequest(BaseModel):
    required_yield: float


class AssetAllocation(BaseModel):
    asset_class: str
    allocation_percentage: float
    expected_yield: float


class ModelPortfolioResponse(BaseModel):
    required_yield: float
    allocations: List[AssetAllocation]
    weighted_average_yield: float


# Dashboard Summary
class PortfolioSummaryResponse(BaseModel):
    total_net_worth: float
    total_accounts: int
    total_holdings: int
    annual_dividend_income: float
    current_portfolio_yield: float
