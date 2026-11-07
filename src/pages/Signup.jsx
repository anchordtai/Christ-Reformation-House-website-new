import CommunicationSignup from '../components/CommunicationSignup'
import MetaTags from '../components/MetaTags'
export default function Signup(){
 return <div className="platform-page"><MetaTags title="Join CRH community updates" description="Choose your ministry email updates and confirm your subscription."/><section className="platform-page-hero"><div className="container-custom"><h1>Stay connected with CRH.</h1><p>Join our community email updates. We will email a confirmation link before activating your subscription. This form is for email updates; it does not create a staff or meeting-host account.</p></div></section><CommunicationSignup category="newsletter"/></div>
}
