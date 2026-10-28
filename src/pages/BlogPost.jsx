import { useParams, Link } from 'react-router-dom'
import { Calendar, User, ArrowLeft } from 'lucide-react'
import { format } from 'date-fns'
import { useApi } from '../hooks/useApi'
import { blogService } from '../services/api'
import Error from '../components/Error'
import Loading from '../components/Loading'

const BlogPost = () => {
  const { id } = useParams()
  
  const { data: post, loading, error } = useApi(() => blogService.getById(id), [id])
  if (loading) return <Loading />
  if (error || !post) return <Error message={error || 'Article not found'} />
  return (
    <div>
      {/* Hero Section */}
      <section className="bg-gradient-to-r from-blue-600 to-purple-600 text-white section-padding">
        <div className="container-custom">
          <Link to="/blog" className="inline-flex items-center text-white hover:text-gray-200 mb-6">
            <ArrowLeft className="w-5 h-5 mr-2" />
            Back to Blog
          </Link>
          <div className="max-w-4xl">
            <div className="bg-blue-500 inline-block px-4 py-1 rounded-full text-sm font-semibold mb-4">
              {post.category}
            </div>
            <h1 className="text-4xl md:text-5xl font-bold mb-4">{post.title}</h1>
            <div className="flex flex-wrap items-center gap-6 text-lg">
              <div className="flex items-center">
                <User className="w-5 h-5 mr-2" />
                {post.author}
              </div>
              <div className="flex items-center">
                <Calendar className="w-5 h-5 mr-2" />
                {Number.isFinite(+new Date(post.date)) ? format(new Date(post.date), 'MMMM d, yyyy') : ''}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Featured Image */}
      <section className="section-padding bg-gray-50">
        <div className="container-custom">
          <div className="max-w-4xl mx-auto">
            <img
              src={post.image}
              alt={post.title}
              className="w-full h-96 object-cover rounded-xl shadow-2xl"
            />
          </div>
        </div>
      </section>

      {/* Content Section */}
      <section className="section-padding">
        <div className="container-custom">
          <div className="max-w-4xl mx-auto">
            <div className="card">
              <div className="prose prose-lg max-w-none">
                <div className="whitespace-pre-line text-gray-700 leading-relaxed">
                  {post.content}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}

export default BlogPost





