import { useExpenseCategories } from '../hooks/useExpenses'
import ExpenseCategoryCard from '../components/expenses/ExpenseCategoryCard'
import ExpenseSummary from '../components/expenses/ExpenseSummary'
import './ExpensesPage.css'

function ExpensesPage() {
  const { categories, summary, loading, error, updateCategory } = useExpenseCategories()

  const handleUpdateCategory = async (categoryId, data) => {
    try {
      await updateCategory(categoryId, data)
    } catch (err) {
      console.error('Failed to update category:', err)
      throw err
    }
  }

  return (
    <div className="expenses-page">
      <div className="page-header">
        <div>
          <h2>Expense Categories</h2>
          <p className="page-subtitle">
            Manage your annual expenses by category. This is the income you need from your portfolio.
          </p>
        </div>
      </div>

      {error && <div className="error">{error}</div>}

      {loading ? (
        <div className="loading">Loading expenses...</div>
      ) : (
        <>
          <ExpenseSummary summary={summary} />

          <div className="categories-section">
            <div className="section-header">
              <h3>Categories</h3>
              <p className="section-description">
                Click "Edit" on any category to update the annual amount. Changes will immediately update your retirement calculations.
              </p>
            </div>

            <div className="categories-grid">
              {categories.map(category => (
                <ExpenseCategoryCard
                  key={category.id}
                  category={category}
                  onUpdate={handleUpdateCategory}
                />
              ))}
            </div>
          </div>

          <div className="info-section">
            <div className="info-card">
              <h4>💡 How This Works</h4>
              <p>
                Your total annual expenses represent the income you need to generate from your portfolio
                through dividends and interest. The capital preservation strategy aims to cover all expenses
                without touching your principal.
              </p>
            </div>
            <div className="info-card">
              <h4>📈 Inflation Adjustment</h4>
              <p>
                The retirement calculator automatically adjusts these expenses for 3% annual inflation.
                At age 55 (withdrawal start), your expenses will be higher than today's amounts.
              </p>
            </div>
          </div>
        </>
      )}
    </div>
  )
}

export default ExpensesPage
