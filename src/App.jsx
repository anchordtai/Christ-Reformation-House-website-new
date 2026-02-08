import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import Header from './components/Header'
import Footer from './components/Footer'
import ProtectedRoute from './components/ProtectedRoute'
import AdminRoute from './components/AdminRoute'
import Home from './pages/Home'
import About from './pages/About'
import Sermons from './pages/Sermons'
import Events from './pages/Events'
import Blog from './pages/Blog'
import Devotional from './pages/Devotional'
import Donate from './pages/Donate'
import DonateReturn from './pages/DonateReturn'
import Contact from './pages/Contact'
import PrayerRequest from './pages/PrayerRequest'
import Ministries from './pages/Ministries'
import ChurchStore from './pages/ChurchStore'
import EventRegister from './pages/EventRegister'
import Login from './pages/Login'
import Signup from './pages/Signup'
import BlogPost from './pages/BlogPost'
import SermonDetail from './pages/SermonDetail'
import LiveStream from './pages/LiveStream'
import Meetings from './pages/Meetings'
import MeetingSchedule from './pages/MeetingSchedule'
import MeetingRoom from './pages/MeetingRoom'
import MeetingDetail from './pages/MeetingDetail'
import MeetingEdit from './pages/MeetingEdit'
import SocialAutomation from './pages/SocialAutomation'
import AdminLogin from './pages/AdminLogin'

function App() {
  return (
    <Router>
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-grow">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/about" element={<About />} />
            <Route path="/sermons" element={<Sermons />} />
            <Route path="/sermons/:id" element={<SermonDetail />} />
            <Route path="/live" element={<AdminRoute><LiveStream /></AdminRoute>} />
            <Route path="/events" element={<Events />} />
            <Route path="/events/register/:id" element={<EventRegister />} />
            <Route path="/blog" element={<Blog />} />
            <Route path="/blog/:id" element={<BlogPost />} />
            <Route path="/devotional" element={<Devotional />} />
            <Route path="/donate" element={<Donate />} />
            <Route path="/donate/return" element={<DonateReturn />} />
            <Route path="/contact" element={<Contact />} />
            <Route path="/prayer-request" element={<PrayerRequest />} />
            <Route path="/ministries" element={<Ministries />} />
            <Route path="/store" element={<ChurchStore />} />
            <Route path="/meetings" element={<Meetings />} />
            <Route path="/meetings/schedule" element={<AdminRoute><MeetingSchedule /></AdminRoute>} />
            <Route path="/meetings/room/:id" element={<MeetingRoom />} />
            <Route path="/meetings/:id" element={<MeetingDetail />} />
            <Route path="/meetings/:id/edit" element={<AdminRoute><MeetingEdit /></AdminRoute>} />
            <Route path="/social" element={<ProtectedRoute><SocialAutomation /></ProtectedRoute>} />
            <Route path="/admin/login" element={<AdminLogin />} />
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<Signup />} />
          </Routes>
        </main>
        <Footer />
      </div>
    </Router>
  )
}

export default App




