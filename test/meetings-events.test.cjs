const {test,before,beforeEach,afterEach,after}=require('node:test');
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {JSDOM}=require('jsdom'),{build}=require('esbuild');
const dom=new JSDOM('<html><head></head><body></body></html>',{url:'https://church.example/'});
global.window=dom.window;global.document=dom.window.document;global.navigator=dom.window.navigator;global.IS_REACT_ACT_ENVIRONMENT=true;
const React=require('react'),{act}=React,{createRoot}=require('react-dom/client'),{Simulate}=require('react-dom/test-utils'),{MemoryRouter,Routes,Route}=require('react-router-dom');
const temp=fs.mkdtempSync(path.join(process.cwd(),'.meeting-events-test-'));let root,node,components,helpers,mock;
before(async()=>{
  helpers=await import('../src/utils/events.mjs');components={};
  const serviceExports=['getEvents','getEvent','registerEvent','editEvents','saveEvent','eventRegistrations','meetingConfig','hostSession','hostLogin','signOutHost','joinEmbeddedMeeting'];
  const plugin={name:'ministry-fixture',setup(build){build.onResolve({filter:/services\/ministry$/},()=>({path:'ministry-fixture',namespace:'fixture'}));build.onLoad({filter:/.*/,namespace:'fixture'},()=>({contents:serviceExports.map(name=>`export const ${name}=(...args)=>globalThis.__ministryMock.${name}(...args);`).join('\n')+'\nexport const ministryError=e=>e.response?.data?.error||e.message;',loader:'js'}))}};
  for(const [name,file]of Object.entries({Events:'src/pages/Events.jsx',Register:'src/pages/EventRegister.jsx',Room:'src/pages/InstantMeetingRoom.jsx',Embed:'src/components/meetings/JitsiMeeting.jsx'})){
    const out=path.join(temp,name+'.cjs');await build({entryPoints:[file],outfile:out,bundle:true,platform:'node',format:'cjs',jsx:'automatic',loader:{'.css':'empty'},define:{'import.meta.env':'{}'},external:['react','react-dom','react-dom/*','react-router-dom','axios'],plugins:[plugin]});components[name]=require(out).default;
  }
});
beforeEach(()=>{node=document.createElement('div');document.body.append(node);root=createRoot(node);mock={getEvents:async()=>[],getEvent:async()=>{throw new Error('Event not found')},meetingConfig:async()=>({embedded:false}),hostSession:()=>null};globalThis.__ministryMock=mock});
afterEach(async()=>{await act(async()=>root.unmount());node.remove()});
after(()=>{fs.rmSync(temp,{recursive:true,force:true});dom.window.close();delete globalThis.__ministryMock});
const render=async(name,route='/',props={})=>act(async()=>root.render(React.createElement(MemoryRouter,{initialEntries:[route],future:{v7_startTransition:true,v7_relativeSplatPath:true}},React.createElement(Routes,null,React.createElement(Route,{path:name==='Room'?'/meetings/room/:id':name==='Register'?'/events/register/:id':'*',element:React.createElement(components[name],props)})))));
const change=async(selector,value,extra={})=>act(async()=>Simulate.change(node.querySelector(selector),{target:{value,...extra}}));
const click=async(button)=>act(async()=>Simulate.click(button));
const event={id:'1b498156-9a90-414a-9e56-23c0996c366a',title:'Future gathering',description:'Confirmed ministry event.',category:'Prayer',location:'Online',starts_at:'2099-11-01T17:00:00Z',ends_at:'2099-11-01T18:00:00Z',registration_enabled:true};
test('events do not invent gatherings or offer sample 2024 registrations',async()=>{
  await render('Events');assert.match(node.textContent,/dates are on the way/);assert.equal(node.querySelector('a[href*="/events/register/"]'),null);assert.doesNotMatch(node.textContent,/2024|150 expected/);
});
test('events show database content, filter by search and preserve the event identity',async()=>{
  mock.getEvents=async()=>[event];await render('Events');assert.match(node.textContent,/Future gathering/);assert.equal(node.querySelector('a[href*="/events/register/"]').getAttribute('href'),'/events/register/'+event.id);await change('input[type="search"]','unmatched');assert.match(node.textContent,/No events match/);
});
test('unknown event links never show a fabricated event or a registration form',async()=>{
  await render('Register','/events/register/missing');assert.match(node.textContent,/Event unavailable/);assert.equal(node.querySelector('form'),null);
});
test('registration only confirms after a successful server response; errors keep the form',async()=>{
  mock.getEvent=async()=>event;let attempts=0;mock.registerEvent=async()=>{attempts++;if(attempts===1)throw new Error('Database unavailable');return {message:'Your registration has been received.'}};
  await render('Register','/events/register/'+event.id);
  await change('input[autocomplete="name"]','Test visitor');await change('input[type="email"]','test@example.invalid');await change('input[type="checkbox"]','on',{checked:true});
  await act(async()=>Simulate.submit(node.querySelector('form')));assert.match(node.querySelector('[role="alert"]').textContent,/Database unavailable/);assert.doesNotMatch(node.textContent,/Thank you for registering/);
  await act(async()=>Simulate.submit(node.querySelector('form')));assert.match(node.textContent,/Thank you for registering/);assert.equal(node.querySelector('form'),null);assert.doesNotMatch(node.textContent,/sent a confirmation email/);
});
test('Nigeria event entry round trips without depending on the browser timezone',()=>{
  assert.equal(helpers.fromNigeriaInput('2026-11-01T18:00'),'2026-11-01T17:00:00.000Z');assert.equal(helpers.nigeriaInput('2026-11-01T17:00:00Z'),'2026-11-01T18:00');
});
test('the public meeting option is honest about its external window and sign-in requirement',async()=>{
  await render('Room','/meetings/room/crh-testroom');assert.match(node.textContent,/awaiting the ministry’s JaaS connection/);const button=node.querySelector('a[href^="https://meet.jit.si/"]');assert.equal(button.target,'_blank');assert.equal(node.querySelector('iframe'),null);
});
test('configured guest room needs no login and does not claim a call is connected before joining',async()=>{
  mock.meetingConfig=async()=>({embedded:true});let received;mock.joinEmbeddedMeeting=async input=>{received=input;throw new Error('Connection unavailable')};await render('Room','/meetings/room/crh-testroom');assert.match(node.textContent,/call stays inside/);assert.equal(node.querySelector('input[type="password"]'),null);await change('input[autocomplete="name"]','Test guest');await act(async()=>Simulate.submit(node.querySelector('form')));assert.equal(received.host,false);assert.equal(received.room,'crh-testroom');assert.match(node.querySelector('[role="alert"]').textContent,/Connection unavailable/);assert.doesNotMatch(node.textContent,/You are connected/);
});
test('host login is distinct from the anonymous guest join form',async()=>{
  mock.meetingConfig=async()=>({embedded:true});await render('Room','/meetings/room/crh-testroom');await click([...node.querySelectorAll('button')].find(b=>b.textContent==='Host this meeting'));assert.ok(node.querySelector('input[type="password"]'));assert.match(node.textContent,/session refreshes in this tab/);
});
test('a pasted public-Jitsi invitation never switches silently to the configured embedded provider',async()=>{
  mock.meetingConfig=async()=>({embedded:true});await render('Room','/meetings/room/crh-testroom?provider=public');assert.match(node.textContent,/original meeting/);assert.ok(node.querySelector('a[href^="https://meet.jit.si/"]'));assert.equal(node.querySelector('form'),null);assert.match(node.querySelector('input[readonly]').value,/provider=public/);
});
test('late SDK load cannot resurrect an unmounted call; active embed uses parentNode and disposes',async()=>{
  const appId='vpaas-magic-cookie-0123456789abcdef',props={appId,roomName:appId+'/crh-testroom',jwt:'test-jwt',displayName:'Tester'};let count=0,disposed=0,options,listeners={};
  window.JitsiMeetExternalAPI=function(domain,input){count++;options=input;assert.equal(domain,'8x8.vc');const iframe=document.createElement('iframe');input.parentNode.append(iframe);this.getIFrame=()=>iframe;this.addListener=(name,fn)=>{listeners[name]=fn};this.dispose=()=>{disposed++;iframe.remove()}};
  await render('Embed','/',props);const script=document.querySelector('script[src*="8x8.vc"]');assert.ok(script);await act(async()=>root.render(null));await act(async()=>script.onload());assert.equal(count,0);
  let ready=0;await render('Embed','/',{...props,onReady:()=>ready++});assert.equal(count,1);assert.ok(options.parentNode);assert.equal(options.parent,undefined);assert.equal(options.configOverwrite.startWithAudioMuted,true);assert.match(node.querySelector('iframe').getAttribute('allow'),/display-capture/);await act(async()=>listeners.videoConferenceJoined());assert.equal(ready,1);await act(async()=>root.render(null));assert.equal(disposed,1);assert.equal(node.querySelector('iframe'),null);
});


