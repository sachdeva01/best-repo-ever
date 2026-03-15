# my-app — Project Structure

## Overview

`my-app` is a **retirement and portfolio tracking web application** designed around a capital-preservation dividend-income strategy. It is a full-stack project comprising a Python/FastAPI backend, a React/Vite frontend, and a set of Python diagnostic agents. The app lets you track brokerage accounts and holdings, model retirement scenarios, run Monte Carlo simulations, and project year-by-year portfolio outcomes.

---

## Top-Level Layout

```
my-app/
├── backend/          Python FastAPI REST API + SQLite databases
├── frontend/         React (Vite) single-page application
├── agents/           Python diagnostic/monitoring agents
├── .claude/          Claude automation skills, logs, and docs
├── CLAUDE.md         Guidance for Claude when working in this project
├── README.md         Human-facing project overview
└── *.md / *.xlsx     Strategy notes and reference spreadsheets
```

---

## Backend (`backend/`)

The backend is a **FastAPI** application. It owns all data persistence, business logic, and API routing. Every frontend page communicates with this server over HTTP.

### Entry Point

**`main.py`** is where everything is wired together. On startup it:
1. Imports `engine` and `Base` from `database.py` and calls `Base.metadata.create_all()` to create database tables if they don't exist.
2. Seeds default expense categories and retirement config via `init_db.py`.
3. Registers all routers under the `/api` prefix.
4. Configures CORS to allow requests from `http://localhost:5173` (the Vite dev server).

### Database Layer

**`database.py`** sets up the SQLAlchemy connection. It reads `DATABASE_URL` from the environment (defaulting to `sqlite:///./portfolio_tracker.db`), creates the SQLAlchemy engine, and exposes a `get_db()` generator used as a FastAPI dependency to inject database sessions into every route handler.

**`portfolio_tracker.db`** and **`retirement_planner.db`** are the two SQLite database files that live alongside the Python code and persist all application data.

**`.env`** / **`.env.example`** hold environment variables (database URL, secrets, API keys). The `.env` file is gitignored; `.env.example` shows what variables are required.

### Data Models

**`models.py`** defines all SQLAlchemy ORM models — the authoritative description of the database schema:

- `User` — authentication record (username + hashed password).
- `BrokerageAccount` — a financial account at a brokerage (Fidelity, Vanguard, etc.), typed as 401k / IRA / Roth / Taxable / HSA. Has `investments` + `cash` fields; a computed `total_balance` property; and one-to-many relationships to `Holding` and `AccountSnapshot`.
- `Holding` — an individual position inside an account (symbol, quantity, price per share, asset type). Has a computed `total_value` property and a foreign key back to `BrokerageAccount`.
- `AccountSnapshot` — a point-in-time balance record for an account, used for historical charting.
- `ExpenseCategory` — a named bucket for expenses (Housing, Healthcare, etc.) with an editable `annual_amount`.
- `Expense` — a single expense entry linked to a category, supporting recurring expenses (monthly / quarterly / yearly / multi-year) and one-time expenses.
- `RetirementConfig` — a single-row configuration table that stores all retirement planning parameters: current age, withdrawal start age, Social Security start age, expected returns, inflation rate, dividend yield targets, tax rates, income levels, and the two-sleeve strategy parameters.
- `MarketData` — cached live market data (10-year Treasury yield, S&P 500, Nasdaq).

### API Schemas

**`schemas.py`** defines Pydantic models for request validation and response serialization. Every model has three variants: a base schema, a `Create` schema (used for POST requests), an `Update` schema (used for PATCH requests, all fields optional), and a `Response` schema (used for what the API returns). Key schemas include `AccountResponse`, `HoldingResponse`, `RetirementConfigResponse`, `RetirementCalculationResponse`, `ScenarioRequest`, and `PortfolioSummaryResponse`.

The relationship between `models.py` and `schemas.py` is foundational: SQLAlchemy models describe the database rows; Pydantic schemas describe the data that crosses the HTTP boundary.

### Authentication

**`auth_utils.py`** provides helper functions for password hashing and JWT token creation/verification. **`routers/auth.py`** exposes the `/api/auth/register` and `/api/auth/login` endpoints that use these utilities.

### Routers (`routers/`)

Each file in `routers/` is a FastAPI `APIRouter` that handles one domain of the API. All routers receive a database session via `Depends(get_db)` and use both `models.py` (to query/mutate the DB) and `schemas.py` (to validate inputs and serialize outputs).

