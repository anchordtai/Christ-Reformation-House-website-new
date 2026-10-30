import {useEffect,useRef} from 'react'

const loaders=new Map()
function loadAPI(appId){
  if(loaders.has(appId))return loaders.get(appId)
  const promise=new Promise((resolve,reject)=>{
    const script=document.createElement('script')
    script.src=`https://8x8.vc/${appId}/external_api.js`;script.async=true
    let settled=false
    const fail=()=>{if(settled)return;settled=true;clearTimeout(timer);script.remove();loaders.delete(appId);reject(new Error('The meeting service did not load. Please retry.'))}
    const timer=setTimeout(fail,20000)
    script.onload=()=>{if(settled)return;if(!window.JitsiMeetExternalAPI){fail();return}settled=true;clearTimeout(timer);resolve(window.JitsiMeetExternalAPI)}
    script.onerror=fail
    document.head.append(script)
  })
  loaders.set(appId,promise);return promise
}
export default function JitsiMeeting({roomName,appId,jwt,displayName='Guest',subject='',onReady,onClose,onError,className=''}){
  const container=useRef(null),callbacks=useRef({onReady,onClose,onError})
  callbacks.current={onReady,onClose,onError}
  useEffect(()=>{
    let disposed=false,api
    if(!/^vpaas-magic-cookie-[a-zA-Z0-9-]{10,80}$/.test(appId||'')||!roomName?.startsWith(appId+'/')||!jwt){callbacks.current.onError?.('The secure meeting connection is incomplete.');return}
    loadAPI(appId).then(Constructor=>{
      if(disposed||!container.current)return
      api=new Constructor('8x8.vc',{roomName,jwt,parentNode:container.current,width:'100%',height:'100%',userInfo:{displayName},configOverwrite:{subject,prejoinConfig:{enabled:true},disableDeepLinking:true,startWithAudioMuted:true,startWithVideoMuted:true,toolbarButtons:['microphone','camera','desktop','chat','raisehand','participants-pane','tileview','settings','security','fullscreen','hangup']}})
      const frame=api.getIFrame?.();if(frame){frame.setAttribute('title','CRH online meeting');frame.setAttribute('allow','camera; microphone; display-capture; fullscreen; autoplay');frame.setAttribute('allowfullscreen','')}
      api.addListener('videoConferenceJoined',()=>callbacks.current.onReady?.())
      api.addListener('readyToClose',()=>callbacks.current.onClose?.())
      api.addListener('errorOccurred',()=>callbacks.current.onError?.('The meeting reported a connection problem. Check your connection or leave and retry.'))
    }).catch(()=>{if(!disposed)callbacks.current.onError?.('The meeting service could not load. Check your connection and retry.')})
    return()=>{disposed=true;api?.dispose();container.current?.replaceChildren()}
  },[roomName,appId,jwt,displayName,subject])
  return <div ref={container} className={`crh-meeting-embed ${className}`} />
}
