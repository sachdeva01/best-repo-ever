from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from database import engine, Base
from routers import accounts, holdings, expenses, retirement, market_data, portfolio_builder, dashboard, expected_returns, rebalancing, scenario, portfolio_allocation, monte_carlo, year_projection

# Create tables on startup
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="Portfolio Tracker API",
    version="1.0.0",
    description="Capital preservation retirement planning with dividend income strategy"
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],  # Vite dev server
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(accounts.router, prefix="/api", tags=["accounts"])
app.include_router(holdings.router, prefix="/api", tags=["holdings"])
app.include_router(expenses.router, prefix="/api", tags=["expenses"])
app.include_router(retirement.router, prefix="/api", tags=["retirement"])
app.include_router(market_data.router, prefix="/api", tags=["market-data"])
app.include_router(portfolio_builder.router, prefix="/api", tags=["portfolio"])
app.include_router(dashboard.router, prefix="/api", tags=["dashboard"])
app.include_router(expected_returns.router, prefix="/api", tags=["expected-returns"])
app.include_router(rebalancing.router, prefix="/api", tags=["rebalancing"])
app.include_router(scenario.router, prefix="/api", tags=["scenario"])
app.include_router(portfolio_allocation.router, prefix="/api", tags=["portfolio-allocation"])
app.include_router(monte_carlo.router, prefix="/api", tags=["monte-carlo"])
app.include_router(year_projection.router, prefix="/api", tags=["year-projection"])

@app.get("/")
async def root():
    return {"message": "Welcome to Portfolio Tracker API"}

@app.get("/api/health")
async def health_check():
    return {"status": "healthy"}
