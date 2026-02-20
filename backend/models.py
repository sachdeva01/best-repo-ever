from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey, Text
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from database import Base


# Models
class BrokerageAccount(Base):
    __tablename__ = "brokerage_accounts"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    brokerage_name = Column(String, nullable=False)  # Fidelity, Vanguard, T. Rowe Price, E*TRADE, Wealthfront
    account_type = Column(String, nullable=False)  # 401(k), Traditional IRA, Roth IRA, Taxable, HSA
    current_balance = Column(Float, default=0.0)
    dividend_yield = Column(Float, nullable=True)  # Optional annual dividend yield as decimal (e.g., 0.035 for 3.5%)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # Relationships
    holdings = relationship("Holding", back_populates="account", cascade="all, delete-orphan")
    snapshots = relationship("AccountSnapshot", back_populates="account", cascade="all, delete-orphan")


class Holding(Base):
    __tablename__ = "holdings"

    id = Column(Integer, primary_key=True, index=True)
    account_id = Column(Integer, ForeignKey("brokerage_accounts.id"), nullable=False)
    symbol = Column(String, nullable=False)
    name = Column(String, nullable=False)
    asset_type = Column(String, nullable=False)  # Stock, Bond, ETF, Mutual Fund, Cash, Other
    quantity = Column(Float, nullable=False)
    price_per_share = Column(Float, nullable=False)
    dividend_yield = Column(Float, nullable=True)  # Optional for individual holdings
    last_updated = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    # Relationships
    account = relationship("BrokerageAccount", back_populates="holdings")

    @property
    def total_value(self):
        """Computed property for total value"""
        return self.quantity * self.price_per_share


class AccountSnapshot(Base):
    __tablename__ = "account_snapshots"

    id = Column(Integer, primary_key=True, index=True)
    account_id = Column(Integer, ForeignKey("brokerage_accounts.id"), nullable=False)
    balance = Column(Float, nullable=False)
    snapshot_date = Column(DateTime(timezone=True), nullable=False)
    notes = Column(Text, nullable=True)

    # Relationships
    account = relationship("BrokerageAccount", back_populates="snapshots")


class ExpenseCategory(Base):
    __tablename__ = "expense_categories"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False, unique=True)
    description = Column(Text, nullable=True)
    annual_amount = Column(Float, default=0.0)  # Editable annual amount for this category

    # Relationships
    expenses = relationship("Expense", back_populates="category")


class Expense(Base):
    __tablename__ = "expenses"

    id = Column(Integer, primary_key=True, index=True)
    category_id = Column(Integer, ForeignKey("expense_categories.id"), nullable=False)
    amount = Column(Float, nullable=False)
    description = Column(Text, nullable=True)
    expense_date = Column(DateTime(timezone=True), nullable=False)
    is_recurring = Column(Integer, default=0)  # SQLite uses 0/1 for boolean
    recurrence_period = Column(String, nullable=True)  # MONTHLY, QUARTERLY, YEARLY, MULTI_YEAR
    recurrence_interval_years = Column(Integer, nullable=True)  # For multi-year recurrence (e.g., 5 for every 5 years)
    expense_type = Column(String, default="HOUSEHOLD")  # HOUSEHOLD, ONE_TIME, RECURRING
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    category = relationship("ExpenseCategory", back_populates="expenses")


class RetirementConfig(Base):
    __tablename__ = "retirement_config"

    id = Column(Integer, primary_key=True, index=True)
    current_age = Column(Integer, nullable=False)
    withdrawal_start_age = Column(Integer, nullable=False)
    social_security_start_age = Column(Integer, default=67)
    target_age = Column(Integer, nullable=False)
    target_portfolio_value = Column(Float, nullable=False)
    inflation_rate = Column(Float, default=0.03)
    annual_expenses_override = Column(Float, nullable=True)  # Optional manual override
    expected_dividend_yield = Column(Float, default=0.03)
    estimated_social_security_monthly = Column(Float, default=0.0)  # Monthly SS benefit estimate
    qualified_dividend_tax_rate = Column(Float, default=0.15)  # 15% for qualified dividends
    ordinary_income_tax_rate = Column(Float, default=0.30)  # 30% for ordinary income (federal + state)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())


class MarketData(Base):
    __tablename__ = "market_data"

    id = Column(Integer, primary_key=True, index=True)
    data_type = Column(String, nullable=False, unique=True)  # 10-Year Treasury, S&P 500, Nasdaq
    value = Column(Float, nullable=False)
    last_updated = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
