import apiClient from './client'

// Accounts
export const fetchAccounts = async () => {
  const { data } = await apiClient.get('/api/accounts')
  return data
}

export const fetchAccountById = async (id) => {
  const { data } = await apiClient.get(`/api/accounts/${id}`)
  return data
}

export const createAccount = async (accountData) => {
  const { data } = await apiClient.post('/api/accounts', accountData)
  return data
}

export const updateAccount = async (id, accountData) => {
  const { data } = await apiClient.put(`/api/accounts/${id}`, accountData)
  return data
}

export const deleteAccount = async (id) => {
  await apiClient.delete(`/api/accounts/${id}`)
}

export const fetchAccountHistory = async (id) => {
  const { data } = await apiClient.get(`/api/accounts/${id}/history`)
  return data
}

export const createAccountSnapshot = async (id, snapshotData) => {
  const { data } = await apiClient.post(`/api/accounts/${id}/snapshot`, snapshotData)
  return data
}

// Holdings
export const fetchHoldings = async (accountId = null) => {
  const params = accountId ? { account_id: accountId } : {}
  const { data } = await apiClient.get('/api/holdings', { params })
  return data
}

export const createHolding = async (holdingData) => {
  const { data } = await apiClient.post('/api/holdings', holdingData)
  return data
}

export const updateHolding = async (id, holdingData) => {
  const { data } = await apiClient.put(`/api/holdings/${id}`, holdingData)
  return data
}

export const deleteHolding = async (id) => {
  await apiClient.delete(`/api/holdings/${id}`)
}
