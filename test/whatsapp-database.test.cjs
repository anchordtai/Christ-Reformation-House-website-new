const { test } = require("node:test"),
  assert = require("node:assert/strict"),
  fs = require("node:fs");
const { PGlite } = require("@electric-sql/pglite");
test("isolated PostgreSQL: ownership, independent consent, identity linking, suppression, replay, delivery ordering, billing lock and RLS", async () => {
  const pg = new PGlite();
  const query = async (sql, params = []) => (await pg.query(sql, params)).rows;
  let count = 0;
  try {
    await pg.exec(
      `create role anon;create role authenticated;create role service_role bypassrls;create schema auth;create table auth.users(id uuid primary key);create table public.ministry_events(id uuid primary key);`,
    );
    await pg.exec(
      fs.readFileSync(
        "supabase/migrations/20261104113426_free_communications_foundation.sql",
        "utf8",
      ),
    );
    await pg.exec(
      fs.readFileSync(
        "supabase/migrations/20261104143145_whatsapp_communications.sql",
        "utf8",
      ),
    );
    const owner = "11111111-1111-4111-8111-111111111111";
    await query("insert into auth.users values($1)", [owner]);
    async function request(char, phone = "+2348130000001", link = null) {
      count++;
      await query(
        `insert into communication_whatsapp_requests(hash,manage_hash,phone,name,categories,delivery_time,timezone,link_contact_id) values($1,$2,$3,'Fixture',array['devotional','events'],'06:00','Africa/Lagos',$4)`,
        [char.repeat(64), String(count).padStart(64, "0"), phone, link],
      );
      return String(count).padStart(64, "0");
    }
    const inbound = (key, phone, action, hash = "") =>
      query("select crh_whatsapp_inbound($1,$2,$3,$4,now()) as ok", [
        key,
        phone,
        action,
        hash,
      ]);
    const manage = await request("a");
    assert.equal(
      (
        await inbound("wrong-owner", "+2348130000002", "join", "a".repeat(64))
      )[0].ok,
      false,
    );
    assert.equal(
      (await inbound("first-join", "+2348130000001", "join", "a".repeat(64)))[0]
        .ok,
      true,
    );
    let [s] = await query("select * from communication_whatsapp_subscriptions");
    assert.equal(s.status, "active");
    assert.deepEqual(s.categories, ["devotional", "events"]);
    const [contact] = await query(
      "select * from communication_contacts where id=$1",
      [s.contact_id],
    );
    assert.equal(contact.email, null);
    assert.equal(contact.status, "pending");
    assert.equal(contact.sms_consent, false);
    assert.deepEqual(contact.categories, []);
    await inbound("first-join", "+2348130000001", "join", "a".repeat(64));
    assert.equal(
      (
        await query(
          "select count(*)::int n from communication_whatsapp_consents",
        )
      )[0].n,
      1,
    );
    await inbound("replay", "+2348130000001", "join", "a".repeat(64));
    assert.equal(
      (
        await query(
          "select count(*)::int n from communication_whatsapp_subscriptions",
        )
      )[0].n,
      1,
    );
    const [email] = await query(
      `insert into communication_contacts(email,name,status,categories,confirmed_at) values('fixture@example.test','Email owner','active',array['newsletter'],now()) returning id`,
    );
    const manage2 = await request("b", "+2348130000002", email.id);
    await inbound("linked-join", "+2348130000002", "join", "b".repeat(64));
    const [linked] = await query(
      "select * from communication_whatsapp_subscriptions where phone=$1",
      ["+2348130000002"],
    );
    assert.equal(linked.contact_id, email.id);
    assert.equal(
      (await query("select count(*)::int n from communication_contacts"))[0].n,
      2,
    ); // one WhatsApp-only, one linked dual-channel contact
    const [t] = await query(
      `insert into communication_whatsapp_templates(name,language,category,body,variable_count,created_by) values('crh_fixture','en','MARKETING','CRH fixture STOP',0,$1) returning id`,
      [owner],
    );
    const [c] = await query(
      `insert into communication_whatsapp_campaigns(creation_key,title,type,category,template_id,template_revision,parameters,text,planned_at,created_by) values(gen_random_uuid(),'Fixture','devotional','devotional',$1,1,'[]','CRH fixture STOP',now(),$2) returning id`,
      [t.id, owner],
    );
    await assert.rejects(
      query(
        `update communication_whatsapp_campaigns set status='scheduled',approved_by=$1,approved_at=now() where id=$2`,
        [owner, c.id],
      ),
      /check constraint/,
    );
    const [j] = await query(
      `insert into communication_whatsapp_jobs(campaign_id,subscription_id,provider_id) values($1,$2,'wamid.fixture') returning id`,
      [c.id, s.id],
    );
    await assert.rejects(
      query(
        `insert into communication_whatsapp_jobs(campaign_id,subscription_id) values($1,$2)`,
        [c.id, s.id],
      ),
      /unique constraint/,
    );
    await request("c");
    await inbound("stop", "+2348130000001", "stop");
    assert.equal(
      (
        await query(
          "select status from communication_whatsapp_jobs where id=$1",
          [j.id],
        )
      )[0].status,
      "cancelled",
    );
    assert.equal(
      (
        await inbound("delayed-join", "+2348130000001", "join", "c".repeat(64))
      )[0].ok,
      false,
    );
    assert.equal(
      (
        await query(
          "select crh_whatsapp_preferences($1,array['events'],'07:00','Africa/Lagos',false) ok",
          [manage],
        )
      )[0].ok,
      false,
    );
    await query(
      "select crh_whatsapp_preferences($1,array[]::text[],'06:00','Africa/Lagos',true)",
      [manage2],
    );
    assert.equal(
      (
        await query("select status from communication_contacts where id=$1", [
          email.id,
        ])
      )[0].status,
      "active",
    );
    assert.deepEqual(
      (
        await query(
          "select categories from communication_contacts where id=$1",
          [email.id],
        )
      )[0].categories,
      ["newsletter"],
    );
    const event = (key, status, at) =>
      query(
        `select crh_whatsapp_delivery($1,'wamid.fixture',$2,$3,null,null) ok`,
        [key, status, at],
      );
    await event("read", "read", "2026-11-04T12:00:02Z");
    await event("sent", "sent", "2026-11-04T12:00:00Z");
    await event("delivered", "delivered", "2026-11-04T12:00:01Z");
    await event("read", "read", "2026-11-04T12:00:02Z");
    assert.equal(
      (
        await query(
          "select status from communication_whatsapp_jobs where id=$1",
          [j.id],
        )
      )[0].status,
      "read",
    );
    assert.equal(
      (
        await query(
          "select count(*)::int n from communication_whatsapp_events where provider_id='wamid.fixture'",
        )
      )[0].n,
      3,
    );
    const [metrics] = await query("select crh_whatsapp_metrics() m");
    assert.equal(metrics.m.submitted, 1);
    assert.equal(metrics.m.delivered, 1);
    assert.equal(metrics.m.read, 1);
    assert.equal(metrics.m.actualCost, null);
    await request("d");
    await query(
      "update communication_whatsapp_subscriptions set status='suppressed' where id=$1",
      [s.id],
    );
    await inbound("suppressed-stop", "+2348130000001", "stop");
    assert.equal(
      (
        await query(
          "select status from communication_whatsapp_subscriptions where id=$1",
          [s.id],
        )
      )[0].status,
      "suppressed",
    );
    await request("e");
    assert.equal(
      (
        await inbound(
          "suppressed-join",
          "+2348130000001",
          "join",
          "e".repeat(64),
        )
      )[0].ok,
      false,
    );
    assert.equal(
      (
        await query(
          `select has_table_privilege('anon','communication_whatsapp_subscriptions','select') allowed`,
        )
      )[0].allowed,
      false,
    );
    assert.equal(
      (
        await query(
          `select has_function_privilege('authenticated','crh_whatsapp_metrics()','execute') allowed`,
        )
      )[0].allowed,
      false,
    );
    assert.equal(
      (
        await query(
          `select count(*)::int n from pg_tables where schemaname='public' and tablename like 'communication_whatsapp_%' and not rowsecurity`,
        )
      )[0].n,
      0,
    );
  } finally {
    await pg.close();
  }
});
