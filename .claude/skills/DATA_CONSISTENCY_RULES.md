# Data Consistency Rules

## ✅ VERIFIED: 2026-03-02

All data sources have been audited and are now consistent across the entire application.

## Single Source of Truth

### 📊 Expense Data
**Source**: `Expense` table (detailed expense records)
- Location: `backend/models.py` → `Expense` model
- Accessed via: `db.query(Expense).all()`

**Calculation Method**:
```python
def calculate_annual_expenses_from_actual(db: Session) -> float:
    """Calculate total annual expenses from actual expense records"""
    expenses = db.query(Expense).filter(Expense.is_recurring == True).all()

    total_annual = 0.0
    for expense in expenses:
        if expense.recurrence_period == "MONTHLY":
            total_annual += expense.amount * 12
        elif expense.recurrence_period == "QUARTERLY":
            total_annual += expense.amount * 4
        elif expense.recurrence_period == "YEARLY":
            total_annual += expense.amount
        elif expense.recurrence_period == "MULTI_YEAR" and expense.recurrence_interval_years:
            # Annualize multi-year expenses (e.g., car every 11 years)
            total_annual += expense.amount / expense.recurrence_interval_years

    return total_annual
```

**Used By**:
- ✅ `/api/expenses/total-annual` - Expense Tracker page
- ✅ `/api/dashboard/quick-stats` - Dashboard
- ✅ `/api/retirement/calculation` - Retirement calculations
- ✅ `/api/portfolio-allocation/calculate` - Portfolio allocation

**Current Total**: $241,026.71

---

### 💼 Net Worth / Portfolio Data
**Source**: `BrokerageAccount` table
- Location: `backend/models.py` → `BrokerageAccount` model
- Accessed via: `db.query(BrokerageAccount).all()`

**Calculation Method**:
```python
def calculate_net_worth(db: Session) -> float:
    """Calculate total net worth from all brokerage accounts"""
    accounts = db.query(BrokerageAccount).all()
    return sum(acc.current_balance for acc in accounts)
```

**Account Fields**:
- `current_balance` = Total account value (investments + cash)
- `investments` = Value of holdings (stocks, ETFs, bonds)
- `cash` = Cash and money market funds
- Invariant: `current_balance = investments + cash`

**Used By**:
- ✅ `/api/accounts` - Accounts page
- ✅ `/api/dashboard/quick-stats` - Dashboard
- ✅ `/api/retirement/calculation` - Retirement calculations
- ✅ `/api/portfolio-allocation/calculate` - Portfolio allocation

**Current Total**: $8,675,999.98

---

## ❌ DEPRECATED Tables (Do Not Use)

### ExpenseCategory Table
- **Status**: DEPRECATED - Contains stale data
- **Old Value**: $235,000 (outdated)
- **Correct Value**: $241,027 (from Expense table)
- **Reason**: This was used before we implemented detailed expense tracking
- **Migration**: All expense amounts now stored in Expense table with category_id reference

**Important**: ExpenseCategory is still used as a **reference table** for category names and IDs, but **NOT** for expense amounts. The `annual_amount` field is stale and should never be used for calculations.

---

## Data Flow Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                       EXPENSE DATA FLOW                         │
└─────────────────────────────────────────────────────────────────┘

User Input (Expense Tracker Page)
         ↓
    Expense Table
    (detailed records: amount, frequency, category)
         ↓
calculate_annual_expenses_from_actual(db)
         ↓
    ┌────────────────────────────────────────┐
    │  Total Annual Expenses: $241,026.71    │
    └────────────────────────────────────────┘
         ↓
    ┌────────┬─────────────┬──────────────────┐
    ↓        ↓             ↓                  ↓
Dashboard  Retirement  Portfolio      Summary Page
           Calculation  Allocation


┌─────────────────────────────────────────────────────────────────┐
│                     NET WORTH DATA FLOW                         │
└─────────────────────────────────────────────────────────────────┘

User Input (Accounts Page)
         ↓
  BrokerageAccount Table
  (current_balance per account)
         ↓
    sum(accounts.current_balance)
         ↓
    ┌────────────────────────────────────────┐
    │  Total Net Worth: $8,675,999.98        │
    └────────────────────────────────────────┘
         ↓
    ┌────────┬─────────────┬──────────────────┐
    ↓        ↓             ↓                  ↓
Dashboard  Retirement  Portfolio      Summary Page
           Calculation  Allocation
