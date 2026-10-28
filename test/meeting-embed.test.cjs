const { test,before,beforeEach,afterEach,after }=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');const path=require('node:path');
const {JSDOM}=require('jsdom');const {buildSync}=require('esbuild');const React=require('react');const {act}=React;const {createRoot}=require('react-dom/client');const {Simulate}=require('react-dom/test-utils');
let dom,node,root,Component,options,disposed,events,constructs;
const temp=fs.mkdtempSync(path.join(process.cwd(),'.meeting-test-'));
before(()=>{
 dom=new JSDOM('<!doctype html><body></body>',{url:'https://ministry.example/meetings'});global.window=dom.window;global.document=dom.window.document;global.IS_REACT_ACT_ENVIRONMENT=true;
 const output=path.join(temp,'embed.cjs');buildSync({entryPoints:['src/components/meetings/JitsiMeeting.jsx'],outfile:output,bundle:true,platform:'node',format:'cjs',jsx:'automatic',define:{'import.meta.env':'{}'},external:['react','react-dom','react-dom/*']});Component=require(output).default;
});
beforeEach(()=>{options=null;disposed=0;constructs=0;events={};node=document.createElement('div');document.body.append(node);root=createRoot(node);window.JitsiMeetExternalAPI=class{constructor(domain,value){constructs++;options=value;}addEventListener(name,fn){events[name]=fn}dispose(){disposed++}};});
afterEach(async()=>{await act(async()=>root.unmount());node.remove();});after(()=>{dom.window.close();fs.rmSync(temp,{recursive:true,force:true});});
async function render(props={}){await act(async()=>root.render(React.createElement(Component,{roomName:'crh-test-meeting-room',...props})));}
test('meeting embed uses the provider parentNode contract and starts media muted',async()=>{
 await render();const script=document.querySelector('script');await act(async()=>script.onload());assert.ok(options.parentNode instanceof window.HTMLElement);assert.equal(options.parent,undefined);assert.equal(options.configOverwrite.startWithAudioMuted,true);assert.equal(options.configOverwrite.startWithVideoMuted,true);await act(async()=>options.onload());assert.equal(node.textContent.includes('Preparing your meeting'),false);
});
test('script errors expose retry and a separate-tab meeting link',async()=>{
 await render();await act(async()=>document.querySelector('script').onerror());assert.ok(node.textContent.includes('could not load'));assert.ok([...node.querySelectorAll('a')].some(a=>a.href==='https://meet.jit.si/crh-test-meeting-room'));await act(async()=>Simulate.click(node.querySelector('button')));assert.ok(node.textContent.includes('Preparing'));
});
test('unmount disposes the call and prevents late script callbacks from creating another call',async()=>{
 await render();const script=document.querySelector('script');const late=script.onload;await act(async()=>root.unmount());late();assert.equal(constructs,0);assert.equal(document.querySelector('script'),null);
});
test('callback updates do not tear down a running meeting and hangup exposes rejoin',async()=>{
 await render({onReady:()=>{}});await act(async()=>document.querySelector('script').onload());await render({onReady:()=>{}});assert.equal(constructs,1);assert.equal(disposed,0);await act(async()=>events.readyToClose());assert.ok(node.textContent.includes('left the meeting'));assert.ok(node.textContent.includes('Rejoin'));
});

test('calendar downloads use UTC dates and escape user-entered text',async()=>{
 const {meetingCalendar}=await import('../src/utils/calendar.mjs');
 const calendar=meetingCalendar({id:'meeting-1',title:'Prayer, Word; Fellowship\nTogether',description:'Gather together',startTime:'2026-11-01T10:00:00+01:00',endTime:'2026-11-01T11:00:00+01:00'},'https://ministry.example/meetings/room/meeting-1',new Date('2026-10-28T10:00:00Z'));
 assert.ok(calendar.includes('DTSTART:20261101T090000Z'));assert.ok(calendar.includes('SUMMARY:Prayer\\, Word\\; Fellowship\\nTogether'));assert.ok(calendar.includes('\r\nEND:VCALENDAR\r\n'));
});
