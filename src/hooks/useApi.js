import { useState, useEffect } from 'react'

/**
 * Custom hook for API calls with loading and error states
 */
export const useApi = (apiFunction, dependencies = []) => {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const fetchData = async () => {
    try {
      setLoading(true)
      setError(null)
      const response = await apiFunction()
      setData(response.data)
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'An error occurred')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
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

  const submit = async (data) => {
    try {
      setLoading(true)
      setError(null)
      setSuccess(false)
      await submitFunction(data)
      setSuccess(true)
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'An error occurred')
    } finally {
      setLoading(false)
    }
  }

  return { submit, loading, error, success, reset: () => { setError(null); setSuccess(false) } }
}