```

---

## Backend Routers - Data Source Reference

| Router File | Expenses From | Net Worth From | Status |
|-------------|---------------|----------------|---------|
| `dashboard.py` | ✅ Expense table | ✅ BrokerageAccount | CORRECT |
| `retirement.py` | ✅ Expense table | ✅ BrokerageAccount | CORRECT |
| `portfolio_allocation.py` | ✅ Expense table | ✅ BrokerageAccount | CORRECT |
| `expected_returns.py` | N/A | ✅ BrokerageAccount | CORRECT |
| `expenses.py` | ✅ Expense table | N/A | CORRECT |

---

## Verification Commands

### Check Expense Consistency
```bash
cd /Users/ssachdeva/Documents/Claude/my-app

# Expense Tracker
curl -s http://localhost:8000/api/expenses/total-annual | python3 -c "import json,sys; print('Expense Tracker:', json.load(sys.stdin)['total_annual_expenses'])"

# Dashboard
curl -s http://localhost:8000/api/dashboard/quick-stats | python3 -c "import json,sys; print('Dashboard:     ', json.load(sys.stdin)['total_annual_expenses'])"

# Retirement
curl -s http://localhost:8000/api/retirement/calculation | python3 -c "import json,sys; print('Retirement:    ', json.load(sys.stdin)['current_annual_expenses'])"
```

Expected output: All should show `$241,026.71` (or `$241,026.7121212121` with more decimals)

### Check Net Worth Consistency
```bash
# Accounts
curl -s http://localhost:8000/api/accounts | python3 -c "import json,sys; print('Accounts:  ', sum(a['current_balance'] for a in json.load(sys.stdin)))"

# Dashboard
curl -s http://localhost:8000/api/dashboard/quick-stats | python3 -c "import json,sys; print('Dashboard: ', json.load(sys.stdin)['total_net_worth'])"

# Retirement
curl -s http://localhost:8000/api/retirement/calculation | python3 -c "import json,sys; print('Retirement:', json.load(sys.stdin)['current_net_worth'])"

# Portfolio
curl -s http://localhost:8000/api/portfolio-allocation/calculate | python3 -c "import json,sys; print('Portfolio: ', json.load(sys.stdin)['total_portfolio_value'])"
```

Expected output: All should show `$8,675,999.98`

---

## Maintenance Rules

### When Adding New Expenses
1. ✅ Add to Expense table via `/api/expenses` POST endpoint
2. ✅ Run `refresh-dashboard.sh` to update all calculations
3. ❌ DO NOT update ExpenseCategory.annual_amount

### When Updating Accounts
1. ✅ Update BrokerageAccount.current_balance via `/api/accounts/{id}` PUT endpoint
2. ✅ Ensure current_balance = investments + cash
3. ✅ Run `refresh-dashboard.sh` to update all calculations

### When Adding New Calculations
If you create a new endpoint that needs expense or net worth data:

**For Expenses**: Use this function
```python
from routers.retirement import calculate_annual_expenses_from_actual

annual_expenses = calculate_annual_expenses_from_actual(db)
```

**For Net Worth**: Use this pattern
```python
from models import BrokerageAccount

accounts = db.query(BrokerageAccount).all()
total_net_worth = sum(acc.current_balance for acc in accounts)
```

**DO NOT**:
- ❌ Use `ExpenseCategory.annual_amount` for expense calculations
- ❌ Calculate net worth from any other source besides BrokerageAccount
- ❌ Cache expense or net worth values (always query fresh from database)

---

## History of Changes

### 2026-03-02 - Data Consistency Audit
- **Fixed**: Dashboard expense calculation (was using ExpenseCategory, now uses Expense)
- **Fixed**: Retirement projection calculation (was using ExpenseCategory, now uses Expense)
- **Verified**: All 4 major systems now use same data sources
- **Removed**: Old Expenses page (kept Expense Tracker as single source)
- **Result**: 100% data consistency across all pages

### Before 2026-03-02
- Dashboard showed $235K (wrong - from ExpenseCategory)
- Expense Tracker showed $241K (correct - from Expense table)
- This caused user confusion and inconsistent planning

---

## Quick Reference

**Current Values** (as of 2026-03-02):
- Total Annual Expenses: **$241,026.71**
- Total Net Worth: **$8,675,999.98**
- Portfolio Yield: **3.97%**
- After-Tax Income: **$259,433.19**
- Annual Surplus: **$18,406.48**
- Coverage Ratio: **107.6%**

**Data Sources**:
- Expenses → `Expense` table
- Net Worth → `BrokerageAccount` table
- Portfolio Yield → Calculated from accounts + holdings
- Tax Rate → From `RetirementConfig` table

**Refresh After Changes**:
```bash
./.claude/skills/refresh-dashboard.sh
```
