import { useState, useEffect, useRef } from 'react'

/**
 * Custom hook for API calls with loading and error states
 */
export const useApi = (apiFunction, dependencies = []) => {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const requestId = useRef(0)
  const fetchData = async () => {
    const id = ++requestId.current
    try {
      setLoading(true)
      setError(null)
      const response = await apiFunction()
      if (id === requestId.current) setData(response.data)
    } catch (err) {
      if (id === requestId.current) setError(err.response?.data?.error || err.response?.data?.message || err.message || 'An error occurred')
    } finally {
      if (id === requestId.current) setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
    return () => { requestId.current += 1 }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, dependencies)

  return { data, loading, error, refetch: fetchData }
}

/**
 * Custom hook for form submissions
 */
export const useFormSubmit = (submitFunction) => {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(false)

  const busy = useRef(false)
  const submit = async (data) => {
    if (busy.current) return
    busy.current = true
    try {
      setLoading(true)
      setError(null)
      setSuccess(false)
      const result = await submitFunction(data)
      setSuccess(true)
      return result
    } catch (err) {
      setError(err.response?.data?.error || err.response?.data?.message || err.message || 'An error occurred')
    } finally {
      busy.current = false
      setLoading(false)
    }
  }

  return { submit, loading, error, success, reset: () => { setError(null); setSuccess(false) } }
}


