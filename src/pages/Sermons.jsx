import { useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { Play, Calendar, User, Search, Clock, Mic2 } from 'lucide-react'
import { format } from 'date-fns'
import { useApi } from '../hooks/useApi'
import { sermonService } from '../services/api'
import Loading from '../components/Loading'
import Error from '../components/Error'

const Sermons = () => {
  const [searchTerm, setSearchTerm] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('all')
  const { data, loading, error } = useApi(() => sermonService.getAll())
  const sermons = Array.isArray(data) ? data : []

  const categories = useMemo(() => {
    const set = new Set(sermons.map((s) => s.category).filter(Boolean))
    return ['all', ...Array.from(set)]
  }, [sermons])

  const filteredSermons = useMemo(() => {
    return sermons.filter((sermon) => {
      const matchesSearch =
        sermon.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        sermon.speaker?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        sermon.category?.toLowerCase().includes(searchTerm.toLowerCase())
      const matchesCategory =
        categoryFilter === 'all' || sermon.category === categoryFilter
      return matchesSearch && matchesCategory
    })
  }, [sermons, searchTerm, categoryFilter])

  if (loading) return <Loading message="Loading sermons..." />
  if (error) return <Error message={error} />

  return (
    <div className="min-h-screen bg-[#fafbfc]">
      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-br from-slate-900 via-indigo-900 to-slate-900 text-white">
        <div
          className="absolute inset-0 opacity-30"
          style={{
            backgroundImage: `radial-gradient(circle at 20% 50%, rgba(99, 102, 241, 0.25) 0%, transparent 50%),
                             radial-gradient(circle at 80% 80%, rgba(139, 92, 246, 0.2) 0%, transparent 40%)`,
          }}
        />
        <div className="absolute inset-0 bg-[url('data:image/svg+xml,%3Csvg width=\'60\' height=\'60\' viewBox=\'0 0 60 60\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cg fill=\'none\' fill-rule=\'evenodd\'%3E%3Cg fill=\'%23ffffff\' fill-opacity=\'0.03\'%3E%3Cpath d=\'M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z\'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E')] opacity-80" />
        <div className="container-custom section-padding relative z-10">
          <p className="text-indigo-300 font-medium tracking-wide uppercase text-sm mb-3">
            Messages & Teaching
          </p>
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight max-w-3xl">
            Sermons
          </h1>
          <p className="mt-4 text-lg text-slate-300 max-w-2xl">
            Watch and listen to messages that will strengthen your faith and transform your life.
          </p>
        </div>
      </section>

      {/* Search & filters */}
      <section className="section-padding pt-10">
        <div className="container-custom">
          <div className="flex flex-col sm:flex-row gap-4 sm:items-center sm:justify-between mb-10">
            <div className="relative flex-1 max-w-xl">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
              <input
                type="text"
                placeholder="Search by title, speaker, or topic..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-12 pr-4 py-3.5 bg-white border border-slate-200 rounded-xl text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 transition-all"
              />
            </div>
            {categories.length > 1 && (
              <div className="flex flex-wrap gap-2">
                {categories.map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setCategoryFilter(cat)}
                    className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                      categoryFilter === cat
                        ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/30'
                        : 'bg-white text-slate-600 border border-slate-200 hover:border-indigo-300 hover:text-indigo-600'
                    }`}
                  >
                    {cat === 'all' ? 'All' : cat}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Grid */}
          {sermons.length === 0 ? (
            <div className="text-center py-20">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-slate-100 text-slate-400 mb-4">
                <Mic2 className="w-8 h-8" />
              </div>
              <p className="text-xl text-slate-500">No sermons available yet.</p>
              <p className="text-slate-400 mt-1">Check back soon for new messages.</p>
            </div>
          ) : filteredSermons.length === 0 ? (
            <div className="text-center py-20">
              <p className="text-xl text-slate-500">No sermons match your search.</p>
              <button
                onClick={() => {
                  setSearchTerm('')
                  setCategoryFilter('all')
                }}
                className="mt-4 text-indigo-600 font-medium hover:underline"
              >
                Clear filters
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8">
              {filteredSermons.map((sermon, index) => (
                <Link
                  key={sermon.id}
                  to={`/sermons/${sermon.id}`}
                  className="group block bg-white rounded-2xl overflow-hidden border border-slate-200/80 shadow-sm hover:shadow-xl hover:border-indigo-200/60 transition-all duration-300"
                  style={{ animationDelay: `${index * 50}ms` }}
                >
                  <div className="relative aspect-video overflow-hidden bg-slate-100">
                    <img
                      src={sermon.image || '/assets/img/bible.jpeg'}
                      alt={sermon.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
                    <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                      <span className="flex items-center justify-center w-14 h-14 rounded-full bg-white/95 text-indigo-600 shadow-xl">
                        <Play className="w-7 h-7 ml-1" fill="currentColor" />
                      </span>
                    </div>
                    {sermon.category && (
                      <span className="absolute top-4 right-4 px-3 py-1 rounded-full bg-indigo-600 text-white text-xs font-semibold">
                        {sermon.category}
                      </span>
                    )}
                    {sermon.duration && (
                      <span className="absolute bottom-4 left-4 flex items-center gap-1.5 text-white/90 text-sm font-medium">
                        <Clock className="w-4 h-4" />
                        {sermon.duration}
                      </span>
                    )}
                  </div>
                  <div className="p-5 sm:p-6">
                    <h3 className="text-lg font-semibold text-slate-900 group-hover:text-indigo-600 transition-colors line-clamp-2">
                      {sermon.title}
                    </h3>
                    <p className="mt-2 text-slate-600 text-sm line-clamp-2">
                      {sermon.description}
                    </p>
                    <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-slate-500">
                      {sermon.speaker && (
                        <span className="flex items-center gap-1.5">
                          <User className="w-4 h-4 text-slate-400" />
                          {sermon.speaker}
                        </span>
                      )}
                      {sermon.date && (
                        <span className="flex items-center gap-1.5">
                          <Calendar className="w-4 h-4 text-slate-400" />
                          {format(new Date(sermon.date), 'MMM d, yyyy')}
                        </span>
                      )}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  )
}

export default Sermons
