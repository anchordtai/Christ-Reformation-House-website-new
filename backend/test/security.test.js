const {test}=require('node:test');
const assert=require('node:assert/strict');
const {requestLimits}=require('../security');
function call(middleware,path,ip='127.0.0.1') {
 const result={status:200,next:false};const res={status(code){result.status=code;return this},set(){return this},json(body){result.body=body;return this}};
 middleware({method:'POST',path,ip},res,()=>{result.next=true});return result;
}
test('dynamic endpoint IDs cannot evade the per-resource write limit',()=>{
 const middleware=requestLimits({limit:2});assert.equal(call(middleware,'/meetings/one').next,true);assert.equal(call(middleware,'/meetings/two').next,true);assert.equal(call(middleware,'/meetings/three').status,429);
});
test('rate-limit memory remains bounded when many client addresses arrive',()=>{
 const middleware=requestLimits({maxKeys:2});assert.equal(call(middleware,'/contact','one').next,true);assert.equal(call(middleware,'/contact','two').next,true);assert.equal(call(middleware,'/contact','three').status,429);
});
