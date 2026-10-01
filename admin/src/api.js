const API_URL = (import.meta.env.VITE_API_URL || 'http://127.0.0.1:5000').replace(/\/$/, '')

export async function api(path, options = {}) {
  const { method = 'GET', body, headers: customHeaders = {} } = options
  let auth = null
  try {
    auth = JSON.parse(localStorage.getItem('portfolio-cms-auth') || 'null')
  } catch {
    localStorage.removeItem('portfolio-cms-auth')
  }
  const headers = { ...customHeaders }
  if (body && !(body instanceof FormData)) headers['Content-Type'] = 'application/json'
  if (auth?.accessToken) headers.Authorization = `Bearer ${auth.accessToken}`
  const send = (requestHeaders) => fetch(`${API_URL}${path}`, {
    method,
    headers: requestHeaders,
    body: body instanceof FormData ? body : body ? JSON.stringify(body) : undefined,
  })

  let response = await send(headers)
  if (response.status === 401 && auth?.refreshToken && path !== '/auth/login' && path !== '/auth/refresh') {
    const refreshed = await fetch(`${API_URL}/auth/refresh`, {
      method: 'POST', headers: { Authorization: `Bearer ${auth.refreshToken}` },
    })
    if (refreshed.ok) {
      const result = await refreshed.json()
      auth = { ...auth, accessToken: result.data.access_token }
      localStorage.setItem('portfolio-cms-auth', JSON.stringify(auth))
      headers.Authorization = `Bearer ${auth.accessToken}`
      response = await send(headers)
    } else {
      localStorage.removeItem('portfolio-cms-auth')
      window.dispatchEvent(new Event('cms-session-expired'))
    }
  }

  const result = await response.json().catch(() => ({}))
  if (!response.ok) throw new Error(result.error?.message || 'The server could not complete this request.')
  return result.data
}

export { API_URL }