import {useEffect,useRef,useState} from 'react'
import {supportConfig} from '../services/support'
let scriptPromise
function loadScript(){
 if(window.turnstile)return Promise.resolve(window.turnstile)
 if(!scriptPromise)scriptPromise=new Promise((resolve,reject)=>{
  const script=document.createElement('script');script.src='https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';script.async=true;script.defer=true
  script.onload=()=>resolve(window.turnstile);script.onerror=()=>{scriptPromise=null;script.remove();reject(Error('Verification could not load.'))};document.head.appendChild(script)
 })
 return scriptPromise
}
export default function FormVerification({action,onReady,onToken,resetKey=0}){
 const container=useRef(null),callbacks=useRef({onReady,onToken}),[error,setError]=useState(''),[retry,setRetry]=useState(0)
 callbacks.current={onReady,onToken}
 useEffect(()=>{
  let active=true,widget,api;setError('');callbacks.current.onReady(false);callbacks.current.onToken('')
  supportConfig().then(async config=>{
   if(!active)return
   if(!config.verification_required){callbacks.current.onReady(true);return}
   if(!config.verification_site_key)throw Error('Form verification is being configured. Please contact the ministry directly.')
   api=await loadScript();if(!active)return
   const reset=()=>{callbacks.current.onToken('');callbacks.current.onReady(false)}
   widget=api.render(container.current,{sitekey:config.verification_site_key,action,callback:token=>{if(active){callbacks.current.onToken(token);callbacks.current.onReady(true)}},'expired-callback':reset,'error-callback':()=>{reset();if(active)setError('Verification failed. Please reload it and try again.')}})
  }).catch(e=>{if(active)setError(e.message||'Unable to load form verification.')})
  return()=>{active=false;if(widget!==undefined)api?.remove(widget)}
 },[action,resetKey,retry])
 return <div className="form-verification"><div ref={container}/>{error&&<div role="alert"><p>{error}</p><button className="secondary-button" type="button" onClick={()=>setRetry(v=>v+1)}>Reload verification</button></div>}</div>
}
