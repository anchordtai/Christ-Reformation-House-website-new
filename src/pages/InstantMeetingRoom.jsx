import {useEffect,useState} from 'react'
import {Link,useParams,useSearchParams} from 'react-router-dom'
import {ArrowLeft,ArrowUpRight,Video,ShieldCheck,LogOut} from 'lucide-react'
import MetaTags from '../components/MetaTags'
import DeviceCheck from '../components/meetings/DeviceCheck'
import InvitationPanel from '../components/meetings/InvitationPanel'
import JitsiMeeting from '../components/meetings/JitsiMeeting'
import {validRoom,meetingLink,providerMeetingLink} from '../utils/meeting-links.mjs'
import {meetingConfig,hostSession,hostLogin,signOutHost,joinEmbeddedMeeting,ministryError} from '../services/ministry'
import '../styles/meeting-room.css'

export default function InstantMeetingRoom(){
  const {id}=useParams(),[params]=useSearchParams()
  const title=(params.get('title')||'Online fellowship').slice(0,100)
  const publicProvider=params.get('provider')==='public'
  const [config,setConfig]=useState(null),[configError,setConfigError]=useState(''),[loadKey,setLoadKey]=useState(0)
  const [displayName,setDisplayName]=useState(''),[host,setHost]=useState(false),[signed,setSigned]=useState(()=>!!hostSession()),[email,setEmail]=useState(''),[password,setPassword]=useState('')
  const [session,setSession]=useState(null),[joined,setJoined]=useState(false),[busy,setBusy]=useState(false),[error,setError]=useState(''),[notice,setNotice]=useState('')
  useEffect(()=>{let active=true;setConfig(null);setConfigError('');meetingConfig().then(value=>{if(active)setConfig(value)}).catch(e=>{if(active)setConfigError(ministryError(e))});return()=>{active=false}},[loadKey])
  useEffect(()=>{setSession(null);setJoined(false);setError('')},[id])
  useEffect(()=>{
    let tag=document.querySelector('meta[name="robots"]');const previous=tag?.getAttribute('content'),created=!tag
    if(!tag){tag=document.createElement('meta');tag.name='robots';document.head.append(tag)}tag.content='noindex, nofollow'
    return()=>{if(created)tag.remove();else tag.content=previous||''}
  },[])
  if(!validRoom(id))return <div className="ministry-section"><h1 className="text-3xl font-bold">This invitation is incomplete.</h1><p>Ask your host for the complete meeting link.</p><Link to="/meetings">Meeting center</Link></div>
  const invitationUrl=new URL(meetingLink(id,window.location.origin,title));if(publicProvider)invitationUrl.searchParams.set('provider','public')
  const invitation={room:id,title,url:invitationUrl.href}
  async function login(e){e.preventDefault();setBusy(true);setError('');try{await hostLogin(email,password);setPassword('');setSigned(true);setNotice('Host signed in for this browser tab.')}catch(e){setError(ministryError(e))}finally{setBusy(false)}}
  async function join(e){e.preventDefault();setBusy(true);setError('');setNotice('');try{const result=await joinEmbeddedMeeting({room:id,displayName:displayName.trim(),host});setSession(result);setJoined(false)}catch(e){if(e.response?.status===401){signOutHost();setSigned(false)}setError(ministryError(e))}finally{setBusy(false)}}
  function leave(){setSession(null);setJoined(false);setError('');setNotice('You have left the meeting. You can rejoin from this page.')}
  return <div className="platform-page"><MetaTags title={title} description="Join your ministry meeting and prepare your camera and microphone."/>
    <section className={`platform-page-hero ${session?'crh-room-compact':''}`}><div className="container-custom"><Link to="/meetings" className="meeting-back"><ArrowLeft size={17}/>Meeting center</Link><p className="ministry-eyebrow">Fellowship beyond distance</p><h1>{title}</h1><p>{session?(joined?'You are connected to the meeting.':'One more step: click Join meeting inside the meeting below to connect.'):'Join your gathering, share the invitation and prepare your devices.'}</p></div></section>
    <section className="ministry-section crh-room-section">
      {session?<><div className="crh-call-bar"><p role="status">{joined?'Connected':'Waiting to join'} · {host?'Host':'Guest'}</p><button className="secondary-button" onClick={leave}><LogOut size={17}/>Leave meeting</button></div>{error&&<p role="alert" className="platform-error">{error}</p>}<JitsiMeeting {...session} host={host} displayName={displayName.trim()} subject={title} onReady={()=>setJoined(true)} onClose={leave} onError={setError}/><p className="meeting-open-note">Click Join meeting inside the panel above. The call starts with your microphone and camera off; use their buttons to turn them on and allow browser access. Chat, participants and screen sharing appear after you join. On smaller screens, check More actions for extra controls.</p></>:
      <div className="meeting-form-grid"><div className="meeting-action-card"><Video size={28}/><h2>Join this gathering</h2>
        {!config&&!configError&&<p role="status">Checking the meeting connection…</p>}{configError&&<><p role="alert">{configError}</p><button className="secondary-button" onClick={()=>setLoadKey(value=>value+1)}>Retry connection</button></>}
        {config?.embedded&&!publicProvider?<><p>Your call stays inside the church website. Guests enter their name; authorized hosts use their ministry account.</p><div className="crh-role-picker"><button type="button" aria-pressed={!host} disabled={busy} onClick={()=>{setHost(false);setError('')}}>Join as guest</button><button type="button" aria-pressed={host} disabled={busy} onClick={()=>{setHost(true);setError('')}}>Host this meeting</button></div>
          {host&&!signed?<form onSubmit={login}><label>Host account email<input type="email" required value={email} onChange={e=>setEmail(e.target.value)} autoComplete="username"/></label><label>Password<input type="password" required value={password} onChange={e=>setPassword(e.target.value)} autoComplete="current-password"/></label><button className="ministry-button dark" disabled={busy}>{busy?'Signing in…':'Sign in as host'}</button><p className="meeting-open-note">Use your CRH website host account (the same account as the editorial dashboard), not your email inbox password. Your host session refreshes in this tab. You do not need a separate Jitsi login.</p></form>:<form onSubmit={join}><label>Your name<input required maxLength={80} autoComplete="name" value={displayName} onChange={e=>setDisplayName(e.target.value)} placeholder="How should others see your name?"/></label><button className="ministry-button dark" disabled={busy}>{busy?'Preparing meeting…':host?'Start meeting here':'Join meeting here'}</button>{host&&<button type="button" className="secondary-button" disabled={busy} onClick={()=>{signOutHost();setSigned(false);setNotice('Host signed out of this tab.')}}>Sign out as host</button>}</form>}
        </>:config&&<><p>{publicProvider?'This invitation is for a public Jitsi room, so it opens the original meeting in its own window.':'The current public Jitsi connection opens in its own window. In-website calling is awaiting the ministry’s JaaS connection.'}</p><a className="ministry-button dark" href={providerMeetingLink(id)} target="_blank" rel="noopener noreferrer" referrerPolicy="no-referrer" onClick={()=>setNotice('The meeting link was opened. This page cannot confirm whether you joined.')}><Video size={18}/>Open current Jitsi meeting<ArrowUpRight size={16}/></a><p className="meeting-open-note">Hosts must sign in to Jitsi to start the room; guests can join after the host. The church website cannot control Jitsi’s sign-in session.</p></>}
        {error&&<p role="alert" className="platform-error">{error}</p>}{notice&&<p role="status">{notice}</p>}
      </div><InvitationPanel invitation={invitation} showOpen={false}/></div>}
      {!session&&<DeviceCheck/>}<div className="meeting-notice"><ShieldCheck size={22}/><p><strong>For hosts:</strong> start the gathering before your guests arrive. Use the meeting’s security controls for the lobby or room password, and share private invitations only with intended guests.</p></div>
    </section></div>
}

