const {test}=require('node:test');
const assert=require('node:assert/strict');
const crypto=require('node:crypto');
const {settings,configurationChecks}=require('../jaas-settings');
const pair=crypto.generateKeyPairSync('rsa',{modulusLength:2048});
const privatePEM=pair.privateKey.export({type:'pkcs8',format:'pem'});
const appId='vpaas-magic-cookie-0123456789abcdef';
const env={JAAS_APP_ID:appId,JAAS_KEY_ID:appId+'/test-key',JAAS_PRIVATE_KEY:privatePEM};

test('valid RSA settings retain the signing key internally and expose only fixed check codes',()=>{
  const config=settings(env);assert.equal(config.appId,appId);assert.equal(config.privateKey.type,'private');
  assert.deepEqual(configurationChecks(env),{JAAS_APP_ID:'valid',JAAS_KEY_ID:'valid',JAAS_PRIVATE_KEY:'valid'});
  const output=JSON.stringify(configurationChecks(env));assert.equal(output.includes(appId),false);assert.equal(output.includes('BEGIN'),false);assert.equal(output.includes('test-key'),false);
});
test('identifies missing app, mismatched key ID and a public key without echoing inputs',()=>{
  assert.equal(configurationChecks({...env,JAAS_APP_ID:''}).JAAS_APP_ID,'missing');
  assert.equal(configurationChecks({...env,JAAS_KEY_ID:'different-app/key'}).JAAS_KEY_ID,'app_id_mismatch');
  assert.equal(configurationChecks({...env,JAAS_KEY_ID:appId+'/'}).JAAS_KEY_ID,'invalid_format');
  assert.equal(configurationChecks({...env,JAAS_PRIVATE_KEY:pair.publicKey.export({type:'spki',format:'pem'})}).JAAS_PRIVATE_KEY,'private_key_required');
  assert.equal(settings({...env,JAAS_PRIVATE_KEY:'filename.key'}),null);
});
test('accepts matching outer quotes and escaped newlines copied from environment examples',()=>{
  const quoted={JAAS_APP_ID:`"${appId}"`,JAAS_KEY_ID:`'${env.JAAS_KEY_ID}'`,JAAS_PRIVATE_KEY:'"'+privatePEM.replace(/\n/g,'\\n')+'"'};
  const config=settings(quoted);assert.equal(config.appId,appId);assert.equal(config.keyId,env.JAAS_KEY_ID);assert.equal(config.privateKey.asymmetricKeyType,'rsa');
});
test('invalid and encrypted private keys fail closed without leaking crypto exceptions',()=>{
  const broken={...env,JAAS_PRIVATE_KEY:'-----BEGIN PRIVATE KEY-----\nSECRET_INVALID_INPUT\n-----END PRIVATE KEY-----'};
  assert.equal(settings(broken),null);assert.equal(configurationChecks(broken).JAAS_PRIVATE_KEY,'unreadable_pem');assert.doesNotMatch(JSON.stringify(configurationChecks(broken)),/SECRET|OpenSSL|decoder/);
  assert.equal(configurationChecks({...env,JAAS_PRIVATE_KEY:'-----BEGIN ENCRYPTED PRIVATE KEY-----\n...'}).JAAS_PRIVATE_KEY,'encrypted_key');
});
test('non-RSA and weak RSA keys cannot enable meetings',()=>{
  const weak=crypto.generateKeyPairSync('rsa',{modulusLength:1024}).privateKey.export({type:'pkcs8',format:'pem'});
  const ec=crypto.generateKeyPairSync('ec',{namedCurve:'prime256v1'}).privateKey.export({type:'pkcs8',format:'pem'});
  assert.equal(configurationChecks({...env,JAAS_PRIVATE_KEY:weak}).JAAS_PRIVATE_KEY,'rsa_key_too_small');assert.equal(settings({...env,JAAS_PRIVATE_KEY:weak}),null);
  assert.equal(configurationChecks({...env,JAAS_PRIVATE_KEY:ec}).JAAS_PRIVATE_KEY,'rsa_key_required');assert.equal(settings({...env,JAAS_PRIVATE_KEY:ec}),null);
});

test('startup log and diagnostic HTTP handler expose status codes only; config response stays compatible',async()=>{
  const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
  const routes=new Map(),logs=[];
  const router={get:(route,fn)=>routes.set(route,fn),post:()=>{}};
  const sandbox={module:{exports:{}},console:{info:(...args)=>logs.push(args.join(' '))},require:name=>{
    if(name==='express')return {Router:()=>router};
    if(name==='axios')return {};
    if(name==='crypto')return crypto;
    if(name==='./supabase')return {getSupabaseHeaders:()=>({})};
    if(name==='./ministry-admin')return {limiter:()=>()=>{},wrap:fn=>fn};
    if(name==='./jaas-settings')return {settings:()=>settings(env),configurationChecks:()=>configurationChecks(env)};
    throw new Error('Unexpected dependency');
  }};
  vm.runInNewContext(fs.readFileSync(path.join(__dirname,'../meeting-provider.js'),'utf8'),sandbox);
  let response;const res={json:value=>{response=JSON.parse(JSON.stringify(value))}};
  await routes.get('/meeting-provider/config')({},res);assert.deepEqual(response,{embedded:true,provider:'jaas'});
  await routes.get('/meeting-provider/diagnostics')({},res);assert.deepEqual(response,{checks:configurationChecks(env)});
  const exposed=JSON.stringify({response,logs});assert.doesNotMatch(exposed,/BEGIN|test-key|0123456789abcdef|privateKey/);assert.match(exposed,/JaaS configuration check/);
});
