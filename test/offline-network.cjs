// Tests may use loopback fixtures. Never send a request to an external service.
const allowed=hostname=>['localhost','127.0.0.1','::1','[::1]'].includes(String(hostname||'localhost').toLowerCase());
function hostname(value){if(typeof value==='string'||value instanceof URL){try{return new URL(value).hostname}catch{return 'localhost'}}return value?.hostname||String(value?.host||'localhost').split(':')[0]}
for(const name of ['node:http','node:https']){const transport=require(name);for(const method of ['request','get']){const original=transport[method];transport[method]=function(...args){if(!allowed(hostname(args[0])))throw Error('External network is disabled in the test harness. Use a mocked service or loopback fixture.');return original.apply(this,args)}}}
const originalFetch=global.fetch;global.fetch=function(url,...rest){if(!allowed(hostname(url)))return Promise.reject(Error('External network is disabled in the test harness.'));return originalFetch.call(this,url,...rest)};
