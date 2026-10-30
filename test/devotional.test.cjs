const {test,before,beforeEach,afterEach,after}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');const path=require('node:path');
const {JSDOM}=require('jsdom');const {buildSync}=require('esbuild');
const dom=new JSDOM('<html><body></body></html>',{url:'https://church.example/devotional/2026-11-01'});
global.window=dom.window;global.document=dom.window.document;global.navigator=dom.window.navigator;global.sessionStorage=dom.window.sessionStorage;global.IS_REACT_ACT_ENVIRONMENT=true;
const React=require('react');const {act}=React;const {createRoot}=require('react-dom/client');const {Simulate}=require('react-dom/test-utils');const {MemoryRouter,Routes,Route}=require('react-router-dom');const axios=require('axios');
const temp=fs.mkdtempSync(path.join(process.cwd(),'.devotional-test-'));
let Reader,Editor,node,root,mode,calls,resolveReading,currentAdapter;
const oldAdapter=axios.defaults.adapter;
axios.defaults.adapter=config=>currentAdapter(config);
before(()=>{
 for(const [name,source] of [['Reader','src/pages/Devotional.jsx'],['Editor','src/pages/DevotionalEditor.jsx']]){
 const out=path.join(temp,name+'.cjs');buildSync({entryPoints:[source],outfile:out,bundle:true,platform:'node',format:'cjs',jsx:'automatic',define:{'import.meta.env':'{}'},external:['react','react-dom','react-dom/*','react-router-dom','axios'],loader:{'.css':'empty'}});
 if(name==='Reader')Reader=require(out).default;else Editor=require(out).default;
 }
});
const fixture={publicationDate:'2026-11-01',dayNumber:1,title:'A reviewed reading',monthlyTheme:'Thanksgiving',dailyTheme:'Remember grace',mainReference:'Psalm 103:2',translation:'KJV',mainPassage:'Bless the LORD',message:'<script>unsafe()</script>\n\nSecond paragraph',keyLessons:['Remember'],applications:{personal:'Give thanks'},familyPrayers:['Pray for family'],socialSummary:'Remember grace'};
beforeEach(()=>{mode='reading';calls=[];sessionStorage.clear();node=document.createElement('div');document.body.append(node);root=createRoot(node);currentAdapter=async c=>{calls.push(c);if(mode==='offline')throw new Error('network');if(mode==='delayed'&&c.params?.date)return new Promise(r=>{resolveReading=()=>r({data:{entries:[fixture]},status:200,headers:{},config:c})});return {data:{entries:mode==='empty'?[]:[fixture]},status:200,headers:{},config:c}}});
afterEach(async()=>{await act(async()=>root.unmount());node.remove()});
after(()=>{axios.defaults.adapter=oldAdapter;fs.rmSync(temp,{recursive:true,force:true});dom.window.close()});
const renderReader=async()=>act(async()=>root.render(React.createElement(MemoryRouter,{initialEntries:['/devotional/2026-11-01'],future:{v7_startTransition:true,v7_relativeSplatPath:true}},React.createElement(Routes,null,React.createElement(Route,{path:'/devotional/:date',element:React.createElement(Reader)})))));
test('reader renders the supplied format and escapes manuscript text',async()=>{
 await renderReader();assert.match(node.textContent,/Day 1: A reviewed reading/);assert.match(node.textContent,/E. Prayer for Christ/);assert.match(node.textContent,/Today’s reflection/);assert.equal(node.querySelector('script'),null);assert.ok(node.textContent.includes('<script>unsafe()</script>'));assert.ok(calls.some(c=>c.params?.date==='2026-11-01'));
});
test('missing dates show an honest empty state',async()=>{mode='empty';await renderReader();assert.match(node.textContent,/No reading has been released/);assert.equal(node.querySelector('article'),null)});
test('outages show a retry action without a sample reading',async()=>{mode='offline';await renderReader();assert.ok(node.querySelector('[role="alert"]'));assert.ok([...node.querySelectorAll('button')].some(b=>b.textContent==='Try again'));assert.equal(node.querySelector('article'),null)});
test('archive search filters titles and scripture',async()=>{await renderReader();await act(async()=>Simulate.change(node.querySelector('input[type="search"]'),{target:{value:'not present'}}));assert.equal(node.querySelector('nav[aria-label="Devotional archive"] a'),null);await act(async()=>Simulate.change(node.querySelector('input[type="search"]'),{target:{value:'Psalm'}}));assert.ok(node.querySelector('nav[aria-label="Devotional archive"] a'))});
test('late reading response after unmount is ignored',async()=>{mode='delayed';await renderReader();assert.match(node.textContent,/Loading/);await act(async()=>root.render(null));await act(async()=>resolveReading());assert.equal(node.textContent,'')});
test('editor sign-in does not request private entries before authentication',async()=>{await act(async()=>root.render(React.createElement(MemoryRouter,{future:{v7_startTransition:true,v7_relativeSplatPath:true}},React.createElement(Editor))));assert.ok(node.querySelector('input[type="password"]'));assert.equal(calls.length,0);assert.equal(window.localStorage.length,0)});
test('editor offers email-based password setup without requiring the old password',async()=>{
 await act(async()=>root.render(React.createElement(MemoryRouter,{future:{v7_startTransition:true,v7_relativeSplatPath:true}},React.createElement(Editor))));
 await act(async()=>Simulate.click([...node.querySelectorAll('button')].find(b=>b.textContent==='Set or reset password')));
 assert.equal(node.querySelector('input[type="password"]'),null);assert.match(node.textContent,/Email password setup link/);
 await act(async()=>Simulate.change(node.querySelector('input[type="email"]'),{target:{value:'editor@example.com'}}));
 await act(async()=>Simulate.submit(node.querySelector('form')));
 assert.equal(calls.at(-1).url,'/devotional-editor/password-reset');assert.deepEqual(JSON.parse(calls.at(-1).data),{email:'editor@example.com'});
});
test('recovery tokens leave the address bar and matching password confirmation is required',async()=>{
 window.history.replaceState(null,'','/admin/devotionals#access_token=test-recovery-token&refresh_token=never-store&type=recovery');
 await act(async()=>root.render(React.createElement(MemoryRouter,{future:{v7_startTransition:true,v7_relativeSplatPath:true}},React.createElement(Editor))));
 assert.equal(window.location.hash,'');assert.equal(sessionStorage.length,0);assert.equal(window.localStorage.length,0);assert.match(node.textContent,/Choose your editorial password/);
 const inputs=node.querySelectorAll('input[type="password"]');
 await act(async()=>Simulate.change(inputs[0],{target:{value:'not-a-real-password'}}));
 await act(async()=>Simulate.change(inputs[1],{target:{value:'a-different-password'}}));
 await act(async()=>Simulate.submit(node.querySelector('form')));assert.match(node.textContent,/do not match/);assert.equal(calls.length,0);
 await act(async()=>Simulate.change(inputs[1],{target:{value:'not-a-real-password'}}));
 await act(async()=>Simulate.submit(node.querySelector('form')));assert.equal(calls.at(-1).url,'/devotional-editor/password');assert.equal(calls.at(-1).headers.Authorization,'Bearer test-recovery-token');assert.equal(sessionStorage.length,0);
});
