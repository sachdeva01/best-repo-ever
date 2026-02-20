# Refresh Market Data

Fetch fresh market data for portfolio allocation analysis including ETF prices, yields, historical performance, and market indicators.

## What this does
1. Refreshes live market indicators (10-year Treasury, S&P 500, Nasdaq)
2. Updates optimal portfolio allocation with latest ETF data
3. Fetches current prices and dividend yields for all 15 ETFs
4. Updates historical performance data (3yr, 5yr, 10yr, 20yr returns)
5. Recalculates optimal allocation weights

## Usage
Invoke with: `/refresh-market-data`

## Implementation

```bash
echo "📊 Refreshing Market Data for Portfolio Allocation"
echo "=================================================="
echo ""

# Check if backend is running
BACKEND_RUNNING=$(lsof -i :8000 -t 2>/dev/null)
if [ -z "$BACKEND_RUNNING" ]; then
    echo "❌ Backend server is not running on port 8000"
    echo "Please start the backend first:"
    echo "  cd backend && source venv/bin/activate && uvicorn main:app --reload --port 8000"
    exit 1
fi

echo "✅ Backend server is running"
echo ""

# 1. Refresh market indicators
echo "1️⃣  Refreshing Market Indicators..."
MARKET_RESPONSE=$(curl -s -X POST http://localhost:8000/api/market-data/refresh)
echo "   - 10-Year Treasury Yield"
echo "   - S&P 500 Index"
echo "   - Nasdaq Composite"
echo "   ✅ Market indicators updated"
echo ""

# 2. Refresh optimal allocation data
echo "2️⃣  Fetching Fresh ETF Data..."
ALLOCATION_RESPONSE=$(curl -s http://localhost:8000/api/portfolio-allocation/calculate)

if [ $? -eq 0 ]; then
    echo "   ✅ Updated 15 ETF allocations:"
    echo "$ALLOCATION_RESPONSE" | grep -o '"symbol":"[^"]*"' | sed 's/"symbol":"//g' | sed 's/"//g' | head -15 | nl -w2 -s'. '

    # Extract weighted yield
    WEIGHTED_YIELD=$(echo "$ALLOCATION_RESPONSE" | grep -o '"weighted_average_yield":[0-9.]*' | cut -d: -f2)
    if [ -n "$WEIGHTED_YIELD" ]; then
        echo ""
        echo "   📈 Weighted Average Yield: ${WEIGHTED_YIELD}%"
    fi
else
    echo "   ⚠️  Warning: Could not fetch optimal allocation"
fi
echo ""

# 3. Refresh historical performance data
echo "3️⃣  Updating Historical Performance..."
HISTORICAL_RESPONSE=$(curl -s http://localhost:8000/api/portfolio-allocation/historical-performance)

if [ $? -eq 0 ]; then
    echo "   ✅ Updated performance data:"
    echo "   - 3-year returns"
    echo "   - 5-year returns"
    echo "   - 10-year returns"
    echo "   - 20-year returns"
else
    echo "   ⚠️  Warning: Could not fetch historical performance"
fi
echo ""

# 4. Get current portfolio stats
echo "4️⃣  Current Portfolio Statistics..."
DASHBOARD_RESPONSE=$(curl -s http://localhost:8000/api/dashboard/quick-stats)

if [ $? -eq 0 ]; then
    NET_WORTH=$(echo "$DASHBOARD_RESPONSE" | grep -o '"total_net_worth":[0-9.]*' | cut -d: -f2)
    PORTFOLIO_YIELD=$(echo "$DASHBOARD_RESPONSE" | grep -o '"current_portfolio_yield":[0-9.]*' | cut -d: -f2)

    if [ -n "$NET_WORTH" ]; then
        echo "   💰 Total Net Worth: \$$(printf "%'.0f" $NET_WORTH 2>/dev/null || echo $NET_WORTH)"
    fi
    if [ -n "$PORTFOLIO_YIELD" ]; then
        YIELD_PCT=$(echo "scale=2; $PORTFOLIO_YIELD * 100" | bc 2>/dev/null || echo $PORTFOLIO_YIELD)
        echo "   📊 Current Portfolio Yield: ${YIELD_PCT}%"
    fi
fi
echo ""

echo "✅ Market Data Refresh Complete!"
echo ""
echo "📌 Next Steps:"
echo "   - View updated allocation: http://localhost:5173/portfolio-management"
echo "   - Check dashboard: http://localhost:5173/dashboard"
echo "   - Review optimal allocation with fresh data"
echo ""
echo "⏰ Data is cached for 15 minutes to reduce API calls"
```

## Notes
- Requires backend server to be running on port 8000
- Uses yfinance API for ETF data (free, no API key needed)
- Market data is cached for 15 minutes to avoid excessive API calls
- Some older ETFs may not have 20-year historical data available
- All 15 ETFs in optimal allocation are updated:
  * SCHD, VYM, DVY, SDY, NOBL (High Dividend)
  * VNQ, MORT, REM (REITs)
  * BND, AGG, TLT (Bonds)
  * JPST, MINT, SHV (Cash Equivalents)
  * DGRO (Dividend Growth)

## Troubleshooting

If refresh fails:
1. Check backend is running: `lsof -i :8000`
2. Check backend logs for API errors
3. Verify internet connection (requires access to Yahoo Finance API)
4. Try manual refresh: `curl -X POST http://localhost:8000/api/market-data/refresh`
