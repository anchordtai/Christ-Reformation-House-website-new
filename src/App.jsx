import {lazy,Suspense} from 'react'
const DevotionalEditor=lazy(()=>import('./pages/DevotionalEditor'))
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import Header from './components/Header'
import PageEnhancements from './components/PageEnhancements'
import MinistryAssistant from './components/MinistryAssistant'
import Watch from './pages/Watch'
const BroadcastEditor=lazy(()=>import('./pages/BroadcastEditor'))
import Salvation from './pages/Salvation'
import PrayerSupport from './pages/PrayerSupport'
import Testimonies from './pages/Testimonies'
import InstantMeetingRoom from './pages/InstantMeetingRoom'
import PlanMeeting from './pages/PlanMeeting'
import './styles/platform.css'
import Footer from './components/Footer'
import ProtectedRoute from './components/ProtectedRoute'
import Home from './pages/Home'
import About from './pages/About'
import Events from './pages/Events'
const EventEditor=lazy(()=>import('./pages/EventEditor'))
const Blog=lazy(()=>import('./pages/Blog'))
import Devotional from './pages/Devotional'
import Donate from './pages/Donate'
import DonateReturn from './pages/DonateReturn'
import Contact from './pages/Contact'
import Ministries from './pages/Ministries'
import ChurchStore from './pages/ChurchStore'
const StoreEditor=lazy(()=>import('./pages/StoreEditor'))
const ContactInbox=lazy(()=>import('./pages/ContactInbox'))
const BlogEditor=lazy(()=>import('./pages/BlogEditor'))
const Help=lazy(()=>import('./pages/Help'))
const Support=lazy(()=>import('./pages/Support'))
const SupportDesk=lazy(()=>import('./pages/SupportDesk'))
import EventRegister from './pages/EventRegister'
import Login from './pages/Login'
import Signup from './pages/Signup'
const BlogPost=lazy(()=>import('./pages/BlogPost'))
import Meetings from './pages/Meetings'
const SocialAutomation=lazy(()=>import('./pages/SocialAutomation'))
const AdminLogin=lazy(()=>import('./pages/AdminLogin'))

function App() {
  return (
    <Router>
      <PageEnhancements />
      <MinistryAssistant />
      <div className="min-h-screen flex flex-col">
        <Header />
        <main id="main-content" tabIndex={-1} className="flex-grow">
          <Suspense fallback={<div className="ministry-section" role="status">Loading page…</div>}><Routes>
            <Route path="/" element={<Home />} />
            <Route path="/about" element={<About />} />
            <Route path="/watch" element={<Watch />} />
            <Route path="/admin/broadcast" element={<BroadcastEditor />} />
            <Route path="/sermons" element={<Watch />} />
            <Route path="/sermons/:id" element={<Watch />} />
            <Route path="/live" element={<Watch />} />
            <Route path="/salvation" element={<Salvation />} />
            <Route path="/prayer-support" element={<PrayerSupport />} />
            <Route path="/testimonies" element={<Testimonies />} />
            <Route path="/events" element={<Events />} />
            <Route path="/admin/events" element={<EventEditor />} />
            <Route path="/events/register/:id" element={<EventRegister />} />
            <Route path="/blog" element={<Blog />} />
            <Route path="/admin/blog" element={<BlogEditor />} />
            <Route path="/blog/:id" element={<BlogPost />} />
            <Route path="/devotional" element={<Devotional />} />
            <Route path="/devotional/:date" element={<Devotional />} />
            <Route path="/admin/devotionals" element={<DevotionalEditor />} />
            <Route path="/donate" element={<Donate />} />
            <Route path="/donate/return" element={<DonateReturn />} />
            <Route path="/contact" element={<Contact />} />
            <Route path="/help" element={<Help />} />
            <Route path="/support" element={<Support />} />
            <Route path="/admin/support" element={<SupportDesk />} />
            <Route path="/prayer-request" element={<PrayerSupport />} />
            <Route path="/ministries" element={<Ministries />} />
            <Route path="/store" element={<ChurchStore />} />
            <Route path="/admin/store" element={<StoreEditor />} />
            <Route path="/admin/contact" element={<ContactInbox />} />
            <Route path="/meetings" element={<Meetings />} />
            <Route path="/meetings/schedule" element={<PlanMeeting />} />
            <Route path="/meetings/room/:id" element={<InstantMeetingRoom />} />
            <Route path="/meetings/:id" element={<InstantMeetingRoom />} />
            <Route path="/meetings/:id/edit" element={<PlanMeeting />} />
            <Route path="/social" element={<ProtectedRoute><SocialAutomation /></ProtectedRoute>} />
            <Route path="/admin/login" element={<AdminLogin />} />
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<Signup />} />
          </Routes></Suspense>
        </main>
        <Footer />
      </div>
    </Router>
  )
}

export default App






