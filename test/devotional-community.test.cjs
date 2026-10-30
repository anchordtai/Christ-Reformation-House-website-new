const {test,before,beforeEach,afterEach,after}=require('node:test');const assert=require('node:assert/strict');const fs=require('node:fs');const path=require('node:path');
const {JSDOM}=require('jsdom');const {buildSync}=require('esbuild');
const dom=new JSDOM('<html><body></body></html>',{url:'https://www.christreformationhouse.org.ng/devotional/2026-11-01'});
global.window=dom.window;global.document=dom.window.document;global.navigator=dom.window.navigator;global.localStorage=dom.window.localStorage;global.sessionStorage=dom.window.sessionStorage;global.IS_REACT_ACT_ENVIRONMENT=true;
const React=require('react');const {act}=React;const {createRoot}=require('react-dom/client');const {Simulate}=require('react-dom/test-utils');const {MemoryRouter}=require('react-router-dom');const axios=require('axios');
const old=axios.defaults.adapter;let handler;axios.defaults.adapter=c=>handler(c);
let Community,Giving,Moderation,utils,node,root,calls,copied,failWrite;
const temp=fs.mkdtempSync(path.join(process.cwd(),'.community-test-'));
const entry={publicationDate:'2026-11-01',dayNumber:1,title:'Grace & gratitude',memoryReference:'Psalm 103:2',memoryVerse:'Bless the LORD, O my soul.',translation:'KJV',socialSummary:'Remember mercy.'};
before(async()=>{
 utils=await import('../src/utils/devotional-share.mjs');
 for(const [name,file]of [['community','src/components/DevotionalCommunity.jsx'],['moderation','src/components/DevotionalModeration.jsx']]){
 const out=path.join(temp,name+'.cjs');buildSync({entryPoints:[file],outfile:out,bundle:true,platform:'node',format:'cjs',jsx:'automatic',define:{'import.meta.env':'{}'},external:['react','react-dom','react-dom/*','react-router-dom','axios']});const c=require(out);if(name==='community'){Community=c.default;Giving=c.DevotionalGiving}else Moderation=c.default;
 }
});
beforeEach(()=>{
 calls=[];copied='';failWrite=false;localStorage.clear();sessionStorage.clear();node=document.createElement('div');document.body.append(node);root=createRoot(node);
 Object.defineProperty(navigator,'clipboard',{configurable:true,value:{writeText:async text=>{copied=text}}});Object.defineProperty(navigator,'share',{configurable:true,value:undefined});
 handler=async c=>{calls.push(c);if(failWrite&&c.method==='post')throw {response:{status:503,data:{error:'Connection interrupted'}}};let data;
 if(c.url==='/devotional-editor/comments')data={comments:[{id:'comment-1',publication_date:entry.publicationDate,display_name:'Guest',body:'A reflection',status:'pending'}],nextOffset:null};
 else if(c.url.endsWith('/review'))data={message:'Comment approved.'};
 else if(c.url.endsWith('/like'))data={liked:JSON.parse(c.data).liked,likes:JSON.parse(c.data).liked?4:3};
 else if(c.method==='post')data={message:'Your comment has been submitted for review.'};
 else data={likes:3,liked:false,comments:[{id:'comment-1',display_name:'A reader',body:'<script>bad()</script>',created_at:'2026-11-01T08:00Z'}],nextOffset:null};
 return {data,status:200,headers:{},config:c};
 };
});
afterEach(async()=>{await act(async()=>root.unmount());node.remove()});after(()=>{axios.defaults.adapter=old;fs.rmSync(temp,{recursive:true,force:true});dom.window.close()});
const render=async(component=Community,props={entry})=>act(async()=>root.render(React.createElement(MemoryRouter,{future:{v7_startTransition:true,v7_relativeSplatPath:true}},React.createElement(component,props))));
const click=async name=>act(async()=>Simulate.click([...node.querySelectorAll('button')].find(b=>b.textContent.trim()===name)));
const change=async(selector,value,checked)=>act(async()=>Simulate.change(node.querySelector(selector),{target:{value,checked}}));
test('sharing uses canonical dated links and URL-encodes the caption',()=>{
 const s=utils.devotionalShare(entry);assert.equal(new URL(s.whatsapp).searchParams.get('text'),s.caption);assert.equal(new URL(s.facebook).searchParams.get('u'),s.url);assert.equal(s.url,'https://www.christreformationhouse.org.ng/devotional/2026-11-01');assert.ok(s.caption.includes('Grace & gratitude'));
});
test('reader displays approved comments as escaped text and like changes only after saving',async()=>{
 await render();assert.equal(node.querySelector('script'),null);assert.ok(node.textContent.includes('<script>bad()</script>'));const like=node.querySelector('[aria-pressed]');assert.equal(like.getAttribute('aria-pressed'),'false');
 await act(async()=>Simulate.click(like));assert.equal(like.getAttribute('aria-pressed'),'true');assert.match(like.textContent,/4/);assert.match(calls.at(-1).headers['X-Devotional-Visitor'],/^[a-f0-9]{64}$/);
});
test('comment remains pending, failure keeps text, and retry reuses the submission identifier',async()=>{
 await render();await change('#dev-comment-name','Reader');await change('#dev-comment-body','A thoughtful reflection.');await change('input[type="checkbox"]','on',true);failWrite=true;
 await act(async()=>Simulate.submit(node.querySelector('form')));const first=JSON.parse(calls.at(-1).data);assert.equal(node.querySelector('#dev-comment-body').value,'A thoughtful reflection.');
 failWrite=false;await act(async()=>Simulate.submit(node.querySelector('form')));const second=JSON.parse(calls.at(-1).data);assert.equal(second.submissionId,first.submissionId);assert.match(node.textContent,/submitted for review/);assert.equal(node.querySelector('#dev-comment-body').value,'');assert.equal(node.textContent.includes('A thoughtful reflection.'),false);
});
test('Instagram offers a real caption/card workflow and clipboard fallback',async()=>{
 await render();await click('Instagram');assert.match(node.textContent,/Download the verse card/);await click('Copy caption');assert.equal(copied,utils.devotionalShare(entry).caption);assert.equal(node.querySelector('a[href="https://www.instagram.com/"]').target,'_blank');
});
test('cancelled native share does not claim that anything was published',async()=>{
 Object.defineProperty(navigator,'share',{configurable:true,value:async()=>{throw Object.assign(new Error('cancel'),{name:'AbortError'})}});await render();await click('More apps');assert.equal(node.textContent.includes('shared successfully'),false);
});
test('editorial preview cannot share draft content or call public community routes',async()=>{
 await render(Community,{entry,preview:true});assert.equal(calls.length,0);assert.equal(localStorage.length,0);assert.equal(node.querySelector('a'),null);assert.equal(node.querySelector('form'),null);assert.match(node.textContent,/editorial preview/);
});
test('giving links to the existing checkout without starting a payment',async()=>{await render(Giving,{});assert.equal(node.querySelector('a').getAttribute('href'),'/donate');assert.equal(calls.length,0)});
test('moderation sends the expected status and authenticates using the editor session',async()=>{
 sessionStorage.setItem('crhDevotionalEditorToken','test-editor-token');await render(Moderation,{});await click('Approve comment');const request=calls.find(c=>c.url.endsWith('/review'));assert.deepEqual(JSON.parse(request.data),{status:'approved',expectedStatus:'pending'});assert.equal(request.headers.Authorization,'Bearer test-editor-token');
});
test('shared captions carry the permanent devotional series title and daily topic',()=>{const share=utils.devotionalShare(entry);assert.ok(share.caption.startsWith('UNLEASH THE SUPERNATURAL\nDay 1: Grace & gratitude'));assert.ok(share.caption.includes(entry.memoryReference))});
