import { useParams, Link } from 'react-router-dom'
import { Calendar, User, ArrowLeft } from 'lucide-react'
import { format } from 'date-fns'

const BlogPost = () => {
  const { id } = useParams()
  
  // In production, fetch from API based on id
  const post = {
    id: parseInt(id),
    title: 'The Importance of Community in Faith',
    author: 'Pastor John Doe',
    date: new Date('2024-01-20'),
    image: '/assets/img/about02.jpg',
    category: 'Faith',
    content: `In today's fast-paced world, it's easy to feel isolated and disconnected. However, as believers, we are called to be part of a community - the body of Christ. This community is not just a nice addition to our faith journey; it's essential.

    The Bible tells us in Hebrews 10:24-25, "And let us consider how we may spur one another on toward love and good deeds, not giving up meeting together, as some are in the habit of doing, but encouraging one another."

    When we gather together as believers, we experience several benefits:

    1. **Encouragement**: Life can be challenging, and having a community of believers around us provides the encouragement we need to keep going. When we're down, others can lift us up, and when they're struggling, we can be there for them.

    2. **Accountability**: Being part of a community means we have people who care about our spiritual growth. They can help us stay on track and challenge us to grow in our faith.

    3. **Support**: Whether we're facing financial difficulties, health challenges, or family issues, our church community is there to support us through prayer, practical help, and emotional support.

    4. **Growth**: We learn from others' experiences and wisdom. We can ask questions, study together, and grow in our understanding of God's Word.

    5. **Worship**: There's something powerful about worshipping together. When we lift our voices together in praise, we experience God's presence in a unique way.

    If you're not already part of a faith community, I encourage you to take that step. Find a local church, join a small group, or get involved in a ministry. You'll find that being part of a community transforms not just your faith, but your entire life.`,
  }

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
                {format(post.date, 'MMMM d, yyyy')}
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




