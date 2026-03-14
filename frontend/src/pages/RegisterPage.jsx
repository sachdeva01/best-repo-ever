import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function RegisterPage() {
  const { register } = useAuth()
  const navigate = useNavigate()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    if (password !== confirm) { setError('Passwords do not match'); return }
    setLoading(true)
    try {
      await register(username, password)
      navigate('/dashboard', { replace: true })
    } catch (err) {
      setError(err.response?.data?.detail || 'Registration failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={styles.page}>
      <div style={styles.card}>
        <h1 style={styles.title}>Portfolio Tracker</h1>
        <h2 style={styles.subtitle}>Create account</h2>

        <form onSubmit={handleSubmit} style={styles.form}>
          <label style={styles.label}>Username</label>
          <input
            style={styles.input}
            type="text"
            autoComplete="username"
            value={username}
            onChange={e => setUsername(e.target.value)}
            required
          />

          <label style={styles.label}>Password</label>
          <input
            style={styles.input}
            type="password"
            autoComplete="new-password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            required
          />

          <label style={styles.label}>Confirm password</label>
          <input
            style={styles.input}
            type="password"
            autoComplete="new-password"
            value={confirm}
            onChange={e => setConfirm(e.target.value)}
            required
          />

          {error && <p style={styles.error}>{error}</p>}

          <button style={styles.button} type="submit" disabled={loading}>
            {loading ? 'Creating account…' : 'Create account'}
          </button>
        </form>

        <p style={styles.footer}>
          Already have an account?{' '}
          <Link to="/login" style={styles.link}>Sign in</Link>
        </p>
      </div>
    </div>
  )
}

const styles = {
  page: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: '#f0f2f5',
  },
  card: {
    background: '#fff',
    borderRadius: 12,
    padding: '2.5rem',
    width: '100%',
    maxWidth: 400,
    boxShadow: '0 4px 24px rgba(0,0,0,0.08)',
  },
  title: {
    margin: '0 0 0.25rem',
    fontSize: '1.4rem',
    fontWeight: 700,
    color: '#1a1a2e',
    textAlign: 'center',
  },
  subtitle: {
    margin: '0 0 1.75rem',
    fontSize: '1rem',
    fontWeight: 400,
    color: '#666',
    textAlign: 'center',
  },
  form: { display: 'flex', flexDirection: 'column', gap: '0.5rem' },
  label: { fontSize: '0.875rem', fontWeight: 500, color: '#333' },
  input: {
    padding: '0.65rem 0.85rem',
    borderRadius: 8,
    border: '1px solid #ddd',
    fontSize: '1rem',
    outline: 'none',
    marginBottom: '0.75rem',
  },
  error: { color: '#e53935', fontSize: '0.875rem', margin: '0.25rem 0' },
  button: {
    marginTop: '0.5rem',
    padding: '0.75rem',
    borderRadius: 8,
    border: 'none',
    background: '#2563eb',
    color: '#fff',
    fontSize: '1rem',
    fontWeight: 600,
    cursor: 'pointer',
  },
  footer: { textAlign: 'center', marginTop: '1.5rem', fontSize: '0.875rem', color: '#666' },
  link: { color: '#2563eb', textDecoration: 'none', fontWeight: 500 },
}
