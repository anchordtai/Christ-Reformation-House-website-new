import { Link } from 'react-router-dom'
import { Users, Heart, Book, Music, GraduationCap, Baby } from 'lucide-react'

const Ministries = () => {
  const ministries = [
    {
      id: 1,
      name: 'Children\'s Ministry',
      icon: <Baby className="w-8 h-8" />,
      description: 'Nurturing young hearts and minds in the love of Christ through age-appropriate teaching and activities.',
      image: '/assets/img/school01.jpg',
      ageGroup: 'Ages 0-12',
    },
    {
      id: 2,
      name: 'Youth Ministry',
      icon: <GraduationCap className="w-8 h-8" />,
      description: 'Empowering the next generation to live out their faith boldly and make a difference in the world.',
      image: '/assets/img/youth.jpg',
      ageGroup: 'Ages 13-25',
    },
    {
      id: 3,
      name: 'Worship Ministry',
      icon: <Music className="w-8 h-8" />,
      description: 'Leading the congregation in heartfelt worship through music and creative arts.',
      image: '/assets/img/holyspirit.jpg',
      ageGroup: 'All Ages',
    },
    {
      id: 4,
      name: 'Men\'s Ministry',
      icon: <Users className="w-8 h-8" />,
      description: 'Building strong men of God through fellowship, accountability, and biblical teaching.',
      image: '/assets/img/about03.jpg',
      ageGroup: 'Men 18+',
    },
    {
      id: 5,
      name: 'Women\'s Ministry',
      icon: <Heart className="w-8 h-8" />,
      description: 'Encouraging and equipping women to grow in their relationship with God and each other.',
      image: '/assets/img/about02.jpg',
      ageGroup: 'Women 18+',
    },
    {
      id: 6,
      name: 'Bible Study',
      icon: <Book className="w-8 h-8" />,
      description: 'Deepening understanding of God\'s Word through systematic study and discussion.',
      image: '/assets/img/bible.jpeg',
      ageGroup: 'All Ages',
    },
    {
      id: 7,
      name: 'Outreach Ministry',
      icon: <Heart className="w-8 h-8" />,
      description: 'Serving our community and sharing the love of Christ through practical acts of service.',
      image: '/assets/img/hospital.jpg',
      ageGroup: 'All Ages',
    },
    {
      id: 8,
      name: 'Prison Ministry',
      icon: <Users className="w-8 h-8" />,
      description: 'Bringing hope and the Gospel to those in correctional facilities.',
      image: '/assets/img/prison logo.png',
      ageGroup: 'Adults',
    },
  ]

  return (
    <div>
      {/* Hero Section */}
      <section className="bg-gradient-to-r from-blue-600 to-purple-600 text-white section-padding">
        <div className="container-custom text-center">
          <h1 className="text-5xl font-bold mb-4">Our Ministries</h1>
          <p className="text-xl max-w-3xl mx-auto">
            Discover how you can get involved and use your gifts to serve God and others.
          </p>
        </div>
      </section>

      {/* Ministries Grid */}
      <section className="section-padding">
        <div className="container-custom">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {ministries.map((ministry) => (
              <div key={ministry.id} className="card group hover:shadow-2xl transition-all">
                <div className="relative mb-4 overflow-hidden rounded-lg">
                  <img
                    src={ministry.image}
                    alt={ministry.name}
                    className="w-full h-48 object-cover group-hover:scale-110 transition-transform duration-300"
                  />
                </div>
                <div className="text-blue-600 mb-4">
                  {ministry.icon}
                </div>
                <h3 className="text-xl font-semibold mb-2">{ministry.name}</h3>
                <p className="text-gray-600 mb-4">{ministry.description}</p>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-500">{ministry.ageGroup}</span>
                  <Link
                    to="/contact"
                    className="text-blue-600 font-medium hover:text-blue-700 transition-colors"
                  >
                    Get Involved →
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="section-padding bg-gray-100">
        <div className="container-custom text-center">
          <h2 className="text-3xl font-bold mb-4">Want to Start a New Ministry?</h2>
          <p className="text-lg text-gray-700 mb-6 max-w-2xl mx-auto">
            Have a passion or calling to serve in a specific area? We'd love to help you start a new ministry.
          </p>
          <Link to="/contact" className="btn-primary inline-block">
            Contact Us
          </Link>
        </div>
      </section>
    </div>
  )
}

export default Ministries




