const {test,before,beforeEach,afterEach,after}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {JSDOM}=require('jsdom');
const {buildSync}=require('esbuild');
const dom=new JSDOM('<!doctype html><html><head></head><body></body></html>',{url:'https://church.example/'});
global.window=dom.window;global.document=dom.window.document;global.navigator=dom.window.navigator;global.IS_REACT_ACT_ENVIRONMENT=true;
const React=require('react');
const {act}=React;
const {createRoot}=require('react-dom/client');
const {Simulate}=require('react-dom/test-utils');
const {MemoryRouter}=require('react-router-dom');
let helpers,node,root,components;
const temporary=fs.mkdtempSync(path.join(process.cwd(),'.ministry-test-'));
before(async()=>{
 helpers=await import('../src/utils/meeting-links.mjs');
 components={};
 for(const [name,file] of Object.entries({Assistant:'src/components/MinistryAssistant.jsx',Devices:'src/components/meetings/DeviceCheck.jsx',Testimonies:'src/pages/Testimonies.jsx',Meetings:'src/pages/Meetings.jsx',Room:'src/pages/InstantMeetingRoom.jsx'})){
 const out=path.join(temporary,name+'.cjs');buildSync({entryPoints:[file],outfile:out,bundle:true,platform:'node',format:'cjs',jsx:'automatic',define:{'import.meta.env':'{}'},external:['react','react-dom','react-dom/*','react-router-dom']});components[name]=require(out).default;
 }
});
beforeEach(()=>{node=document.createElement('div');document.body.append(node);root=createRoot(node);});
afterEach(async()=>{await act(async()=>root.unmount());node.remove();window.localStorage.clear();});
after(()=>{fs.rmSync(temporary,{recursive:true,force:true});dom.window.close();});
const render=async(name,route='/')=>act(async()=>root.render(React.createElement(MemoryRouter,{initialEntries:[route],future:{v7_startTransition:true,v7_relativeSplatPath:true}},React.createElement(components[name]))));
const click=async(element)=>act(async()=>Simulate.click(element));
const change=async(selector,value,extra={})=>act(async()=>Simulate.change(node.querySelector(selector),{target:{value,...extra}}));
const submit=async(form)=>act(async()=>Simulate.submit(form));
test('meeting invitations are unpredictable and never fall back to insecure randomness',()=>{
 const first=helpers.newMeetingRoom(),second=helpers.newMeetingRoom();assert.match(first,/^crh-[0-9a-f]{32}$/);assert.notEqual(first,second);assert.throws(()=>helpers.newMeetingRoom({}),/Secure/);
});
test('join accepts own invitations and Jitsi codes, rejects phishing and credentials',()=>{
 const url=helpers.meetingLink('crh-abcdef','https://church.example','Sunday prayer');assert.deepEqual(helpers.parseMeetingInput(url,'https://church.example'),{room:'crh-abcdef',title:'Sunday prayer'});
 assert.equal(helpers.parseMeetingInput('https://meet.jit.si/crh-abcdef','https://church.example').room,'crh-abcdef');
 assert.equal(helpers.parseMeetingInput('http://terminal.local:4173/meetings/room/crh-abcdef','http://terminal.local:4173').room,'crh-abcdef');
 for(const invalid of ['https://evil.example/crh-abcdef','https://meet.jit.si.evil.example/crh-abcdef','https://user:pass@meet.jit.si/crh-abcdef','http://meet.jit.si/crh-abcdef','javascript:alert(1)','https://meet.jit.si/crh-abcdef/extra'])assert.throws(()=>helpers.parseMeetingInput(invalid,'https://church.example'));
 assert.throws(()=>helpers.providerMeetingLink('../bad'));
});
test('calendar invitations preserve time, escape line injection, and enforce public call duration',()=>{
 const data={room:'crh-abcdef',title:'Prayer, faith; hope\rATTENDEE:evil',start:'2026-11-01T09:00:00Z',duration:60,url:'https://church.example/meetings/room/crh-abcdef'};
 const calendar=helpers.meetingCalendar(data);assert.ok(calendar.includes('DTSTART:20261101T090000Z'));assert.ok(calendar.includes('DTEND:20261101T100000Z'));assert.ok(calendar.includes('Prayer\\, faith\\; hope\\nATTENDEE:evil'));assert.equal(calendar.includes('\r\nATTENDEE:'),false);
 assert.throws(()=>helpers.meetingCalendar({...data,duration:96}));assert.throws(()=>helpers.meetingCalendar({...data,url:'javascript:alert(1)'}));
});
test('assistant gives prepared answers, restores focus, and saves no chat',async()=>{
 await render('Assistant');const toggle=node.querySelector('[aria-label="Open ministry assistant"]');await click(toggle);assert.equal(document.activeElement.id,'ministry-question');
 await click([...node.querySelectorAll('button')].find(x=>x.textContent==='Giving'));assert.match(node.textContent,/PIN|OTP/);assert.equal(window.localStorage.length,0);
 await act(async()=>window.dispatchEvent(new window.KeyboardEvent('keydown',{key:'Escape'})));assert.equal(node.querySelector('[role="dialog"]'),null);assert.equal(document.activeElement,toggle);
});
test('assistant and floating button do not cover checkout or meeting rooms',async()=>{
 await render('Assistant','/donate/return');assert.equal(node.querySelector('button'),null);assert.equal(node.querySelector('a'),null);
});
test('testimony is consent-gated and prepares a private draft without publishing',async()=>{
 await render('Testimonies');await change('#testimony-name','Test visitor');await change('#testimony-story','A demonstration story for testing.');await submit(node.querySelector('form'));assert.ok(node.querySelector('[role="alert"]'));assert.equal(node.querySelector('[role="status"]'),null);
 await change('input[type="checkbox"]','on',{checked:true});await submit(node.querySelector('form'));assert.match(node.querySelector('[role="status"]').textContent,/has not sent or published/);
 const draft=node.querySelector('a[href^="mailto:"]').href;assert.ok(decodeURIComponent(draft).includes('No — this story is private'));assert.equal(window.localStorage.length,0);assert.equal(node.querySelector('blockquote'),null);
});
test('meeting center creates a reusable invitation without a backend request',async()=>{
 await render('Meetings');await change('#meeting-title','Sunday gathering');await submit(node.querySelector('form'));const link=node.querySelector('input[readonly]');assert.ok(link);assert.match(link.value,/\/meetings\/room\/crh-[a-f0-9]{32}/);assert.ok(link.value.includes('Sunday+gathering'));assert.match(node.textContent,/95-minute/);
});
test('device permission rejection is actionable and does not claim success',async()=>{
 Object.defineProperty(navigator,'mediaDevices',{configurable:true,value:{getUserMedia:async()=>{throw Object.assign(new Error('denied'),{name:'NotAllowedError'});}}});await render('Devices');await act(async()=>{node.querySelector('details').open=true;});await click([...node.querySelectorAll('button')].find(x=>x.textContent==='Preview camera'));assert.match(node.querySelector('[role="alert"]').textContent,/Permission was not granted/);assert.equal(node.querySelector('video'),null);
});
test('camera tracks stop on closing preview and after a delayed permission grant',async()=>{
 let stopped=0,resolve;const stream={getTracks:()=>[{stop:()=>stopped++}]};Object.defineProperty(navigator,'mediaDevices',{configurable:true,value:{getUserMedia:()=>new Promise(r=>resolve=r)}});await render('Devices');await act(async()=>{node.querySelector('details').open=true;});await click([...node.querySelectorAll('button')].find(x=>x.textContent==='Preview camera'));await act(async()=>{node.querySelector('details').open=false;resolve(stream);});assert.equal(stopped,1);assert.equal(node.querySelector('video'),null);
 await act(async()=>{node.querySelector('details').open=true;});await click([...node.querySelectorAll('button')].find(x=>x.textContent==='Preview camera'));await act(async()=>resolve(stream));assert.ok(node.querySelector('video'));await act(async()=>{const details=node.querySelector('details');details.open=false;Simulate.toggle(details);});assert.equal(stopped,2);
});
