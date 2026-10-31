import {useState} from 'react'
import {WATCH_URL,broadcastCaption} from '../utils/broadcast.mjs'
export default function BroadcastShare({title}){
 const [notice,setNotice]=useState('')
 async function copy(){try{await navigator.clipboard.writeText(broadcastCaption(title));setNotice('Invitation copied. Paste it into your social post, message or Status.')}catch{setNotice(`Copy this link: ${WATCH_URL}`)}}
 async function share(){try{await navigator.share({title:title||'Christ’s Reformation House',text:'Worship with us online.',url:WATCH_URL})}catch(e){if(e.name!=='AbortError')copy()}}
 return <div className="crh-broadcast-share"><h3>Invite someone to join you</h3><p>Share the church’s Watch page with family and friends.</p><div className="platform-actions"><a className="secondary-button" href={`https://wa.me/?text=${encodeURIComponent(broadcastCaption(title))}`} target="_blank" rel="noopener noreferrer">WhatsApp</a><a className="secondary-button" href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(WATCH_URL)}`} target="_blank" rel="noopener noreferrer">Facebook</a><button className="secondary-button" onClick={copy}>Copy invitation</button>{typeof navigator.share==='function'&&<button className="secondary-button" onClick={share}>Share…</button>}</div><p className="crh-source-note">For Instagram and TikTok, paste the link in your supported bio or Story link option. Sharing a link does not start a live broadcast on those platforms.</p>{notice&&<p role="status">{notice}</p>}</div>
}
