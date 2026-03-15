# Application Optimization Recommendations

Comprehensive optimization analysis covering performance, security, reliability, and UX improvements across both the FastAPI backend and React frontend.

---

## Table of Contents

1. [Critical Security Fixes (P0)](#1-critical-security-fixes-p0)
2. [Backend: Database & Query Optimizations](#2-backend-database--query-optimizations)
3. [Backend: External API Call Optimizations](#3-backend-external-api-call-optimizations)
4. [Backend: Computation Optimizations](#4-backend-computation-optimizations)
5. [Backend: Reliability & Error Handling](#5-backend-reliability--error-handling)
6. [Frontend: Performance Optimizations](#6-frontend-performance-optimizations)
7. [Frontend: Data Fetching Optimizations](#7-frontend-data-fetching-optimizations)
8. [Frontend: UX & Reliability](#8-frontend-ux--reliability)
9. [Frontend: Accessibility](#9-frontend-accessibility)
10. [Build & Infrastructure](#10-build--infrastructure)
11. [Priority Summary](#11-priority-summary)

---

## 1. Critical Security Fixes (P0)

### Hardcoded Absolute Paths

**Files:** `backend/routers/dashboard.py`, `backend/routers/expected_returns.py`

Both files contain `sys.path.append('/Users/ssachdeva/Documents/Claude/my-app/backend')`. This is a security risk (exposes local filesystem structure) and will break in any other environment.

**Fix:** Replace with relative imports or proper Python module resolution using `__file__` or package-relative paths.

### Missing Dependencies in requirements.txt

**File:** `backend/requirements.txt`

The following packages are imported across routers but not declared:
- `yfinance` (used in market_data, dashboard, portfolio_allocation, expected_returns)
- `numpy` (used in monte_carlo.py)
- `python-dateutil` (used in expenses.py)

**Fix:** Add these to `requirements.txt` with pinned versions.

### Hardcoded CORS Origin

**File:** `backend/main.py`

CORS origin is hardcoded to `http://localhost:5173`. This will block requests from any production domain.

**Fix:** Read allowed origins from an environment variable (e.g., `CORS_ORIGINS`), falling back to `http://localhost:5173` for development.

---

## 2. Backend: Database & Query Optimizations

### N+1 Query Problems (P0 -- most impactful backend fix)

Nearly every router suffers from N+1 queries: query all parent records, then loop and query children individually.

| Router | File | Issue |
|--------|------|-------|
| Dashboard | `backend/routers/dashboard.py` | Queries all accounts, then all holdings separately instead of using joins |
| Retirement | `backend/routers/retirement.py` | Loops through accounts querying holdings per account (lines 67-75) |
| Expenses | `backend/routers/expenses.py` | Queries category per expense in analytics and recurring endpoints |
| Scenario | `backend/routers/scenario.py` | Separate queries for config, accounts, and categories |
| Monte Carlo | `backend/routers/monte_carlo.py` | Queries accounts then expenses separately |
| Rebalancing | `backend/routers/rebalancing.py` | Queries all holdings individually in allocation calculation |
| Portfolio Builder | `backend/routers/portfolio_builder.py` | Queries all accounts, then categories separately |
| Year Projection | `backend/routers/year_projection.py` | Queries accounts, then expenses separately |

**Fix:** Use SQLAlchemy `joinedload()` / `selectinload()` eager loading, or write joined queries that fetch related data in a single round-trip. Example:

```python
from sqlalchemy.orm import joinedload

accounts = db.query(BrokerageAccount).options(
    joinedload(BrokerageAccount.holdings)
).all()
```

### Missing Database Indexes (P1)

**File:** `backend/models.py`

The following columns are frequently used in WHERE clauses, JOINs, or ORDER BY but lack indexes:

- `Holding.account_id` -- foreign key, used in every account-holdings join
- `Holding.symbol` -- used for lookups by ticker symbol
- `Expense.category_id` -- foreign key, used in category-expense joins
- `Expense.expense_date` -- used in date range queries and analytics
- `AccountSnapshot.account_id` -- foreign key
- `AccountSnapshot.snapshot_date` -- used in date-based queries
- `BrokerageAccount.brokerage_name` -- used in filtering

**Fix:** Add `index=True` to these Column definitions and generate an Alembic migration:

```python
account_id = Column(Integer, ForeignKey("brokerage_accounts.id"), index=True)
expense_date = Column(Date, index=True)
```

### Missing Pagination (P2)

All list endpoints (`get_accounts`, `get_expenses`, `get_holdings`) return every record with no limit/offset. Performance will degrade as data grows.

**Fix:** Add `skip` and `limit` query parameters to all list endpoints:

```python
@router.get("/accounts")
async def get_accounts(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    return db.query(BrokerageAccount).offset(skip).limit(limit).all()
```

### Synchronous DB with Async FastAPI (P1)

**File:** `backend/database.py`

Uses synchronous `Session` with async route handlers, which blocks the event loop on every database call.

**Fix:** Migrate to `sqlalchemy.ext.asyncio.AsyncSession` with `create_async_engine` and `async_sessionmaker`. This requires an async-compatible database driver (e.g., `aiosqlite` for SQLite).

---

## 3. Backend: External API Call Optimizations

### Blocking yfinance Calls (P2)

Multiple routers make synchronous `yfinance` calls that block the FastAPI event loop:
- `backend/routers/market_data.py`
- `backend/routers/dashboard.py`
- `backend/routers/portfolio_allocation.py` (worst offender -- loops through ETFs making individual API calls)
- `backend/routers/expected_returns.py`

**Fix:** Run yfinance calls in a thread pool via `asyncio.to_thread()`:

```python
import asyncio

data = await asyncio.to_thread(yf.Ticker(symbol).history, period="1d")
```

Or switch to an async HTTP client (`httpx`) for direct Yahoo Finance API access.

### Missing Caching (P1)

Market data, ETF yields, dashboard stats, retirement projections, and scenario calculations are recomputed from scratch on every request.

**Fix:** Add in-memory caching with `cachetools.TTLCache` or Redis:

| Data | Recommended TTL | Notes |
|------|-----------------|-------|
| Market data (S&P 500, indices) | 15 minutes | Changes infrequently during trading hours |
| ETF prices and yields | 5 minutes | Moderate update frequency |
| Dashboard quick stats | 1 minute | User expects near-real-time |
| Projection calculations | 5 minutes | Invalidate on underlying data change |

Example with `cachetools`:

```python
from cachetools import TTLCache

market_cache = TTLCache(maxsize=100, ttl=900)  # 15 min

def get_market_data(symbol):
    if symbol in market_cache:
        return market_cache[symbol]
    data = yf.Ticker(symbol).history(period="1d")
    market_cache[symbol] = data
    return data
```

### Missing Rate Limiting (P3)

No rate limiting on any endpoint. Yahoo Finance API calls could exceed rate limits and get the app blocked.

**Fix:** Add `slowapi` middleware for external-API-proxied endpoints:

```python
from slowapi import Limiter
limiter = Limiter(key_func=get_remote_address)

@router.get("/market-data")
@limiter.limit("10/minute")
async def get_market_data(request: Request):
    ...
```

---

## 4. Backend: Computation Optimizations

### CPU-Intensive Synchronous Operations (P2)

Heavy computations run synchronously and can block the event loop or cause request timeouts:

- **Monte Carlo** (`backend/routers/monte_carlo.py`): 1000 simulations with nested loops
- **Year Projections** (`backend/routers/year_projection.py`): year-by-year loop calculations
- **Retirement metrics** (`backend/routers/retirement.py`): complex financial calculations

**Fix:**
1. Use `asyncio.to_thread()` to offload to a thread pool
2. For Monte Carlo: vectorize with NumPy instead of Python loops (10-100x speedup)
3. Cache results with TTL (projections don't change unless inputs change)
4. For very long operations: use `fastapi.BackgroundTasks` with a status polling endpoint

### In-Python Aggregation (P2)

Dashboard and allocation endpoints fetch all raw records and aggregate totals using Python loops instead of SQL.

**Fix:** Push aggregation to the database:

```python
# Instead of fetching all holdings and summing in Python:
total = db.query(func.sum(Holding.quantity * Holding.current_price)).scalar()

# Instead of grouping in Python:
by_type = db.query(
    Holding.asset_type,
    func.sum(Holding.quantity * Holding.current_price)
).group_by(Holding.asset_type).all()
```

---

## 5. Backend: Reliability & Error Handling

### No Global Exception Handler (P2)

**File:** `backend/main.py`

Unhandled exceptions return raw 500 errors that may leak internal details.

**Fix:** Add FastAPI exception handlers:

```python
from fastapi.exceptions import RequestValidationError
from starlette.exceptions import HTTPException

@app.exception_handler(Exception)
async def generic_exception_handler(request, exc):
    logger.error(f"Unhandled error: {exc}", exc_info=True)
    return JSONResponse(status_code=500, content={"detail": "Internal server error"})
```

### Missing Error Handling in Routers (P2)

Most routers have no try/except blocks around database queries or external API calls. Failures propagate as unhandled exceptions.

### Division by Zero Risks (P2)

**File:** `backend/routers/retirement.py` (lines 82, 115-116)

Financial calculations divide by values that could be zero (e.g., total portfolio value, years to retirement).

**Fix:** Add guard clauses before division operations.

### Weak Input Validation (P2)

**File:** `backend/schemas.py`

Pydantic schemas lack `Field` constraints. Users can submit negative ages, impossible percentages, or excessively long strings.

**Fix:** Add field-level validation:

```python
from pydantic import Field

class RetirementConfigCreate(BaseModel):
    current_age: int = Field(ge=0, le=150)
    retirement_age: int = Field(ge=0, le=150)
    annual_income: float = Field(ge=0)
    savings_rate: float = Field(ge=0, le=1)
```

### Unsafe Transaction in Portfolio Allocation (P2)

**File:** `backend/routers/portfolio_allocation.py`

`implement_portfolio_allocation()` deletes existing holdings before creating new ones. If creation fails mid-way, holdings are lost.

**Fix:** Wrap in a proper transaction with rollback on failure:

```python
try:
    db.begin_nested()
    # delete old holdings
    # create new holdings
    db.commit()
except Exception:
    db.rollback()
    raise
```

### No Logging (P3)

No structured logging setup anywhere in the backend.

**Fix:** Configure Python's `logging` module with structured output (JSON format for production).

---

## 6. Frontend: Performance Optimizations

### Code Splitting & Lazy Loading (P1 -- high impact)

**File:** `frontend/src/App.jsx`

All 6 page components are imported synchronously. The entire application JavaScript loads upfront, even for pages the user may never visit.

**Fix:** Use `React.lazy()` + `Suspense` for route-level code splitting:

```jsx
import React, { Suspense } from 'react';

const DashboardPage = React.lazy(() => import('./pages/DashboardPage'));
const AccountsPage = React.lazy(() => import('./pages/AccountsPage'));
const ExpensesPage = React.lazy(() => import('./pages/ExpensesPage'));
// ... other pages

function App() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <Routes>
        <Route path="/dashboard" element={<DashboardPage />} />
        {/* ... */}
      </Routes>
    </Suspense>
  );
}
```

### Missing Memoization (P2 -- high impact)

No component in the entire codebase uses `React.memo`, and almost none use `useMemo`/`useCallback`. Key offenders:

| Component | Issue |
|-----------|-------|
| `QuickStats.jsx` | `statCards` array recreated every render |
| `AssetAllocation.jsx` | Colors array and SVG calculations on every render |
| `Assumptions.jsx` | Large assumptions array recreated on every render |
| `ExpenseAnalytics.jsx` | `getTopCategories`, `getMonthlyAverage` recomputed |
| `RebalancingAnalysis.jsx` | Complex calculations run in render body |
| All page components | No `React.memo` wrappers |

**Fix:**
- `useMemo` for computed/derived values
- `useCallback` for event handlers passed as props to child components
- `React.memo` for pure presentational components that receive stable props

### Tab Content Rendering (P2)

**Files:** `frontend/src/pages/PortfolioManagementPage.jsx`, `frontend/src/pages/ExpenseTrackerPage.jsx`

Both pages render ALL tab panels simultaneously, even when only one tab is visible.

**Fix:** Only mount the active tab's content:

```jsx
{activeTab === 'overview' && <OverviewPanel />}
{activeTab === 'allocation' && <AllocationPanel />}
```

### Missing List Virtualization (P3)

Large tables render all rows to the DOM at once:
- `ExpenseList.jsx` (440 lines, potentially hundreds of expense rows)
- `YearProjection.jsx` (30+ year rows)
- `MonteCarloSimulation.jsx` (simulation result tables)

**Fix:** Use `react-window` or `@tanstack/react-virtual` for tables with more than ~50 rows.

### Missing Input Debouncing (P2)

Search/filter inputs in `ExpenseList.jsx` and form inputs in `ScenarioPlanner.jsx` trigger API calls or expensive re-renders on every keystroke.

**Fix:** Create a `useDebounce` hook with ~300ms delay:

```jsx
function useDebounce(value, delay = 300) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(id);
  }, [value, delay]);
  return debounced;
}
```

---

## 7. Frontend: Data Fetching Optimizations

### No Request Caching or Deduplication (P1 -- highest-impact frontend fix)

**File:** `frontend/src/api/client.js`

Uses raw axios with no caching layer. Every page navigation or component mount triggers fresh API calls, even for data that was just fetched seconds ago. There is also no request deduplication (two components requesting the same data fire two requests).

**Fix:** Adopt `@tanstack/react-query` (TanStack Query). This would provide:
- Automatic caching with configurable stale times
- Request deduplication (multiple components sharing the same query)
- Background refetching (stale-while-revalidate pattern)
- Built-in optimistic updates
- Automatic retry logic (currently missing entirely)
- Request cancellation on unmount

This would replace the custom hooks (`useDashboard`, `useRetirement`, `useExpenses`, `useAccounts`) with standardized query hooks.

### No Request Cancellation (P2)

Navigating away from a page doesn't cancel in-flight requests. Stale responses can arrive after navigation and cause state updates on unmounted components.

**Fix:** Use `AbortController` in `useEffect` cleanup functions, or rely on React Query's built-in cancellation.

---

## 8. Frontend: UX & Reliability

### No Error Boundaries (P1)

No component in the app uses React Error Boundaries. A single component crash (e.g., bad data from the API causing a rendering error) takes down the entire application.

**Fix:** Add error boundaries at two levels:
1. **Route-level:** Wrap each page so a crash on one page doesn't break others
2. **Component-level:** Wrap risky components (charts, tables with external data)

```jsx
class ErrorBoundary extends React.Component {
  state = { hasError: false };
  static getDerivedStateFromError() { return { hasError: true }; }
  render() {
    if (this.state.hasError) return <div>Something went wrong.</div>;
    return this.props.children;
  }
}
```

### Poor Error UX (P2)

- `AccountsPage.jsx` uses browser `alert()` for error messages
- Other pages show raw error text inline
- No consistent error presentation

**Fix:** Implement a toast/notification system (e.g., `react-hot-toast`) for transient errors, and inline error states for persistent failures.

### No Skeleton Loaders (P3)

Loading states across the app show plain "Loading..." text, causing layout shift when data arrives.

**Fix:** Add skeleton placeholder components for dashboard cards, tables, and chart areas.

### Large Components Need Splitting (P3)

Several components are excessively large and handle too many concerns:

| Component | Lines | Suggested Extraction |
|-----------|-------|---------------------|
| `ExpenseList.jsx` | 440 | Filter bar, edit modal, table row component |
| `ScenarioPlanner.jsx` | 351 | Form sections, results display, preset selector |
| `HoldingsList.jsx` | 300 | Add/edit form, holdings table row |
| `OptimalAllocation.jsx` | 283 | Historical performance section, allocation display |

---

## 9. Frontend: Accessibility

The following accessibility gaps were identified across the component library:

- **Missing ARIA labels** on interactive elements (buttons, inputs, navigation links)
- **No keyboard navigation indicators** -- focus states not visible on interactive elements
- **No focus management** -- modals and dynamic content don't trap or manage focus
- **Emoji used as icons** without `aria-label` attributes (screen readers read emoji names)
- **Color-only status indicators** with no text alternatives for color-blind users
- **No skip-to-content link** for keyboard users to bypass navigation
- **Tooltip component** (`frontend/src/components/common/Tooltip.jsx`) has no ARIA attributes (`role="tooltip"`, `aria-describedby`)

**Fix:** Audit each component against WCAG 2.1 AA guidelines, starting with:
1. Add `aria-label` to all icon buttons and emoji indicators
2. Add visible focus styles to all interactive elements
3. Implement focus trap for modals
4. Add `role="tooltip"` and `aria-describedby` to Tooltip
5. Add a skip-to-content link in Layout

---

## 10. Build & Infrastructure

### Vite Build Optimizations (P2)

**File:** `frontend/vite.config.js`

No build optimizations are configured. All vendor code is bundled with application code.

**Fix:**
```js
// vite.config.js
export default defineConfig({
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom', 'react-router-dom'],
          api: ['axios'],
        }
      }
    }
  }
});
```

Also consider adding:
- `rollup-plugin-visualizer` for bundle analysis
- `vite-plugin-compression` for gzip/brotli output

### Missing Development Tools (P3)

- No test setup (frontend or backend) -- add pytest + vitest
- No pre-commit hooks -- add Husky + lint-staged for linting and formatting
- No CI/CD configuration -- add GitHub Actions for tests and build verification
- No bundle size monitoring -- add size-limit or bundlewatch

---

## 11. Priority Summary

### P0 -- Critical (fix immediately)
- [ ] Remove hardcoded `sys.path.append` absolute paths
- [ ] Add missing dependencies to `requirements.txt`
- [ ] Fix N+1 queries with eager loading across all routers

### P1 -- High Impact
- [ ] Adopt TanStack React Query for data fetching (caching, dedup, retry)
- [ ] Add `React.lazy` + `Suspense` for route-level code splitting
- [ ] Add TTL caching for external API calls (market data, ETF prices)
- [ ] Add React Error Boundaries around pages and risky components
- [ ] Migrate to async SQLAlchemy sessions
- [ ] Add database indexes on frequently queried columns

### P2 -- Medium Impact
- [ ] Add `React.memo`, `useMemo`, `useCallback` across components
- [ ] Add input debouncing for search/filter fields
- [ ] Add global exception handlers and input validation in backend
- [ ] Add pagination to all list endpoints
- [ ] Move blocking yfinance calls to thread pool / async
- [ ] Configure Vite manual chunks and build optimization

### P3 -- Polish
- [ ] Add list virtualization for long tables
- [ ] Add skeleton loaders for loading states
- [ ] Fix accessibility gaps (ARIA labels, focus management, skip links)
- [ ] Split oversized components into smaller pieces
- [ ] Add rate limiting on external API proxy endpoints
- [ ] Add structured logging and request ID tracking
