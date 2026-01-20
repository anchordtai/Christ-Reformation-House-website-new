import { AlertCircle } from 'lucide-react'

const Error = ({ message = 'An error occurred. Please try again.' }) => {
  return (
    <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex items-start">
      <AlertCircle className="w-5 h-5 mr-2 mt-0.5 flex-shrink-0" />
      <p>{message}</p>
    </div>
  )
}

export default Error




