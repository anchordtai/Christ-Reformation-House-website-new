const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
test('sermon schema isolates private media, bounds free storage and preserves originals',async()=>{
 const {PGlite}=await import('@electric-sql/pglite');const db=new PGlite();
 try{
 await db.exec("create role anon;create role authenticated;create role service_role bypassrls;create schema auth;create table auth.users(id uuid primary key,email_confirmed_at timestamptz,raw_app_meta_data jsonb);create schema storage;create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);create table storage.objects(id uuid,name text,bucket_id text,metadata jsonb);grant usage on schema auth,storage to service_role;grant select on auth.users,storage.objects to service_role;");
 await db.exec(fs.readFileSync(path.join(__dirname,'../supabase/migrations/20261122073638_sermon_studio_and_notifications.sql'),'utf8'));
 const owner='11111111-1111-4111-8111-111111111111',sermon='22222222-2222-4222-8222-222222222222',asset='33333333-3333-4333-8333-333333333333';
 await db.query("insert into auth.users values($1,now(),'{\"role\":\"admin\"}');",[owner]);
 await db.query("insert into public.ministry_sermons(id,slug,title,speaker,sermon_date,category) values($1,'isolated-fixture','Fixture','Test','2026-11-22','Sermon')",[sermon]);
 for(const role of ['anon','authenticated']){
  await db.exec('set role '+role);await assert.rejects(db.query('select * from public.ministry_sermons'));await assert.rejects(db.query('select * from public.ministry_sermon_assets'));await assert.rejects(db.query("select public.crh_sermon_reserve($1,$2,$3,'original','en','audio/wav',20,$4,$5)",[asset,sermon,owner,'a'.repeat(64),sermon+'/'+asset]));await db.exec('reset role');
 }
 assert.equal((await db.query("select count(*)::int n from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relname like 'ministry_sermon%' and c.relkind='r' and not c.relrowsecurity")).rows[0].n,0);
 assert.equal((await db.query("select public from storage.buckets where id='crh-sermon-media'")).rows[0].public,false);
 await db.exec('set role service_role');await db.query("select public.crh_sermon_reserve($1,$2,$3,'original','en','audio/wav',20,$4,$5)",[asset,sermon,owner,'a'.repeat(64),sermon+'/'+asset]);await db.exec('reset role');
 await db.query("update public.ministry_sermon_assets set state='ready',verified_at=now() where id=$1",[asset]);
 await assert.rejects(db.query("update public.ministry_sermon_assets set sha256=$1 where id=$2",['b'.repeat(64),asset]));
 await assert.rejects(db.query("update public.ministry_sermons set status='published',original_id=$1 where id=$2",[asset,sermon]));
 await db.query("update public.ministry_sermons set original_id=$1,visibility='public',consent=true,reviewed_at=now(),publish_at=now(),status='published' where id=$2",[asset,sermon]);
 assert.equal((await db.query("select recording_mode,publishing_mode,email_sermons from public.ministry_sermon_settings")).rows[0].email_sermons,false);
 await db.query("insert into storage.objects values(gen_random_uuid(),'budget-fixture','another-bucket','{\"size\":940000000}')");
 await db.query("update public.ministry_sermons set status='draft' where id=$1",[sermon]);await db.exec('set role service_role');
 const extra='44444444-4444-4444-8444-444444444444';await assert.rejects(db.query("select public.crh_sermon_reserve($1,$2,$3,'enhanced','en','audio/wav',20,$4,$5)",[extra,sermon,owner,'c'.repeat(64),sermon+'/'+extra]));await db.exec('reset role');
 }finally{await db.close()}
});
