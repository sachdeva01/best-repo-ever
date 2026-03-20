import { createContext, useContext, useState, useEffect } from 'react'
import axios from 'axios'

const AuthContext = createContext(null)

const API = `${import.meta.env.VITE_API_URL || 'http://localhost:8000'}/api/auth`

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const token = localStorage.getItem('token')
    if (!token) { setLoading(false); return }

    axios.get(`${API}/me`, { headers: { Authorization: `Bearer ${token}` } })
      .then(res => setUser(res.data))
      .catch(() => localStorage.removeItem('token'))
      .finally(() => setLoading(false))
  }, [])

  async function login(username, password) {
    const res = await axios.post(`${API}/login`, { username, password })
    localStorage.setItem('token', res.data.access_token)
    const me = await axios.get(`${API}/me`, {
      headers: { Authorization: `Bearer ${res.data.access_token}` }
    })
    setUser(me.data)
  }

  async function register(username, password) {
    await axios.post(`${API}/register`, { username, password })
    await login(username, password)
  }

  function logout() {
    localStorage.removeItem('token')
    setUser(null)
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}
