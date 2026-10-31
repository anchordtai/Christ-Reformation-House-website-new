import {useEffect,useRef,useState} from 'react'
import {LIBRARY_KEY,emptyLibrary,readLibrary,writeLibrary,toggleLibraryDate,rememberOpened} from '../utils/devotional-library.mjs'
function initial(){try{return readLibrary(window.localStorage)}catch{return {library:emptyLibrary(),persistent:false}}}
export default function useDevotionalLibrary(){
 const [snapshot,setSnapshot]=useState(initial),[storageNotice,setStorageNotice]=useState(''),current=useRef(snapshot.library);current.current=snapshot.library
 useEffect(()=>{function changed(event){if(event.key!==LIBRARY_KEY&&event.key!==null)return;const value=initial();current.current=value.library;setSnapshot(value)}window.addEventListener('storage',changed);return()=>window.removeEventListener('storage',changed)},[])
 function update(transform){const next=transform(current.current);if(next===current.current)return;current.current=next;let persistent=false;try{persistent=writeLibrary(window.localStorage,next)}catch{}setSnapshot({library:next,persistent});if(!persistent)setStorageNotice('This browser could not update saved reading data. Changes apply only to this tab; previously saved data may remain until you clear browser storage.')}
 return {library:snapshot.library,persistent:snapshot.persistent,storageNotice,
 toggleBookmark:date=>update(s=>toggleLibraryDate(s,'bookmarks',date)),toggleRead:date=>update(s=>toggleLibraryDate(s,'completed',date)),
 opened:date=>update(s=>rememberOpened(s,date)),remember:value=>update(s=>({...s,rememberHistory:value,recent:value?s.recent:[]})),
 clear:()=>update(()=>emptyLibrary())}
}
