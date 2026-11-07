import '../../styles/meeting-room.css'
import {useId,useState} from 'react'
import FormVerification from '../FormVerification'
import {registerMeeting,ministryError} from '../../services/ministry'

export default function MeetingRegistration({invitation}){
 const id=useId(),[open,setOpen]=useState(false),[form,setForm]=useState({name:'',email:'',consent:false}),[ready,setReady]=useState(false),[verificationToken,setToken]=useState(''),[reset,setReset]=useState(0),[busy,setBusy]=useState(false),[message,setMessage]=useState(''),[error,setError]=useState('')
 async function submit(e){
  e.preventDefault();if(busy)return;setBusy(true);setError('')
  try{const url=new URL(invitation.url);const result=await registerMeeting({...form,room:invitation.room||url.pathname.split('/').pop(),title:invitation.title||'CRH Online Fellowship',provider:url.searchParams.get('provider')||'',verificationToken});setMessage(result.message)}catch(cause){setError(ministryError(cause))}finally{setBusy(false);setReset(value=>value+1)}
 }
 return <details className="crh-meeting-registration" onToggle={e=>setOpen(e.currentTarget.open)}><summary>Register and email me this meeting invitation</summary>{open&&<div><p>Save your attendance registration and receive the guest link by email. You can also join without registering. This does not create a host account or subscribe you to ministry updates.</p>{message?<p role="status">{message}</p>:<form onSubmit={submit}><label htmlFor={id+'name'}>Full name<input id={id+'name'} required maxLength={100} autoComplete="name" value={form.name} onChange={e=>setForm({...form,name:e.target.value})}/></label><label htmlFor={id+'email'}>Email<input id={id+'email'} required type="email" maxLength={254} autoComplete="email" value={form.email} onChange={e=>setForm({...form,email:e.target.value})}/></label><label className="event-consent"><input type="checkbox" required checked={form.consent} onChange={e=>setForm({...form,consent:e.target.checked})}/><span>I agree that CRH may save my meeting registration and email my confirmation.</span></label><FormVerification action="meeting_registration" onReady={setReady} onToken={setToken} resetKey={reset}/>{error&&<p role="alert">{error}</p>}<button type="submit" className="ministry-button dark" disabled={busy||!ready}>{busy?'Registering…':'Register and email confirmation'}</button></form>}</div>}</details>
}
