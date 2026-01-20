import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Calendar, User, Search, ArrowRight } from 'lucide-react'
import { format } from 'date-fns'

const Blog = () => {
  const [searchTerm, setSearchTerm] = useState('')
  
  // Sample blog posts - in production, this would come from an API
  const posts = [
    {
      id: 1,
      title: 'The Importance of Community in Faith',
      author: 'Pastor John Doe',
      date: new Date('2024-01-20'),
      excerpt: 'Discover how being part of a faith community strengthens your walk with Christ and provides support during life\'s challenges.',
      image: '/assets/img/about02.jpg',
      category: 'Faith',
    },
    {
      id: 2,
      title: 'Finding Peace in Times of Trouble',
      author: 'Pastor Jane Smith',
      date: new Date('2024-01-15'),
      excerpt: 'Learn practical ways to find God\'s peace when facing difficult circumstances and uncertainty.',
      image: '/assets/img/prayer photo.jpg',
      category: 'Encouragement',
    },
    {
      id: 3,
      title: 'The Power of Prayer',
      author: 'Pastor John Doe',
      date: new Date('2024-01-10'),
      excerpt: 'Exploring how prayer transforms our relationship with God and changes our circumstances.',
      image: '/assets/img/prayer-conf.jpg',
      category: 'Prayer',
    },
    {
      id: 4,
      title: 'Living with Purpose',
      author: 'Pastor Jane Smith',
      date: new Date('2024-01-05'),
      excerpt: 'Understanding God\'s purpose for your life and how to walk in it daily.',
      image: '/assets/img/about03.jpg',
      category: 'Purpose',
    },
  ]

  const filteredPosts = posts.filter(post =>
    post.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    post.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
    post.author.toLowerCase().includes(searchTerm.toLowerCase())
  )

  return (
    <div>
      {/* Hero Section */}
      <section className="bg-gradient-to-r from-blue-600 to-purple-600 text-white section-padding">
        <div className="container-custom text-center">
          <h1 className="text-5xl font-bold mb-4">Blog</h1>
          <p className="text-xl max-w-3xl mx-auto">
            Read inspiring articles, devotionals, and insights to strengthen your faith journey.
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
                placeholder="Search blog posts..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-12 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Blog Posts Grid */}
      <section className="section-padding">
        <div className="container-custom">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {filteredPosts.map((post) => (
              <Link
                key={post.id}
                to={`/blog/${post.id}`}
                className="card group hover:shadow-2xl transition-all"
              >
                <div className="relative mb-4 overflow-hidden rounded-lg">
                  <img
                    src={post.image}
                    alt={post.title}
                    className="w-full h-48 object-cover group-hover:scale-110 transition-transform duration-300"
                  />
                  <div className="absolute top-4 right-4 bg-blue-600 text-white px-3 py-1 rounded-full text-sm font-semibold">
                    {post.category}
                  </div>
                </div>
                <h3 className="text-xl font-semibold mb-2 group-hover:text-blue-600 transition-colors">
                  {post.title}
                </h3>
                <p className="text-gray-600 mb-4 line-clamp-3">{post.excerpt}</p>
                <div className="flex items-center justify-between text-sm text-gray-500 mb-4">
                  <div className="flex items-center space-x-1">
                    <User className="w-4 h-4" />
                    <span>{post.author}</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <Calendar className="w-4 h-4" />
                    <span>{format(post.date, 'MMM d, yyyy')}</span>
                  </div>
                </div>
                <div className="flex items-center text-blue-600 font-medium group-hover:translate-x-2 transition-transform">
                  Read more <ArrowRight className="ml-2 w-4 h-4" />
                </div>
              </Link>
            ))}
          </div>

          {filteredPosts.length === 0 && (
            <div className="text-center py-12">
              <p className="text-xl text-gray-500">No blog posts found matching your search.</p>
            </div>
          )}
        </div>
      </section>
    </div>
  )
}

export default Blog




