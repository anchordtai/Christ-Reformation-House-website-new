import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Calendar, MapPin, Clock, Users, Search } from 'lucide-react'
import { format } from 'date-fns'

const Events = () => {
  const [searchTerm, setSearchTerm] = useState('')
  
  // Sample events data - in production, this would come from an API
  const events = [
    {
      id: 1,
      title: 'Sunday Worship Service',
      date: new Date('2024-02-04'),
      time: '10:00 AM',
      location: 'Main Sanctuary',
      description: 'Join us for our weekly Sunday worship service with inspiring music and message.',
      image: '/assets/img/convention-image.jpg',
      category: 'Worship',
      attendees: 150,
    },
    {
      id: 2,
      title: 'Youth Conference 2024',
      date: new Date('2024-02-10'),
      time: '9:00 AM',
      location: 'Conference Hall',
      description: 'A powerful conference for young people to grow in faith and connect with peers.',
      image: '/assets/img/youth.jpg',
      category: 'Conference',
      attendees: 300,
    },
    {
      id: 3,
      title: 'Prayer Meeting',
      date: new Date('2024-02-07'),
      time: '7:00 PM',
      location: 'Prayer Room',
      description: 'Weekly prayer meeting for intercession and spiritual growth.',
      image: '/assets/img/prayer photo.jpg',
      category: 'Prayer',
      attendees: 50,
    },
    {
      id: 4,
      title: 'Bible Study',
      date: new Date('2024-02-05'),
      time: '6:30 PM',
      location: 'Fellowship Hall',
      description: 'Deep dive into God\'s Word with interactive Bible study sessions.',
      image: '/assets/img/bible.jpeg',
      category: 'Study',
      attendees: 80,
    },
  ]

  const filteredEvents = events.filter(event =>
    event.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    event.category.toLowerCase().includes(searchTerm.toLowerCase())
  )

  return (
    <div>
      {/* Hero Section */}
      <section className="bg-gradient-to-r from-blue-600 to-purple-600 text-white section-padding">
        <div className="container-custom text-center">
          <h1 className="text-5xl font-bold mb-4">Upcoming Events</h1>
          <p className="text-xl max-w-3xl mx-auto">
            Join us for worship, fellowship, and community events throughout the year.
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
                placeholder="Search events..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-12 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Events Grid */}
      <section className="section-padding">
        <div className="container-custom">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {filteredEvents.map((event) => (
              <div key={event.id} className="card group hover:shadow-2xl transition-all">
                <div className="relative mb-4 overflow-hidden rounded-lg">
                  <img
                    src={event.image}
                    alt={event.title}
                    className="w-full h-48 object-cover group-hover:scale-110 transition-transform duration-300"
                  />
                  <div className="absolute top-4 right-4 bg-blue-600 text-white px-3 py-1 rounded-full text-sm font-semibold">
                    {event.category}
                  </div>
                </div>
                <h3 className="text-xl font-semibold mb-2">{event.title}</h3>
                <p className="text-gray-600 mb-4 line-clamp-2">{event.description}</p>
                <div className="space-y-2 mb-4">
                  <div className="flex items-center text-sm text-gray-600">
                    <Calendar className="w-4 h-4 mr-2 text-blue-600" />
                    {format(event.date, 'EEEE, MMMM d, yyyy')}
                  </div>
                  <div className="flex items-center text-sm text-gray-600">
                    <Clock className="w-4 h-4 mr-2 text-blue-600" />
                    {event.time}
                  </div>
                  <div className="flex items-center text-sm text-gray-600">
                    <MapPin className="w-4 h-4 mr-2 text-blue-600" />
                    {event.location}
                  </div>
                  <div className="flex items-center text-sm text-gray-600">
                    <Users className="w-4 h-4 mr-2 text-blue-600" />
                    {event.attendees} expected attendees
                  </div>
                </div>
                <Link
                  to={`/events/register/${event.id}`}
                  className="btn-primary w-full text-center block"
                >
                  Register Now
                </Link>
              </div>
            ))}
          </div>

          {filteredEvents.length === 0 && (
            <div className="text-center py-12">
              <p className="text-xl text-gray-500">No events found matching your search.</p>
            </div>
          )}
        </div>
      </section>
    </div>
  )
}

export default Events




