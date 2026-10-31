import {useEffect,useRef,useState} from 'react'

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
export default function JitsiMeeting({roomName,appId,jwt,displayName='Guest',subject='',host=false,onReady,onClose,onError,className=''}){
  const container=useRef(null),callbacks=useRef({onReady,onClose,onError})
  const meeting=useRef(null)
  const [moderator,setModerator]=useState(false),[waiting,setWaiting]=useState([]),[deviceNotice,setDeviceNotice]=useState('')
  callbacks.current={onReady,onClose,onError}
  useEffect(()=>{
    let disposed=false,api,lobbyRequested=false
    setModerator(false);setWaiting([]);setDeviceNotice('')
    if(!/^vpaas-magic-cookie-[a-zA-Z0-9-]{10,80}$/.test(appId||'')||!roomName?.startsWith(appId+'/')||!jwt){callbacks.current.onError?.('The secure meeting connection is incomplete.');return}
    loadAPI(appId).then(Constructor=>{
      if(disposed||!container.current)return
      api=new Constructor('8x8.vc',{roomName,jwt,parentNode:container.current,width:'100%',height:'100%',userInfo:{displayName},configOverwrite:{subject,prejoinConfig:{enabled:true},disableDeepLinking:true,startWithAudioMuted:true,startWithVideoMuted:true,toolbarConfig:{alwaysVisible:true},toolbarButtons:['microphone','camera','desktop','chat','raisehand','participants-pane','tileview','settings','security','fullscreen','hangup']}})
      meeting.current=api
      container.current.scrollIntoView?.({block:'start',behavior:'auto'})
      const frame=api.getIFrame?.();if(frame){frame.setAttribute('title','CRH online meeting');frame.setAttribute('allow','camera; microphone; display-capture; fullscreen; autoplay');frame.setAttribute('allowfullscreen','')}
      api.addListener('videoConferenceJoined',()=>callbacks.current.onReady?.())
      // Jitsi emits this event for the local participant. The signed token,
      // rather than the host selector, determines the actual moderator role.
      api.addListener('participantRoleChanged',event=>{
        const authorized=host&&event.role==='moderator'
        setModerator(authorized)
        if(!authorized){setWaiting([]);return}
        if(!lobbyRequested){api.executeCommand('toggleLobby',true);lobbyRequested=true}
      })
      api.addListener('knockingParticipant',({participant})=>{
        if(!host||!participant?.id)return
        setWaiting(previous=>[...previous.filter(item=>item.id!==participant.id),{id:participant.id,name:participant.name||'Guest'}])
      })
      const removeWaiting=({id})=>setWaiting(previous=>previous.filter(item=>item.id!==id))
      api.addListener('participantJoined',removeWaiting)
      api.addListener('participantLeft',removeWaiting)
      api.addListener('cameraError',()=>setDeviceNotice('Camera unavailable. Allow camera access in your browser and check that another app is not using it.'))
      api.addListener('micError',()=>setDeviceNotice('Microphone unavailable. Allow microphone access in your browser and check your selected device.'))
      api.addListener('readyToClose',()=>callbacks.current.onClose?.())
      api.addListener('errorOccurred',()=>callbacks.current.onError?.('The meeting reported a connection problem. Check your connection or leave and retry.'))
    }).catch(()=>{if(!disposed)callbacks.current.onError?.('The meeting service could not load. Check your connection and retry.')})
    return()=>{disposed=true;meeting.current=null;api?.dispose();container.current?.replaceChildren()}
  },[roomName,appId,jwt,displayName,subject,host])
  function answer(id,approved){
    if(!moderator||!meeting.current)return
    meeting.current.executeCommand('answerKnockingParticipant',id,approved)
    setWaiting(previous=>previous.filter(item=>item.id!==id))
  }
  return <div className={className}>
    {host&&<p className="meeting-open-note" role="status">{moderator?'Host controls ready. Lobby requested; check Security in the meeting to confirm it is enabled before inviting guests.':'Complete Join meeting below. Host controls appear after the meeting confirms your moderator role.'}</p>}
    {moderator&&waiting.length>0&&<section className="crh-lobby-requests" aria-label="Participants waiting to join"><h2 role="alert">{waiting.length} {waiting.length===1?'participant is':'participants are'} waiting to join</h2>{waiting.map(participant=><div className="crh-lobby-request" key={participant.id}><span>{participant.name}</span><button className="ministry-button dark" onClick={()=>answer(participant.id,true)}>Admit {participant.name}</button><button className="secondary-button" onClick={()=>answer(participant.id,false)}>Decline {participant.name}</button></div>)}</section>}
    {deviceNotice&&<p role="alert" className="platform-error">{deviceNotice}</p>}
    <div ref={container} className="crh-meeting-embed" />
  </div>
}

