import { Users, Heart, Book, Target } from 'lucide-react'

const About = () => {
  const values = [
    {
      icon: <Book className="w-8 h-8" />,
      title: 'Biblical Foundation',
      description: 'We are committed to teaching and living according to the Word of God.',
    },
    {
      icon: <Heart className="w-8 h-8" />,
      title: 'Love & Compassion',
      description: 'We demonstrate Christ\'s love through acts of service and compassion.',
    },
    {
      icon: <Users className="w-8 h-8" />,
      title: 'Community',
      description: 'We believe in the power of fellowship and building strong relationships.',
    },
    {
      icon: <Target className="w-8 h-8" />,
      title: 'Excellence',
      description: 'We strive for excellence in all we do, honoring God with our best.',
    },
  ]

  return (
    <div>
      {/* Hero Section */}
      <section className="bg-gradient-to-r from-blue-600 to-purple-600 text-white section-padding">
        <div className="container-custom text-center">
          <h1 className="text-5xl font-bold mb-4">About Us</h1>
          <p className="text-xl max-w-3xl mx-auto">
            Learn more about Christ's Reformation House International and our mission to transform lives.
          </p>
        </div>
      </section>

      {/* Our Story */}
      <section className="section-padding">
        <div className="container-custom">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-4xl font-bold mb-6">Our Story</h2>
              <p className="text-lg text-gray-700 mb-4">
                Christ's Reformation House International was founded with a vision to create a
                community where believers can grow in their faith, serve others, and experience
                the transformative power of God's love.
              </p>
              <p className="text-lg text-gray-700 mb-4">
                Over the years, we have been blessed to see countless lives changed through our
                ministries, worship services, and community outreach programs. We are committed
                to continuing this mission and expanding our impact.
              </p>
              <p className="text-lg text-gray-700">
                Our church family is diverse, welcoming people from all walks of life, and we
                believe that together, we can make a difference in our community and beyond.
              </p>
            </div>
            <div>
              <img 
                src="/assets/img/about01.jpg" 
                alt="Our Story" 
                className="rounded-xl shadow-2xl object-cover w-full"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Our Values */}
      <section className="section-padding bg-gray-100">
        <div className="container-custom">
          <h2 className="text-4xl font-bold text-center mb-12">Our Core Values</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {values.map((value, index) => (
              <div key={index} className="card text-center">
                <div className="text-blue-600 mb-4 flex justify-center">
                  {value.icon}
                </div>
                <h3 className="text-xl font-semibold mb-2">{value.title}</h3>
                <p className="text-gray-600">{value.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Leadership */}
      <section className="section-padding">
        <div className="container-custom">
          <h2 className="text-4xl font-bold text-center mb-12">Our Leadership</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="card text-center">
              <img 
                src="/assets/img/anch-photo.jpg" 
                alt="Pastor" 
                className="w-32 h-32 rounded-full mx-auto mb-4 object-cover"
              />
              <h3 className="text-xl font-semibold mb-2">Pastor Name</h3>
              <p className="text-gray-600 mb-2">Senior Pastor</p>
              <p className="text-sm text-gray-500">
                Leading with passion and dedication to serve God's people.
              </p>
            </div>
            <div className="card text-center">
              <img 
                src="/assets/img/cecilia.jpg" 
                alt="Associate Pastor" 
                className="w-32 h-32 rounded-full mx-auto mb-4 object-cover"
              />
              <h3 className="text-xl font-semibold mb-2">Associate Pastor</h3>
              <p className="text-gray-600 mb-2">Ministry Leader</p>
              <p className="text-sm text-gray-500">
                Committed to discipleship and community building.
              </p>
            </div>
            <div className="card text-center">
              <img 
                src="/assets/img/anch-photo.jpg" 
                alt="Elder" 
                className="w-32 h-32 rounded-full mx-auto mb-4 object-cover"
              />
              <h3 className="text-xl font-semibold mb-2">Church Elder</h3>
              <p className="text-gray-600 mb-2">Board Member</p>
              <p className="text-sm text-gray-500">
                Providing wisdom and guidance to the church.
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}

export default About




