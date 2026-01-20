import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Play, Calendar, User, Search } from 'lucide-react'
import { format } from 'date-fns'
import { useApi } from '../hooks/useApi'
import { sermonService } from '../services/api'
import Loading from '../components/Loading'
import Error from '../components/Error'

const Sermons = () => {
  const [searchTerm, setSearchTerm] = useState('')
  const { data: sermons = [], loading, error } = useApi(() => sermonService.getAll())
  
  const filteredSermons = sermons.filter(sermon =>
    sermon.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    sermon.speaker?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    sermon.category?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  if (loading) return <Loading message="Loading sermons..." />
  if (error) return <Error message={error} />

  return (
    <div>
      {/* Hero Section */}
      <section className="bg-gradient-to-r from-blue-600 to-purple-600 text-white section-padding">
        <div className="container-custom text-center">
          <h1 className="text-5xl font-bold mb-4">Sermons</h1>
          <p className="text-xl max-w-3xl mx-auto">
            Watch and listen to inspiring messages that will transform your life.
          </p>
        </div>
      </section>

      {/* Search Section */}
      <section className="section-padding bg-gray-50">
        <div className="container-custom">
          <div className="max-w-2xl mx-auto">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Search sermons by title, speaker, or category..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-12 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Sermons Grid */}
      <section className="section-padding">
        <div className="container-custom">
          {sermons.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-xl text-gray-500">No sermons available at this time.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {filteredSermons.map((sermon) => (
                <Link
                  key={sermon.id}
                  to={`/sermons/${sermon.id}`}
                  className="card group hover:shadow-2xl transition-all"
                >
                  <div className="relative mb-4 overflow-hidden rounded-lg">
                    <img
                      src={sermon.image || '/assets/img/bible.jpeg'}
                      alt={sermon.title}
                      className="w-full h-48 object-cover group-hover:scale-110 transition-transform duration-300"
                    />
                    <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-40 transition-all flex items-center justify-center">
                      <Play className="w-16 h-16 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                    {sermon.category && (
                      <div className="absolute top-4 right-4 bg-blue-600 text-white px-3 py-1 rounded-full text-sm font-semibold">
                        {sermon.category}
                      </div>
                    )}
                  </div>
                  <h3 className="text-xl font-semibold mb-2 group-hover:text-blue-600 transition-colors">
                    {sermon.title}
                  </h3>
                  <p className="text-gray-600 mb-4 line-clamp-2">{sermon.description}</p>
                  <div className="flex items-center justify-between text-sm text-gray-500">
                    {sermon.speaker && (
                      <div className="flex items-center space-x-1">
                        <User className="w-4 h-4" />
                        <span>{sermon.speaker}</span>
                      </div>
                    )}
                    {sermon.date && (
                      <div className="flex items-center space-x-1">
                        <Calendar className="w-4 h-4" />
                        <span>{format(new Date(sermon.date), 'MMM d, yyyy')}</span>
                      </div>
                    )}
                  </div>
                  {sermon.duration && (
                    <div className="mt-4 pt-4 border-t">
                      <span className="text-sm text-gray-500">Duration: {sermon.duration}</span>
                    </div>
                  )}
                </Link>
              ))}
            </div>
          )}

          {filteredSermons.length === 0 && sermons.length > 0 && (
            <div className="text-center py-12">
              <p className="text-xl text-gray-500">No sermons found matching your search.</p>
            </div>
          )}
        </div>
      </section>
    </div>
  )
}

export default Sermons