| Router file | Path prefix | Responsibility |
|---|---|---|
| `accounts.py` | `/api/accounts` | CRUD for brokerage accounts and account snapshots |
| `holdings.py` | `/api/holdings` | CRUD for individual holdings within accounts |
| `expenses.py` | `/api/expenses` | CRUD for expense categories and expense entries |
| `retirement.py` | `/api/retirement` | Read/update `RetirementConfig`; run the core retirement calculation that produces `RetirementCalculationResponse` |
| `dashboard.py` | `/api/dashboard` | Aggregates account data into the `PortfolioSummaryResponse` (total net worth, holdings count, annual dividends) |
| `market_data.py` | `/api/market-data` | Fetches live Treasury/S&P/Nasdaq rates (external API calls) and caches them in `MarketData` |
| `expected_returns.py` | `/api/expected-returns` | Calculates blended expected return across all holdings |
| `rebalancing.py` | `/api/rebalancing` | Computes rebalancing instructions to reach a target allocation |
| `portfolio_allocation.py` | `/api/portfolio-allocation` | Analyses current allocation by asset class |
| `portfolio_builder.py` | `/api/portfolio` | Generates a model portfolio given a required yield |
| `scenario.py` | `/api/scenario` | Runs what-if projections without persisting any changes |
| `monte_carlo.py` | `/api/monte-carlo` | Runs a Monte Carlo simulation over the retirement horizon |
| `year_projection.py` | `/api/year-projection` | Produces a detailed year-by-year portfolio projection table |
| `auth.py` | `/api/auth` | User registration and login (JWT-based) |

### Migration / Seed Scripts

Several one-off Python scripts in `backend/` handle database evolution:

- **`init_db.py`** — called on every startup to seed default expense categories and a default retirement config if none exists.
- **`add_medicare_expenses.py`**, **`add_onetime_expenses.py`**, **`add_tax_columns.py`** — migration scripts that add specific new columns or rows to the live database.
- **`migrate_expenses.py`**, **`migrate_split_balance.py`** — data-migration scripts to restructure existing records (e.g., splitting a single `balance` column into `investments` + `cash`).

