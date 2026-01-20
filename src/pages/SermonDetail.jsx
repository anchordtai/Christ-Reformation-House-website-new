import { useParams, Link } from 'react-router-dom'
import { Play, Calendar, User, ArrowLeft } from 'lucide-react'
import { format } from 'date-fns'

const SermonDetail = () => {
  const { id } = useParams()
  
  // In production, fetch from API based on id
  const sermon = {
    id: parseInt(id),
    title: 'The Power of Faith',
    speaker: 'Pastor John Doe',
    date: new Date('2024-01-15'),
    duration: '45 min',
    image: '/assets/img/bible.jpeg',
    description: 'Exploring how faith transforms our lives and circumstances.',
    category: 'Faith',
    videoUrl: '#', // Replace with actual video URL
    transcript: `In this powerful message, we explore the transformative power of faith. 
    Faith is not just believing in something we cannot see, but it's an active trust in God's 
    promises and His character. When we exercise faith, we open ourselves to God's miraculous 
    work in our lives.`,
    scripture: 'Hebrews 11:1 - Now faith is the substance of things hoped for, the evidence of things not seen.',
  }

  return (
    <div>
      {/* Hero Section */}
      <section className="bg-gradient-to-r from-blue-600 to-purple-600 text-white section-padding">
        <div className="container-custom">
          <Link to="/sermons" className="inline-flex items-center text-white hover:text-gray-200 mb-6">
            <ArrowLeft className="w-5 h-5 mr-2" />
            Back to Sermons
          </Link>
          <div className="max-w-4xl">
            <div className="bg-blue-500 inline-block px-4 py-1 rounded-full text-sm font-semibold mb-4">
              {sermon.category}
            </div>
            <h1 className="text-4xl md:text-5xl font-bold mb-4">{sermon.title}</h1>
            <div className="flex flex-wrap items-center gap-6 text-lg">
              <div className="flex items-center">
                <User className="w-5 h-5 mr-2" />
                {sermon.speaker}
              </div>
              <div className="flex items-center">
                <Calendar className="w-5 h-5 mr-2" />
                {format(sermon.date, 'MMMM d, yyyy')}
              </div>
              <div>{sermon.duration}</div>
            </div>
          </div>
        </div>
      </section>

      {/* Video Section */}
      <section className="section-padding bg-gray-50">
        <div className="container-custom">
          <div className="max-w-4xl mx-auto">
            <div className="relative bg-black rounded-xl overflow-hidden shadow-2xl" style={{ paddingBottom: '56.25%' }}>
              <div className="absolute inset-0 flex items-center justify-center">
                <img src={sermon.image} alt={sermon.title} className="w-full h-full object-cover opacity-50" />
                <button className="absolute bg-blue-600 hover:bg-blue-700 text-white rounded-full p-6 transition-all transform hover:scale-110">
                  <Play className="w-12 h-12" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Content Section */}
      <section className="section-padding">
        <div className="container-custom">
          <div className="max-w-4xl mx-auto">
            <div className="card mb-8">
              <h2 className="text-2xl font-bold mb-4">Scripture Reference</h2>
              <p className="text-lg text-gray-700 italic border-l-4 border-blue-600 pl-4">
                {sermon.scripture}
              </p>
            </div>

            <div className="card mb-8">
              <h2 className="text-2xl font-bold mb-4">Message Description</h2>
              <p className="text-lg text-gray-700 leading-relaxed">{sermon.description}</p>
            </div>

            <div className="card">
              <h2 className="text-2xl font-bold mb-4">Full Transcript</h2>
              <p className="text-gray-700 leading-relaxed whitespace-pre-line">{sermon.transcript}</p>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}

export default SermonDetail




