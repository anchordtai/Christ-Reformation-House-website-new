const {test,before,beforeEach,afterEach,after}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {JSDOM}=require('jsdom'),{build}=require('esbuild');
const dom=new JSDOM('<html><head></head><body></body></html>',{url:'https://www.christreformationhouse.org.ng/subscribe/confirm#token='+'a'.repeat(64)});
Object.assign(global,{window:dom.window,document:dom.window.document,sessionStorage:dom.window.sessionStorage,IS_REACT_ACT_ENVIRONMENT:true});
Object.defineProperty(global,'navigator',{value:dom.window.navigator,configurable:true});
const React=require('react'),{act}=React,{createRoot}=require('react-dom/client'),{Simulate}=require('react-dom/test-utils'),{MemoryRouter}=require('react-router-dom');
let views={},node,root,calls,configured;const temp=fs.mkdtempSync(path.join(process.cwd(),'.communications-test-'));
before(async()=>{for(const [name,file]of Object.entries({Signup:'src/components/CommunicationSignup.jsx',Subscription:'src/pages/CommunicationSubscription.jsx',Desk:'src/pages/CommunicationDesk.jsx'})){
 const out=path.join(temp,name+'.cjs');await build({entryPoints:[file],outfile:out,bundle:true,platform:'node',format:'cjs',jsx:'automatic',loader:{'.css':'empty'},external:['react','react-dom','react-router-dom'],plugins:[{name:'fixtures',setup(b){
 b.onResolve({filter:/services\/communications$/},()=>({path:'service',namespace:'fixture'}));b.onResolve({filter:/FormVerification$/},()=>({path:'verification',namespace:'fixture'}));
 b.onLoad({filter:/.*/,namespace:'fixture'},a=>({contents:a.path==='verification'?`import {useEffect} from 'react';export default function Verification({onReady}){useEffect(()=>onReady(true),[]);return null}`:`export const publicCommunication=(...a)=>globalThis.__communications(...a);export const communicationError=e=>e.message;export const communicationToken=()=>'';export const communicationLogin=()=>{};export const communicationSignOut=()=>{};export const staffCommunication=(...a)=>globalThis.__communications('PRIVATE',...a);`}))
 }}]});views[name]=require(out).default;
}});
beforeEach(()=>{calls=[];configured=true;globalThis.__communications=async(...args)=>{calls.push(args);return args[0]==='config'?{email:configured?'configured':'setup_required'}:{message:'Fixture saved'}};node=document.createElement('div');document.body.append(node);root=createRoot(node)});
afterEach(async()=>{await act(async()=>root.unmount());node.remove()});after(()=>{fs.rmSync(temp,{recursive:true,force:true});dom.window.close()});
async function render(name,route='/subscribe',props={}){await act(async()=>root.render(React.createElement(MemoryRouter,{initialEntries:[route]},React.createElement(views[name],props))))}
const button=text=>[...node.querySelectorAll('button')].find(x=>x.textContent.includes(text));
test('signup asks for distinct consent, selects only requested category and cannot claim delivery',async()=>{
 await render('Signup','/events',{category:'events'});const checks=[...node.querySelectorAll('input[type=checkbox]')];assert.equal(checks.filter(x=>x.checked).length,1);assert.equal(checks.at(-1).checked,false);assert.equal(checks.at(-1).required,true);assert.match(node.textContent,/Confirm your email/);assert.equal(node.querySelectorAll('input[type=password]').length,0);
});
test('inactive provider disables public subscription without collecting addresses',async()=>{
 configured=false;await render('Signup');assert.equal(button('Subscribe by email').disabled,true);assert.match(node.textContent,/being prepared/);assert.equal(calls.filter(x=>x[0]!=='config').length,0);
});
test('opening a confirmation link does not subscribe until an explicit click',async()=>{
 window.history.replaceState(null,'','/subscribe/confirm#token='+'b'.repeat(64));await render('Subscription','/subscribe/confirm');assert.equal(calls.length,0);assert.equal(window.location.hash,'');
 await act(async()=>Simulate.click(button('Confirm my subscription')));assert.equal(calls.length,1);assert.equal(calls[0][0],'confirm');assert.equal(calls[0][1].token,'b'.repeat(64));assert.match(node.textContent,/Fixture saved/);
});
test('preferences unsubscribe uses a deliberate POST action rather than a link-opening side effect',async()=>{
 window.history.replaceState(null,'','/subscribe/preferences#token='+'c'.repeat(64));await render('Subscription','/subscribe/preferences');assert.equal(calls.length,0);
 await act(async()=>Simulate.click(button('Unsubscribe from all')));assert.equal(calls[0][0],'preferences');assert.equal(calls[0][1].unsubscribe,true);
});
test('communication desk does not read private data before staff sign-in',async()=>{
 await render('Desk','/admin/communications');assert.ok(node.querySelector('input[type=password]'));assert.equal(calls.length,0);
});
