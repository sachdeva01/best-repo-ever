export const queryKeys = {
  dashboard: {
    all: ['dashboard'],
    quickStats: () => [...queryKeys.dashboard.all, 'quickStats'],
    allocation: () => [...queryKeys.dashboard.all, 'allocation'],
  },
  marketData: {
    all: ['marketData'],
  },
  expectedReturns: {
    all: ['expectedReturns'],
    income: () => [...queryKeys.expectedReturns.all, 'income'],
  },
  retirement: {
    all: ['retirement'],
    calculation: () => [...queryKeys.retirement.all, 'calculation'],
    config: () => [...queryKeys.retirement.all, 'config'],
    projection: () => [...queryKeys.retirement.all, 'projection'],
  },
  expenses: {
    all: ['expenses'],
    categories: () => [...queryKeys.expenses.all, 'categories'],
    summary: () => [...queryKeys.expenses.all, 'summary'],
    totalAnnual: () => [...queryKeys.expenses.all, 'totalAnnual'],
    list: (filters) => [...queryKeys.expenses.all, 'list', filters],
    recurring: () => [...queryKeys.expenses.all, 'recurring'],
    oneTime: (years) => [...queryKeys.expenses.all, 'oneTime', years],
    monthlyAnalytics: (year) => [...queryKeys.expenses.all, 'monthlyAnalytics', year],
    detailedSummary: (startDate, endDate) => [...queryKeys.expenses.all, 'detailedSummary', startDate, endDate],
  },
  accounts: {
    all: ['accounts'],
    detail: (id) => [...queryKeys.accounts.all, id],
    holdings: (accountId) => ['holdings', { accountId }],
  },
  portfolio: {
    all: ['portfolio'],
    rebalancing: () => [...queryKeys.portfolio.all, 'rebalancing'],
    recommendations: () => [...queryKeys.portfolio.all, 'recommendations'],
    allocation: () => [...queryKeys.portfolio.all, 'allocation'],
    historicalPerformance: () => [...queryKeys.portfolio.all, 'historicalPerformance'],
  },
  scenario: {
    all: ['scenario'],
    presets: () => [...queryKeys.scenario.all, 'presets'],
  },
  monteCarlo: {
    all: ['monteCarlo'],
    simulation: (count) => [...queryKeys.monteCarlo.all, 'simulation', count],
  },
  yearProjection: {
    all: ['yearProjection'],
  },
}
