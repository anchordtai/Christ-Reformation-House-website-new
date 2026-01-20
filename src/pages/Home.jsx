import { Link } from 'react-router-dom'
import { Calendar, BookOpen, Users, Heart, ArrowRight, Sparkles } from 'lucide-react'
import HeroCarousel from '../components/HeroCarousel'

const Home = () => {
  const features = [
    {
      icon: <BookOpen className="w-8 h-8" />,
      title: 'Daily Devotionals',
      description: 'Start your day with inspiring devotionals and Bible study',
      link: '/devotional',
      gradient: 'from-blue-500 to-cyan-500',
    },
    {
      icon: <Calendar className="w-8 h-8" />,
      title: 'Upcoming Events',
      description: 'Join us for worship services, conferences, and community events',
      link: '/events',
      gradient: 'from-purple-500 to-pink-500',
    },
    {
      icon: <Users className="w-8 h-8" />,
      title: 'Our Ministries',
      description: 'Discover how you can get involved in our various ministries',
      link: '/ministries',
      gradient: 'from-green-500 to-emerald-500',
    },
    {
      icon: <Heart className="w-8 h-8" />,
      title: 'Give Online',
      description: 'Support our mission and ministries through online giving',
      link: '/donate',
      gradient: 'from-red-500 to-rose-500',
    },
  ]

  const stats = [
    { number: '500+', label: 'Members', icon: <Users className="w-6 h-6" /> },
    { number: '15+', label: 'Ministries', icon: <Sparkles className="w-6 h-6" /> },
    { number: '50+', label: 'Events/Year', icon: <Calendar className="w-6 h-6" /> },
    { number: '10+', label: 'Years Serving', icon: <Heart className="w-6 h-6" /> },
  ]

  return (
    <div className="overflow-hidden">
      {/* Hero Section with Carousel */}
      <HeroCarousel 
        images={[
          'https://images.unsplash.com/photo-1511632765486-a01980e01a18?w=1920&q=80', // Church worship crowd with hands raised
          'https://images.unsplash.com/photo-1507692049790-de58290a4334?w=1920&q=80', // People in worship service
          'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=1920&q=80', // Church congregation
          'https://images.unsplash.com/photo-1529070538774-1843cb3265df?w=1920&q=80', // Church building exterior
        ]}
      />

      {/* Stats Section */}
      <section className="section-padding bg-gradient-to-br from-blue-600 via-purple-600 to-indigo-700 text-white relative overflow-hidden">
        <div 
          className="absolute inset-0 opacity-20"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.05'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
          }}
        ></div>
        <div className="container-custom relative z-10">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {stats.map((stat, index) => (
              <div 
                key={index} 
                className="text-center group transform hover:scale-110 transition-all duration-300"
              >
                <div className="inline-flex items-center justify-center w-16 h-16 mb-4 bg-white/20 backdrop-blur-sm rounded-full group-hover:bg-white/30 transition-all duration-300">
                  {stat.icon}
                </div>
                <div className="text-4xl md:text-5xl font-bold mb-2 bg-gradient-to-r from-white to-blue-100 bg-clip-text text-transparent">
                  {stat.number}
                </div>
                <div className="text-lg font-medium">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="section-padding bg-gradient-to-b from-gray-50 to-white">
        <div className="container-custom">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold mb-4 bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              What We Offer
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Discover the many ways you can grow in faith and serve our community
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map((feature, index) => (
              <Link
                key={index}
                to={feature.link}
                className="group relative card hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2 overflow-hidden"
              >
                {/* Gradient Background on Hover */}
                <div className={`absolute inset-0 bg-gradient-to-br ${feature.gradient} opacity-0 group-hover:opacity-10 transition-opacity duration-300`}></div>
                
                {/* Icon */}
                <div className={`relative mb-4 inline-flex p-3 rounded-xl bg-gradient-to-br ${feature.gradient} text-white transform group-hover:scale-110 group-hover:rotate-3 transition-all duration-300`}>
                  {feature.icon}
                </div>
                
                <h3 className="text-xl font-semibold mb-2 group-hover:text-blue-600 transition-colors duration-300">
                  {feature.title}
                </h3>
                <p className="text-gray-600 mb-4 leading-relaxed">{feature.description}</p>
                <div className="flex items-center text-blue-600 font-medium group-hover:translate-x-2 transition-transform duration-300">
                  Learn more <ArrowRight className="ml-2 w-4 h-4" />
                </div>
                
                {/* Decorative corner */}
                <div className={`absolute top-0 right-0 w-20 h-20 bg-gradient-to-br ${feature.gradient} opacity-0 group-hover:opacity-5 rounded-bl-full transition-opacity duration-300`}></div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Mission Section */}
      <section className="section-padding bg-white">
        <div className="container-custom">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div className="order-2 lg:order-1">
              <div className="inline-block px-4 py-2 mb-4 bg-gradient-to-r from-blue-100 to-purple-100 rounded-full text-blue-600 font-semibold text-sm">
                Our Mission
              </div>
              <h2 className="text-4xl md:text-5xl font-bold mb-6 bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">
                Transforming Lives Through Faith
              </h2>
              <p className="text-lg text-gray-700 mb-4 leading-relaxed">
                To transform lives through the power of the Gospel, building a community of believers
                who are committed to spiritual growth, service, and spreading God's love.
              </p>
              <p className="text-lg text-gray-700 mb-6 leading-relaxed">
                We believe in the authority of Scripture, the power of prayer, and the importance
                of community in our walk with Christ.
              </p>
              <Link 
                to="/about" 
                className="group inline-flex items-center px-8 py-4 bg-gradient-to-r from-blue-600 to-purple-600 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105"
              >
                Learn More About Us
                <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </Link>
            </div>
            <div className="order-1 lg:order-2 relative">
              <div className="relative rounded-2xl overflow-hidden shadow-2xl transform hover:scale-105 transition-transform duration-300">
                <img 
                  src="/assets/img/about.jpg" 
                  alt="Our Mission" 
                  className="w-full h-96 object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent"></div>
              </div>
              {/* Decorative elements */}
              <div className="absolute -bottom-6 -right-6 w-32 h-32 bg-gradient-to-br from-blue-500/20 to-purple-500/20 rounded-full blur-3xl -z-10"></div>
              <div className="absolute -top-6 -left-6 w-24 h-24 bg-gradient-to-br from-purple-500/20 to-pink-500/20 rounded-full blur-2xl -z-10"></div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="section-padding bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-600 text-white relative overflow-hidden">
        <div className="absolute inset-0">
          <div className="absolute top-0 left-0 w-96 h-96 bg-white/10 rounded-full blur-3xl"></div>
          <div className="absolute bottom-0 right-0 w-96 h-96 bg-purple-500/20 rounded-full blur-3xl"></div>
        </div>
        <div className="container-custom text-center relative z-10">
          <h2 className="text-4xl md:text-5xl font-bold mb-4">Join Us This Sunday</h2>
          <p className="text-xl mb-8 max-w-2xl mx-auto text-blue-100">
            Experience worship, fellowship, and the Word of God in a welcoming community.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link 
              to="/events" 
              className="group px-8 py-4 bg-white text-blue-600 font-semibold rounded-xl shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:scale-105 flex items-center justify-center"
            >
              View Events
              <Calendar className="ml-2 w-5 h-5 group-hover:rotate-12 transition-transform" />
            </Link>
            <Link 
              to="/contact" 
              className="group px-8 py-4 bg-white/10 backdrop-blur-md border-2 border-white/30 text-white font-semibold rounded-xl hover:bg-white/20 transition-all duration-300 transform hover:scale-105 flex items-center justify-center"
            >
              Get Directions
              <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </Link>
          </div>
        </div>
      </section>
    </div>
  )
}

export default Home