These scripts are run manually when upgrading the database schema, complementing Alembic (which is installed in `venv/` but whose migrations directory isn't shown here).

### Python Virtual Environment

**`venv/`** is the Python virtual environment. It is gitignored in practice and should not be committed. Key installed packages (from `requirements.txt`) are FastAPI 0.115, Uvicorn, Pydantic 2.9, python-dotenv, SQLAlchemy 2.0, and Alembic.

---

## Frontend (`frontend/`)

The frontend is a **React + Vite** single-page application. It communicates with the backend exclusively through a shared HTTP client and renders the UI as a set of pages composed from domain-specific components.

### Entry Point

**`index.html`** is the single HTML file served by Vite. Its only job is to mount a `<div id="root">` and load `/src/main.jsx` as an ES module.

**`src/main.jsx`** bootstraps React: it creates a `QueryClient` (React Query, with a 2-minute stale time and auto-refetch on window focus) and renders `<QueryClientProvider>` wrapping `<App />` into the `#root` div.

**`src/App.jsx`** defines the routing tree using React Router v6. It wraps everything in `<AuthProvider>` (from `context/AuthContext.jsx`) and `<BrowserRouter>`. Public routes (`/login`, `/register`) are unguarded; all others are wrapped in `<ProtectedRoute>`, which checks the auth context and redirects to `/login` if the user is not authenticated. Authenticated pages are rendered inside `<Layout />`.

### Authentication

**`src/context/AuthContext.jsx`** is a React context that stores the JWT token and current user, exposes `login()` / `logout()` functions, and makes auth state available throughout the component tree.

**`src/components/ProtectedRoute.jsx`** reads from `AuthContext` and either renders its children or redirects to `/login`.

### API Layer (`src/api/`)

Every file in this folder is a thin module of functions that call the backend. They all import from **`client.js`**, which creates a shared Axios instance pointed at `http://localhost:8000` (or `VITE_API_URL` from the environment). The client adds request/response interceptors to log slow requests (>1s) and normalize network errors into readable messages.

Each API module maps to a backend router:

- `accounts.js` ↔ `/api/accounts`
- `dashboard.js` ↔ `/api/dashboard`
- `expenses.js` / `expenseTracking.js` ↔ `/api/expenses`
- `retirement.js` ↔ `/api/retirement`
- `marketData.js` ↔ `/api/market-data`
- `expectedReturns.js` ↔ `/api/expected-returns`
- `rebalancing.js` ↔ `/api/rebalancing`
- `portfolioAllocation.js` ↔ `/api/portfolio-allocation`
- `portfolioBuilder.js` ↔ `/api/portfolio`
- `scenario.js` ↔ `/api/scenario`
- `monteCarlo.js` ↔ `/api/monte-carlo`
- `yearProjection.js` ↔ `/api/year-projection`

**`queryKeys.js`** centralises React Query cache keys so they're consistent across hooks and components.

### Custom Hooks (`src/hooks/`)

The hooks layer sits between the API layer and the UI. Each hook wraps one or more API functions using `useQuery` / `useMutation` from React Query, handling caching, loading states, and cache invalidation automatically:

- **`useAccounts.js`** — fetches the account list; exposes mutations to create, update, and delete accounts and manage holdings.
- **`useDashboard.js`** — fetches the portfolio summary.
- **`useExpenses.js`** — fetches categories and expense entries; exposes mutations for CRUD.
- **`useRetirement.js`** — fetches the retirement calculation and config; exposes a mutation to save config changes.

### Pages (`src/pages/`)

Each page component is a full-screen view routed from `App.jsx`. Pages compose domain components together and pass data down:

- **`DashboardPage.jsx`** — the home view. Renders `MarketDataBar`, `QuickStats`, `AssetAllocation`, `IncomeComparison`, and `RefreshButton`.
- **`AccountsPage.jsx`** — renders `AccountList` (with an embedded `AccountForm` for adding/editing) and `HoldingsList` for a selected account.
- **`ExpenseTrackerPage.jsx`** — the primary expense management page. Renders `ExpenseEntry`, `RecurringExpenses`, `OneTimeExpenses`, `ExpenseSummary`, and `ExpenseAnalytics`.
- **`ExpensesPage.jsx`** — a secondary expenses view using `ExpenseCategoryCard` and `ExpenseList`.
- **`RetirementPage.jsx`** — renders `RetirementProgress`, `IncomeAnalysis`, and `RetirementTimeline` using data from `useRetirement`.
- **`PortfolioManagementPage.jsx`** — renders `PortfolioRecommendations`, `OptimalAllocation`, `RebalancingAnalysis`, `ScenarioPlanner`, `YearProjection`, and `MonteCarloSimulation`.
- **`SummaryPage.jsx`** — renders `RetirementSummary` and `YearByYearProjection`.
- **`LoginPage.jsx`** / **`RegisterPage.jsx`** — authentication forms that call `/api/auth/login` and `/api/auth/register` via the API layer.

### Components (`src/components/`)

Components are organized by domain, each paired with a same-name `.css` file:

**`layout/`** — `Layout.jsx` provides the persistent page shell (sidebar / top bar); `Navigation.jsx` renders the nav links to each page.

**`dashboard/`** — `QuickStats.jsx` shows total net worth, account count, and annual dividend income. `AssetAllocation.jsx` renders the portfolio allocation breakdown. `IncomeComparison.jsx` visualizes dividend income vs. expenses. `MarketDataBar.jsx` displays the live market data bar. `RefreshButton.jsx` triggers a manual data refresh.

**`accounts/`** — `AccountList.jsx` renders the list of brokerage accounts; `AccountForm.jsx` is the add/edit form; `HoldingsList.jsx` shows all positions in a selected account.

**`expenses/`** — `ExpenseEntry.jsx`, `RecurringExpenses.jsx`, `OneTimeExpenses.jsx`, `ExpenseSummary.jsx`, `ExpenseAnalytics.jsx`, `ExpenseCategoryCard.jsx`, `ExpenseList.jsx` together cover full expense CRUD and visualization.

**`retirement/`** — `RetirementProgress.jsx` shows a progress bar toward the portfolio target. `IncomeAnalysis.jsx` breaks down income vs. expenses with Social Security. `RetirementTimeline.jsx` renders a visual timeline of key age milestones.

**`portfolio/`** — `RebalancingAnalysis.jsx` shows rebalancing instructions. `OptimalAllocation.jsx` shows model vs. actual allocation. `PortfolioRecommendations.jsx` shows recommended asset mix. `ScenarioPlanner.jsx` lets you tweak assumptions for a what-if scenario. `YearProjection.jsx` tables the year-by-year projection. `MonteCarloSimulation.jsx` visualizes Monte Carlo outcome ranges.

**`summary/`** — `RetirementSummary.jsx` and `YearByYearProjection.jsx` are higher-level summary views.

**`scenarios/`** — `BearMarketRebalancer.jsx` is a specialized scenario component for stress-testing a bear market rebalancing strategy.

**`common/`** — `Tooltip.jsx` is a reusable tooltip component.

### Utilities (`src/utils/`)

- **`calculations.js`** — pure financial calculation helpers (e.g., compound growth, dividend income projections) used in components without going to the API.
- **`formatters.js`** — currency and percentage formatting helpers.
- **`constants.js`** — shared constants (asset types, account types, brokerage names, etc.).

### Build Output (`dist/`)

**`dist/`** is the production build artifact created by `vite build`. It contains a single `index.html`, a minified JS bundle (`index-CYVI76BS.js`), and a CSS bundle (`index-DzjsYWr8.css`). This folder is served as a static site in production and is gitignored.

---

## Agents (`agents/`)

The agents folder contains Python scripts that use the **Anthropic API** to programmatically diagnose the running application. They are run on-demand to produce a health report.

- **`orchestration_agent.py`** — the top-level runner. It calls `page_load_agent.run()` then (after a 60-second cooldown) `connectivity_agent.run()`, feeds both reports to Claude for an executive summary, and writes a timestamped Markdown diagnostic report to `agents/reports/`.
- **`page_load_agent.py`** — measures how fast the frontend dashboard loads (page load performance).
- **`connectivity_agent.py`** — tests that all backend API endpoints and external data sources are reachable and responding correctly.
- **`run_agents.py`** — a simple entry-point script to launch the orchestration agent from the command line.
- **`keychain.py`** — loads the Anthropic API key from macOS Keychain so it doesn't need to be stored in plaintext.
- **`reports/`** — timestamped Markdown diagnostic reports written by the orchestration agent after each run.

---

## .claude Configuration (`.claude/`)

This directory holds Claude Code automation tooling for the project:

- **`skills/`** — shell and Markdown skill files for common maintenance tasks: `recalculate.sh` / `recalculate-wrapper.sh` recompute portfolio figures; `refresh-dashboard.sh` and `refresh-market-data.md` refresh live data; `backup-data.md`, `init-database.md`, `push-changes.md`, `start-servers.md`, `startup.md`, `status.md`, `sync.md` cover common operational workflows. `DATA_CONSISTENCY_RULES.md` documents rules Claude should follow when modifying data.
- **`logs/`** — output logs from automated skill runs (`cron.log`, `recalculation_20260302.log`, `refresh_20260302.log`).
- **`docs/`** — reference documents generated by Claude (`AAPL_5Year_Analysis.md`, `MCP_SERVERS.md`).

---

## Supporting Documents (root-level)

Several Markdown files and a spreadsheet at the project root capture the financial strategy and design decisions that the application models:

- **`CLAUDE.md`** — instructions for Claude when working in this project (how to start servers, key conventions, etc.).
- **`README.md`** — overview and setup instructions.
- **`TWO_SLEEVE_STRATEGY.md`** / **`TWO_SLEEVE_EARLY_RETIREMENT.md`** — detailed write-ups of the income-sleeve + growth-sleeve portfolio strategy that the `RetirementConfig` model implements.
- **`MEDICARE_AND_AGE_BASED_EXPENSES.md`** — notes on how Medicare costs are projected into retirement expenses.
- **`ONE_TIME_EXPENSES_SUMMARY.md`** — documentation on how one-time expenses (home repair, travel, etc.) are handled in projections.
- **`FINAL_RECOMMENDATION.md`**, **`FIXES.md`**, **`OPTIMIZATIONS.md`** — historical decision and fix logs.
- **`Retirement Plan Scenario5 Delayed Growth Reinvest.xlsx`** — the original Excel model that informed the application's projection logic.

---

## How the Pieces Connect

The data flows from backend to frontend like this:

1. The **database** (`portfolio_tracker.db`) stores all persistent state, described by **`models.py`**.
2. **FastAPI routers** query the database via SQLAlchemy sessions (injected from `database.py`), validate inputs with **`schemas.py`**, and return JSON responses.
3. **`main.py`** registers all routers under `/api` and handles CORS so the frontend can talk to it.
4. The frontend's **`api/client.js`** creates an Axios instance pointing at the FastAPI server.
5. **`api/*.js`** modules call specific endpoints; **`hooks/*.js`** wrap those calls in React Query for caching and state management.
6. **Pages** consume hooks and render **components**, each paired with a `.css` file for styles.
7. **`App.jsx`** wires pages to URL routes behind `ProtectedRoute`, with auth state managed by `AuthContext`.
8. The **agents** sit outside this flow — they run separately, call the same API endpoints (plus the frontend URL) to test health, and write Markdown reports.
