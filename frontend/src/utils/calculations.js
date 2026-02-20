export const calculateInflatedExpenses = (currentExpenses, years, inflationRate = 0.03) => {
  return currentExpenses * Math.pow(1 + inflationRate, years)
}

export const calculateRequiredYield = (annualExpenses, portfolioValue) => {
  return (annualExpenses / portfolioValue) * 100
}

export const calculateProgress = (current, target) => {
  return (current / target) * 100
}

export const calculateRequiredGrowthRate = (current, target, years) => {
  return (Math.pow(target / current, 1 / years) - 1) * 100
}
