# Startup with Fresh Data

Start the application with both servers running and fresh market data loaded.

## What this does
1. Syncs with GitHub (pulls latest, pushes any uncommitted changes)
2. Starts FastAPI backend on port 8000
3. Starts React frontend on port 5173
4. Waits for backend to be ready
5. Automatically refreshes all market data
6. Updates portfolio allocation with latest ETF prices and yields

## Usage
Invoke with: `/startup`

This is your one-command startup for a complete dev session with fresh data.

## Implementation

```bash
echo "🚀 Starting Portfolio Tracker with Fresh Market Data"
echo "===================================================="
echo ""

# Sync with GitHub first
echo "0️⃣  Syncing with GitHub..."
git fetch origin > /dev/null 2>&1

BEHIND=$(git rev-list --count HEAD..origin/main 2>/dev/null || echo "0")
AHEAD=$(git rev-list --count origin/main..HEAD 2>/dev/null || echo "0")

if [ "$BEHIND" -gt 0 ]; then
    echo "   📥 Pulling $BEHIND commit(s) from GitHub..."
    git pull origin main --rebase > /dev/null 2>&1
    if [ $? -eq 0 ]; then
        echo "   ✅ Repository updated"
    else
        echo "   ⚠️  Pull failed. Continuing anyway..."
    fi
fi

if [ -n "$(git status --porcelain)" ]; then
    echo "   📝 Uncommitted changes detected - committing..."
    git add . > /dev/null 2>&1
    git commit -m "Auto-commit before startup" > /dev/null 2>&1
    AHEAD=$(git rev-list --count origin/main..HEAD 2>/dev/null || echo "0")
fi

if [ "$AHEAD" -gt 0 ]; then
    echo "   📤 Pushing $AHEAD commit(s) to GitHub..."
    git push origin main > /dev/null 2>&1
    if [ $? -eq 0 ]; then
        echo "   ✅ Changes backed up to GitHub"
    else
        echo "   ⚠️  Push failed. Changes remain local."
    fi
fi

echo "   ✅ GitHub sync complete"
echo ""

# Check if ports are already in use
BACKEND_RUNNING=$(lsof -i :8000 -t 2>/dev/null)
FRONTEND_RUNNING=$(lsof -i :5173 -t 2>/dev/null)

if [ -n "$BACKEND_RUNNING" ]; then
    echo "⚠️  Backend already running on port 8000 (PID: $BACKEND_RUNNING)"
    echo "   Continuing with existing backend..."
else
    echo "1️⃣  Starting Backend Server..."
    cd backend
    if [ ! -d "venv" ]; then
        echo "   ❌ Virtual environment not found!"
        echo "   Please run: cd backend && python3 -m venv venv && pip install -r requirements.txt"
        exit 1
    fi
    source venv/bin/activate
    nohup uvicorn main:app --reload --port 8000 > /dev/null 2>&1 &
    BACKEND_PID=$!
    cd ..
    echo "   ✅ Backend started (PID: $BACKEND_PID)"
    echo "   📚 API docs: http://localhost:8000/docs"

    # Wait for backend to be ready
    echo "   ⏳ Waiting for backend to initialize..."
    for i in {1..30}; do
        if curl -s http://localhost:8000/api/health > /dev/null 2>&1; then
            echo "   ✅ Backend ready!"
            break
        fi
        sleep 1
        if [ $i -eq 30 ]; then
            echo "   ⚠️  Backend taking longer than expected"
        fi
    done
fi
echo ""

if [ -n "$FRONTEND_RUNNING" ]; then
    echo "⚠️  Frontend already running on port 5173 (PID: $FRONTEND_RUNNING)"
else
    echo "2️⃣  Starting Frontend Server..."
    cd frontend
    if [ ! -d "node_modules" ]; then
        echo "   ❌ Node modules not found!"
        echo "   Please run: cd frontend && npm install"
        exit 1
    fi
    nohup npm run dev > /dev/null 2>&1 &
    FRONTEND_PID=$!
    cd ..
    echo "   ✅ Frontend started (PID: $FRONTEND_PID)"
    echo "   🌐 App: http://localhost:5173"
fi
echo ""

# Refresh market data
echo "3️⃣  Refreshing Market Data..."
sleep 2  # Give backend a moment to fully initialize

# Market indicators
echo "   📊 Updating market indicators..."
curl -s -X POST http://localhost:8000/api/market-data/refresh > /dev/null 2>&1
if [ $? -eq 0 ]; then
    MARKET_DATA=$(curl -s http://localhost:8000/api/market-data)
    echo "   ✅ Market indicators refreshed"
else
    echo "   ⚠️  Could not refresh market indicators"
fi

# Portfolio allocation
echo "   💼 Fetching fresh ETF data (15 ETFs)..."
ALLOCATION_RESPONSE=$(curl -s http://localhost:8000/api/portfolio-allocation/calculate)
if [ $? -eq 0 ]; then
    WEIGHTED_YIELD=$(echo "$ALLOCATION_RESPONSE" | grep -o '"weighted_average_yield":[0-9.]*' | cut -d: -f2)
    echo "   ✅ Portfolio allocation updated"
    if [ -n "$WEIGHTED_YIELD" ]; then
        echo "   📈 Optimal Portfolio Yield: ${WEIGHTED_YIELD}%"
    fi
else
    echo "   ⚠️  Could not fetch portfolio allocation"
fi

# Historical performance
echo "   📈 Loading historical performance data..."
curl -s http://localhost:8000/api/portfolio-allocation/historical-performance > /dev/null 2>&1
if [ $? -eq 0 ]; then
    echo "   ✅ Historical data loaded (3yr, 5yr, 10yr, 20yr)"
else
    echo "   ⚠️  Could not load historical performance"
fi
echo ""

# Get current stats
DASHBOARD_RESPONSE=$(curl -s http://localhost:8000/api/dashboard/quick-stats)
if [ $? -eq 0 ]; then
    NET_WORTH=$(echo "$DASHBOARD_RESPONSE" | grep -o '"total_net_worth":[0-9.]*' | cut -d: -f2)
    ANNUAL_INCOME=$(echo "$DASHBOARD_RESPONSE" | grep -o '"annual_dividend_income":[0-9.]*' | cut -d: -f2)

    echo "📊 Current Portfolio Status:"
    if [ -n "$NET_WORTH" ]; then
        echo "   💰 Total Net Worth: \$$(printf "%'.0f" $NET_WORTH 2>/dev/null || echo $NET_WORTH)"
    fi
    if [ -n "$ANNUAL_INCOME" ]; then
        echo "   💵 Annual Dividend Income: \$$(printf "%'.0f" $ANNUAL_INCOME 2>/dev/null || echo $ANNUAL_INCOME)"
    fi
    echo ""
fi

echo "✅ Portfolio Tracker Ready with Fresh Data!"
echo ""
echo "🔗 Quick Links:"
echo "   Dashboard:    http://localhost:5173/dashboard"
echo "   Portfolio:    http://localhost:5173/portfolio-management"
echo "   Accounts:     http://localhost:5173/accounts"
echo "   Expenses:     http://localhost:5173/expense-tracker"
echo "   Retirement:   http://localhost:5173/retirement"
echo ""
echo "📚 Backend API:  http://localhost:8000/docs"
echo ""
echo "💡 Tip: Market data is cached for 15 minutes. Run /refresh-market-data to update."
```

## Notes
- This is your primary startup command for daily work
- **Automatically syncs with GitHub first** to ensure you're working with latest code
- Combines server startup with automatic data refresh
- Backend initializes first, then frontend, then data loads
- Waits for backend to be ready before fetching data
- Fresh ETF prices, yields, and historical returns loaded on startup
- All 15 ETFs in optimal allocation updated automatically
- Safe to run multiple times - checks if servers are already running

## What Gets Refreshed
- **Market Indicators:** 10-year Treasury, S&P 500, Nasdaq
- **ETF Data:** Current prices and dividend yields for all 15 ETFs
- **Historical Returns:** 3yr, 5yr, 10yr, 20yr performance
- **Portfolio Stats:** Total net worth, annual dividend income
- **Optimal Allocation:** Recalculated weights for 4.31% target yield

## Troubleshooting
If startup fails:
- Check virtual environment exists: `ls backend/venv`
- Check node modules exist: `ls frontend/node_modules`
- Check internet connection for market data API
- Check ports 8000 and 5173 are available
- Run `/status` to diagnose issues