test('host lobby starts only after moderator confirmation, with visible admit and decline requests',async()=>{
  const appId='vpaas-magic-cookie-fedcba9876543210',props={appId,roomName:appId+'/crh-hosttest',jwt:'test-jwt',host:true};let listeners={},commands=[],options;
  window.JitsiMeetExternalAPI=function(domain,input){options=input;this.addListener=(name,fn)=>listeners[name]=fn;this.executeCommand=(...args)=>commands.push(args);this.dispose=()=>{}};
  await render('Embed','/',props);await act(async()=>document.querySelector(`script[src*="${appId}"]`).onload());
  assert.equal(options.configOverwrite.toolbarConfig.alwaysVisible,true);
  assert.deepEqual(commands,[]);
  await act(async()=>listeners.participantRoleChanged({id:'local',role:'participant'}));assert.deepEqual(commands,[]);
  await act(async()=>listeners.participantRoleChanged({id:'local',role:'moderator'}));assert.deepEqual(commands,[['toggleLobby',true]]);
  await act(async()=>listeners.participantRoleChanged({id:'local',role:'moderator'}));assert.equal(commands.length,1);
  await act(async()=>listeners.knockingParticipant({participant:{id:'guest-one',name:'Test guest'}}));
  assert.match(node.querySelector('[role="alert"]').textContent,/1 participant is waiting/);
  await click([...node.querySelectorAll('button')].find(b=>b.textContent==='Admit Test guest'));
  assert.deepEqual(commands.at(-1),['answerKnockingParticipant','guest-one',true]);assert.equal(node.querySelector('[aria-label="Participants waiting to join"]'),null);
  await act(async()=>listeners.knockingParticipant({participant:{id:'guest-two',name:'Other guest'}}));
  await click([...node.querySelectorAll('button')].find(b=>b.textContent==='Decline Other guest'));
  assert.deepEqual(commands.at(-1),['answerKnockingParticipant','guest-two',false]);
  await act(async()=>listeners.knockingParticipant({participant:{id:'guest-three',name:'Leaving guest'}}));
  await act(async()=>listeners.participantLeft({id:'guest-three'}));assert.equal(node.querySelector('[aria-label="Participants waiting to join"]'),null);
  await act(async()=>listeners.micError({type:'NotAllowedError'}));assert.match(node.querySelector('[role="alert"]').textContent,/Allow microphone access/);
  await act(async()=>root.render(null));commands=[];listeners={};await render('Embed','/',{...props,host:false});
  await act(async()=>listeners.participantRoleChanged({id:'local',role:'moderator'}));assert.deepEqual(commands,[]);
  await act(async()=>listeners.knockingParticipant({participant:{id:'guest',name:'Guest'}}));assert.equal(node.querySelector('[aria-label="Participants waiting to join"]'),null);
});
