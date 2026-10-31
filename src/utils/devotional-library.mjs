export const LIBRARY_KEY='crhDevotionalLibraryV1'
const FIRST='2026-11-01',LAST='2027-10-31'
export function libraryDate(value){return typeof value==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(value)&&value>=FIRST&&value<=LAST&&Number.isFinite(Date.parse(value))&&new Date(value).toISOString().slice(0,10)===value}
export function emptyLibrary(){return {version:1,rememberHistory:false,bookmarks:[],completed:[],recent:[]}}
export function cleanLibrary(value){
 const clean=emptyLibrary();if(!value||typeof value!=='object'||value.version!==1)return clean
 const dates=list=>Array.isArray(list)?[...new Set(list.filter(libraryDate))].slice(0,366):[]
 clean.bookmarks=dates(value.bookmarks);clean.completed=dates(value.completed);clean.rememberHistory=value.rememberHistory===true
 clean.recent=clean.rememberHistory?dates(value.recent).slice(0,60):[];return clean
}
export function readLibrary(storage){try{return {library:cleanLibrary(JSON.parse(storage.getItem(LIBRARY_KEY)||'null')),persistent:true}}catch{return {library:emptyLibrary(),persistent:false}}}
export function writeLibrary(storage,value){try{storage.setItem(LIBRARY_KEY,JSON.stringify(cleanLibrary(value)));return true}catch{return false}}
export function toggleLibraryDate(state,key,date){if(!['bookmarks','completed'].includes(key)||!libraryDate(date))return state;return {...state,[key]:state[key].includes(date)?state[key].filter(d=>d!==date):[date,...state[key]].slice(0,366)}}
export function rememberOpened(state,date){if(!state.rememberHistory||!libraryDate(date))return state;return {...state,recent:[date,...state.recent.filter(d=>d!==date)].slice(0,60)}}
export function libraryEntries(entries,state,view='all'){
 if(view==='all')return entries
 const dates=state[{saved:'bookmarks',read:'completed',recent:'recent'}[view]]||[]
 const byDate=new Map(entries.map(entry=>[entry.publicationDate,entry]));return dates.map(date=>byDate.get(date)).filter(Boolean)
}
// Search markers become React text/mark nodes; source HTML is never interpreted.
export function excerptParts(value=''){return String(value).slice(0,500).split(/(\[\[[\s\S]*?\]\])/g).filter(Boolean).map(text=>text.startsWith('[[')&&text.endsWith(']]')?{text:text.slice(2,-2),highlight:true}:{text,highlight:false})}
