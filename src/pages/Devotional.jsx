import { useState } from 'react'
import { Calendar, BookOpen, Heart } from 'lucide-react'
import { format } from 'date-fns'

const Devotional = () => {
  const [selectedDate, setSelectedDate] = useState(new Date())
  
  // Sample devotional - in production, fetch based on date
  const devotional = {
    date: selectedDate,
    title: 'Walking in Faith',
    scripture: 'Hebrews 11:1',
    scriptureText: 'Now faith is the substance of things hoped for, the evidence of things not seen.',
    content: `Today, let us reflect on the power of faith. Faith is not just believing in something we cannot see; it's an active trust in God's character and His promises.

    When we walk in faith, we acknowledge that God is in control, even when our circumstances seem uncertain. Faith gives us the strength to face challenges, knowing that God is working all things together for our good.

    Take a moment today to reflect on areas where you need to exercise more faith. Trust God with your worries, your dreams, and your future. He is faithful, and He will never let you down.`,
    prayer: `Heavenly Father, increase our faith. Help us to trust You more deeply and to walk in confidence, knowing that You are with us every step of the way. In Jesus' name, Amen.`,
  }

  return (
    <div>
      {/* Hero Section */}
      <section className="bg-gradient-to-r from-blue-600 to-purple-600 text-white section-padding">
        <div className="container-custom text-center">
          <h1 className="text-5xl font-bold mb-4">Daily Devotional</h1>
          <p className="text-xl max-w-3xl mx-auto">
            Start your day with God's Word and find inspiration for your daily walk with Christ.
          </p>
        </div>
      </section>

      {/* Date Selector */}
      <section className="section-padding bg-gray-50">
        <div className="container-custom">
          <div className="max-w-2xl mx-auto">
            <div className="card">
              <label htmlFor="date" className="block text-sm font-medium text-gray-700 mb-2">
                Select Date
              </label>
              <input
                type="date"
                id="date"
                value={format(selectedDate, 'yyyy-MM-dd')}
                onChange={(e) => setSelectedDate(new Date(e.target.value))}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Devotional Content */}
      <section className="section-padding">
        <div className="container-custom">
          <div className="max-w-4xl mx-auto">
            <div className="card mb-6">
              <div className="flex items-center text-gray-600 mb-4">
                <Calendar className="w-5 h-5 mr-2" />
                {format(devotional.date, 'EEEE, MMMM d, yyyy')}
              </div>
              <h2 className="text-3xl font-bold mb-4">{devotional.title}</h2>
            </div>

            <div className="card mb-6 bg-blue-50 border-l-4 border-blue-600">
              <div className="flex items-start">
                <BookOpen className="w-6 h-6 text-blue-600 mr-3 mt-1 flex-shrink-0" />
                <div>
                  <h3 className="text-lg font-semibold text-blue-900 mb-2">
                    Scripture: {devotional.scripture}
                  </h3>
                  <p className="text-blue-800 italic text-lg leading-relaxed">
                    {devotional.scriptureText}
                  </p>
                </div>
              </div>
            </div>

            <div className="card mb-6">
              <h3 className="text-2xl font-semibold mb-4">Reflection</h3>
              <div className="text-gray-700 leading-relaxed whitespace-pre-line text-lg">
                {devotional.content}
              </div>
            </div>

            <div className="card bg-purple-50 border-l-4 border-purple-600">
              <div className="flex items-start">
                <Heart className="w-6 h-6 text-purple-600 mr-3 mt-1 flex-shrink-0" />
                <div>
                  <h3 className="text-lg font-semibold text-purple-900 mb-2">Prayer</h3>
                  <p className="text-purple-800 italic leading-relaxed">
                    {devotional.prayer}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Previous Devotionals */}
      <section className="section-padding bg-gray-100">
        <div className="container-custom">
          <h2 className="text-3xl font-bold text-center mb-8">Previous Devotionals</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
            {[1, 2, 3].map((day) => {
              const date = new Date(selectedDate)
              date.setDate(date.getDate() - day)
              return (
                <div key={day} className="card cursor-pointer hover:shadow-xl transition-shadow">
                  <div className="text-sm text-gray-500 mb-2">
                    {format(date, 'MMM d, yyyy')}
                  </div>
                  <h3 className="font-semibold mb-2">Devotional Title {day}</h3>
                  <p className="text-sm text-gray-600 line-clamp-2">
                    Brief excerpt from the devotional content...
                  </p>
                </div>
              )
            })}
          </div>
        </div>
      </section>
    </div>
  )
}

export default Devotional




