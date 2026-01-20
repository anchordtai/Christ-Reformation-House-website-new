import { useState, useEffect } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'

const HeroCarousel = ({ images = [] }) => {
  const [currentIndex, setCurrentIndex] = useState(0)

  // Default demo images if none provided
  const defaultImages = [
    '/assets/img/hero-bg.jpg',
    '/assets/img/holyspirit.jpg',
    '/assets/img/convention-image.jpg',
    '/assets/img/youth.jpg',
  ]

  const slides = images.length > 0 ? images : defaultImages

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentIndex((prevIndex) => (prevIndex + 1) % slides.length)
    }, 5000) // Auto-advance every 5 seconds

    return () => clearInterval(timer)
  }, [slides.length])

  const goToSlide = (index) => {
    setCurrentIndex(index)
  }

  const goToPrevious = () => {
    setCurrentIndex((prevIndex) => (prevIndex - 1 + slides.length) % slides.length)
  }

  const goToNext = () => {
    setCurrentIndex((prevIndex) => (prevIndex + 1) % slides.length)
  }

  return (
    <div className="relative h-screen w-full overflow-hidden">
      {/* Carousel Images */}
      <div className="relative h-full w-full">
        {slides.map((image, index) => (
          <div
            key={index}
            className={`absolute inset-0 transition-opacity duration-1000 ease-in-out ${
              index === currentIndex ? 'opacity-100' : 'opacity-0'
            }`}
          >
            <div
              className="h-full w-full bg-cover bg-center bg-no-repeat"
              style={{ backgroundImage: `url(${image})` }}
            >
              <div className="absolute inset-0 bg-gradient-to-r from-black/70 via-black/50 to-black/30"></div>
            </div>
          </div>
        ))}
      </div>

      {/* Content Overlay */}
      <div className="absolute inset-0 z-10 flex items-center justify-center">
        <div className="text-center text-white px-4 max-w-5xl mx-auto">
          <div className="mb-6 animate-fade-in-up">
            <img 
              src="/assets/img/crhlogo.jpg" 
              alt="Christ's Reformation House Logo" 
              className="w-32 h-32 md:w-40 md:h-40 mx-auto mb-6 rounded-full shadow-2xl object-cover ring-4 ring-white/20 animate-pulse-slow"
            />
          </div>
          <h1 className="text-5xl md:text-7xl font-extrabold mb-6 animate-fade-in-up animation-delay-200">
            <span className="bg-gradient-to-r from-white via-blue-100 to-purple-100 bg-clip-text text-transparent">
              Welcome to Christ's Reformation House
            </span>
          </h1>
          <p className="text-xl md:text-2xl mb-8 text-gray-100 animate-fade-in-up animation-delay-400 max-w-3xl mx-auto leading-relaxed">
            Where Faith Meets Transformation. Join us for worship, community, and spiritual growth in Christ.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center animate-fade-in-up animation-delay-600">
            <a 
              href="/donate" 
              className="group relative px-8 py-4 text-lg font-bold text-white bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl shadow-2xl hover:shadow-blue-500/50 transition-all duration-300 transform hover:scale-105 hover:-translate-y-1 overflow-hidden"
            >
              <span className="relative z-10">Give Online</span>
              <div className="absolute inset-0 bg-gradient-to-r from-purple-600 to-blue-600 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
            </a>
            <a 
              href="/about" 
              className="group relative px-8 py-4 text-lg font-bold text-white bg-white/10 backdrop-blur-md rounded-xl border-2 border-white/30 shadow-xl hover:bg-white/20 transition-all duration-300 transform hover:scale-105 hover:-translate-y-1"
            >
              Discover More
            </a>
          </div>
        </div>
      </div>

      {/* Navigation Arrows */}
      <button
        onClick={goToPrevious}
        className="absolute left-4 top-1/2 -translate-y-1/2 z-20 p-3 bg-white/20 backdrop-blur-sm rounded-full hover:bg-white/30 transition-all duration-300 transform hover:scale-110"
        aria-label="Previous slide"
      >
        <ChevronLeft className="w-6 h-6 text-white" />
      </button>
      <button
        onClick={goToNext}
        className="absolute right-4 top-1/2 -translate-y-1/2 z-20 p-3 bg-white/20 backdrop-blur-sm rounded-full hover:bg-white/30 transition-all duration-300 transform hover:scale-110"
        aria-label="Next slide"
      >
        <ChevronRight className="w-6 h-6 text-white" />
      </button>

      {/* Dots Indicator */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-20 flex gap-2">
        {slides.map((_, index) => (
          <button
            key={index}
            onClick={() => goToSlide(index)}
            className={`h-3 rounded-full transition-all duration-300 ${
              index === currentIndex
                ? 'w-8 bg-white'
                : 'w-3 bg-white/50 hover:bg-white/75'
            }`}
            aria-label={`Go to slide ${index + 1}`}
          />
        ))}
      </div>
    </div>
  )
}

export default HeroCarousel




