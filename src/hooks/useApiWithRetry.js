import { useState, useEffect, useCallback } from 'react'

const defaultOptions = {
  retries: 2,
  retryDelay: 1000,
  retryCondition: (err) => err?.response?.status >= 500 || err?.code === 'ECONNABORTED',
}

/**
 * useApi with retry on failure. Use for critical fetches.
 * @param {() => Promise} apiFunction
 * @param {Array} dependencies
 * @param {{ retries: number, retryDelay: number, retryCondition: (err) => boolean }} options
 */
export function useApiWithRetry(apiFunction, dependencies = [], options = {}) {
  const opts = { ...defaultOptions, ...options }
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const fetchData = useCallback(async () => {
    let lastError
    for (let attempt = 0; attempt <= opts.retries; attempt++) {
      try {
        setLoading(true)
        setError(null)
        const response = await apiFunction()
        setData(response.data)
        return
      } catch (err) {
        lastError = err
        if (attempt < opts.retries && opts.retryCondition(err)) {
          await new Promise((r) => setTimeout(r, opts.retryDelay))
        } else {
          break
        }
      } finally {
        setLoading(false)
      }
    }
    setError(lastError?.response?.data?.message || lastError?.message || 'An error occurred')
  }, [apiFunction, opts.retries, opts.retryDelay, opts.retryCondition])

  useEffect(() => {
    fetchData()
  }, dependencies)

  return { data, loading, error, refetch: fetchData }
}
