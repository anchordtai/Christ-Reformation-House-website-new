const { test, before, after, beforeEach } = require("node:test"),
  assert = require("node:assert/strict"),
  crypto = require("node:crypto");
process.env.SUPABASE_URL = "https://example.supabase.co";
process.env.SUPABASE_SERVICE_ROLE_KEY = "test-only";
const wa = require("../communications/whatsapp-core"),
  planner = require("../communications/whatsapp-planner"),
  provider = require("../communications/whatsapp-provider"),
  axios = require("axios"),
  express = require("express");
const { router } = require("../communications/routes");
let server, base, calls, user, result, template, subscription, eventOk;
const original = axios.defaults.adapter,
  id = "11111111-1111-4111-8111-111111111111";
axios.defaults.adapter = async (c) => {
  calls.push(c);
  let data = [];
  if (c.url === "https://challenges.cloudflare.com/turnstile/v0/siteverify")
    data = {
      success: true,
      action: "subscribe",
      hostname: "www.christreformationhouse.org.ng",
    };
  else if (c.url.endsWith("/auth/v1/user")) data = user;
  else if (c.url.endsWith("/rpc/crh_whatsapp_metrics"))
    data = { total: 1, active: 1, submitted: 0, delivered: 0 };
  else if (c.url.endsWith("/rpc/crh_whatsapp_delivery")) data = eventOk;
  else if (c.url.endsWith("/rpc/crh_whatsapp_inbound")) data = true;
  else if (c.url.endsWith("/rpc/crh_whatsapp_preferences")) data = true;
  else if (c.url.endsWith("/communication_whatsapp_templates"))
    data = template ? [template] : [];
  else if (c.url.endsWith("/communication_whatsapp_subscriptions"))
    data = subscription ? [subscription] : [];
  else if (c.url.includes("graph.facebook.com")) data = result;
  return { status: 200, statusText: "OK", headers: {}, config: c, data };
};
before(
  () =>
    new Promise((r) => {
      const app = express();
      app.use(
        express.json({
          verify: (req, res, b) => (req.rawBody = Buffer.from(b)),
        }),
      );
      app.use("/api", router);
      server = app.listen(0, "127.0.0.1", () => {
        base = "http://127.0.0.1:" + server.address().port + "/api";
        r();
      });
    }),
);
after(() => {
  axios.defaults.adapter = original;
  return new Promise((r) => server.close(r));
});
beforeEach(() => {
  calls = [];
  template = null;
  subscription = null;
  eventOk = true;
  result = {};
  user = {
    id,
    email_confirmed_at: "yes",
    app_metadata: { communication_role: "admin" },
  };
  for (const k of Object.keys(process.env).filter(
    (k) => k.startsWith("WHATSAPP_") || k.startsWith("TURNSTILE_"),
  ))
    delete process.env[k];
});
const request = (path, body, headers = {}) =>
  fetch(base + path, {
    method: body === undefined ? "GET" : "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: "Bearer staff",
      ...headers,
    },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
function configure() {
  Object.assign(process.env, {
    WHATSAPP_ACCESS_TOKEN: "fixture-only",
    WHATSAPP_PHONE_NUMBER_ID: "12345678",
    WHATSAPP_BUSINESS_ACCOUNT_ID: "98765432",
    WHATSAPP_APP_SECRET: "s".repeat(32),
    WHATSAPP_VERIFY_TOKEN: "v".repeat(40),
    WHATSAPP_API_VERSION: "v23.0",
    WHATSAPP_BUSINESS_PHONE: "+2348130000000",
    WHATSAPP_MODULE_ENABLED: "true",
  });
}
const signed = (body) => ({
  "x-hub-signature-256":
    "sha256=" +
    crypto
      .createHmac("sha256", process.env.WHATSAPP_APP_SECRET)
      .update(JSON.stringify(body))
      .digest("hex"),
});
const inbound = (text = "STOP", from = "2348130000001") => ({
  object: "whatsapp_business_account",
  entry: [
    {
      id: "98765432",
      changes: [
        {
          field: "messages",
          value: {
            metadata: { phone_number_id: "12345678" },
            messages: [
              {
                id: "wamid.inbound",
                from,
                timestamp: String(Math.floor(Date.now() / 1000)),
                type: "text",
                text: { body: text },
              },
            ],
          },
        },
      ],
    },
  ],
});
test("normalises international phone and requires independent WhatsApp consent/time zone", () => {
  const b = {
    name: "Reader",
    phone: "0813 000 0001",
    countryCode: "+234",
    whatsappConsent: true,
    categories: ["devotional"],
    time: "06:00",
    timezone: "Africa/Lagos",
  };
  assert.equal(wa.subscription(b).phone, "+2348130000001");
  for (const change of [
    { whatsappConsent: false, emailConsent: true },
    { timezone: "Not/AZone" },
    { time: "24:00" },
    { countryCode: "+1", phone: "+2348130000001" },
    { categories: ["donations"] },
    { name: "A\nInjected" },
  ])
    assert.throws(() => wa.subscription({ ...b, ...change }));
  assert.equal(wa.maskPhone("+2348130000001").slice(-4), "0001");
  assert.ok(!wa.maskPhone("+2348130000001").includes("234813"));
});
test("missing official credentials prevents collecting public phone numbers", async () => {
  const r = await request("/communications/whatsapp/subscribe", {
    phone: "08130000001",
  });
  assert.equal(r.status, 503);
  assert.equal(calls.length, 0);
  const c = await (await request("/communications/whatsapp/config")).json();
  assert.equal(c.bulkSending, false);
  assert.equal(c.subscriptionReady, false);
});
test("paid bulk sending cannot be enabled with env flags, staff approval or credits", async () => {
  configure();
  process.env.WHATSAPP_PAID_ENABLED = "true";
  assert.equal(wa.config().bulkSending, false);
  assert.equal(
    (
      await request(
        "/ministry-admin/communications/whatsapp/campaigns/" + id + "/schedule",
        { approved: true, credits: 99999 },
      )
    ).status,
    402,
  );
  await assert.rejects(provider.sendTemplate("+2348130000001", {}, [], id));
  assert.equal(
    calls.filter((c) => c.url.includes("graph.facebook.com")).length,
    0,
  );
});
test("webhooks verify raw-body HMAC before any DB access and reject changed bytes", async () => {
  configure();
  const body = inbound();
  assert.equal(
    (
      await request("/communications/webhooks/whatsapp", body, {
        "x-hub-signature-256": "sha256=" + "0".repeat(64),
      })
    ).status,
    401,
  );
  assert.equal(calls.length, 0);
  assert.equal(
    (await request("/communications/webhooks/whatsapp", body, signed(body)))
      .status,
    200,
  );
  assert.ok(calls.find((c) => c.url.endsWith("/rpc/crh_whatsapp_inbound")));
  assert.equal(
    wa.signature(Buffer.from("{}"), "sha256=" + "0".repeat(64), "s".repeat(32)),
    false,
  );
});
test("valid signature does not permit another Meta business account or number", async () => {
  configure();
  const body = inbound();
  body.entry[0].id = "other";
  assert.equal(
    (await request("/communications/webhooks/whatsapp", body, signed(body)))
      .status,
    403,
  );
  assert.equal(calls.length, 0);
  body.entry[0].id = "98765432";
  body.entry[0].changes[0].value.metadata.phone_number_id = "other";
  assert.equal(
    (await request("/communications/webhooks/whatsapp", body, signed(body)))
      .status,
    403,
  );
});
test("GET challenge requires correct strong verify token", async () => {
  configure();
  const p =
    "/communications/webhooks/whatsapp?hub.mode=subscribe&hub.challenge=12345&hub.verify_token=";
  assert.equal((await request(p + "wrong")).status, 403);
  const r = await request(p + "v".repeat(40));
  assert.equal(r.status, 200);
  assert.equal(await r.text(), "12345");
});
test("JOIN proof is hashed and ordinary inbound chat is not stored", async () => {
  configure();
  let body = inbound("JOIN " + "a".repeat(64));
  assert.equal(
    (await request("/communications/webhooks/whatsapp", body, signed(body)))
      .status,
    200,
  );
  const p = JSON.parse(
    calls.find((c) => c.url.endsWith("/rpc/crh_whatsapp_inbound")).data,
  );
  assert.equal(p.p_hash, wa.sha("a".repeat(64)));
  assert.equal(p.p_phone, "+2348130000001");
  assert.equal(p.p_action, "join");
  calls = [];
  body = inbound("Private prayer request");
  await request("/communications/webhooks/whatsapp", body, signed(body));
  assert.equal(calls.length, 0);
});
test("unknown status references request provider reconciliation, never fabricate delivery", async () => {
  configure();
  eventOk = false;
  const body = inbound();
  const v = body.entry[0].changes[0].value;
  delete v.messages;
  v.statuses = [
    {
      id: "wamid.unknown",
      status: "delivered",
      timestamp: String(Math.floor(Date.now() / 1000)),
    },
  ];
  assert.equal(
    (await request("/communications/webhooks/whatsapp", body, signed(body)))
      .status,
    503,
  );
  const p = JSON.parse(calls[0].data);
  assert.equal(p.p_event, "delivered");
  assert.equal(p.p_provider, "wamid.unknown");
});
test("viewer cannot create templates; user metadata cannot grant permissions", async () => {
  user.app_metadata = { communication_role: "viewer" };
  assert.equal(
    (await request("/ministry-admin/communications/whatsapp/templates", {}))
      .status,
    403,
  );
  user.app_metadata = {};
  user.user_metadata = { communication_role: "admin" };
  assert.equal(
    (await request("/ministry-admin/communications/whatsapp")).status,
    403,
  );
});
test("staff subscriber lists mask numbers and editors cannot read contacts", async () => {
  subscription = {
    id,
    phone: "+2348130000001",
    status: "active",
    categories: ["devotional"],
  };
  let r = await (
    await request("/ministry-admin/communications/whatsapp")
  ).json();
  assert.equal(r.subscribers[0].phone, wa.maskPhone(subscription.phone));
  user.app_metadata = { communication_role: "editor" };
  r = await (await request("/ministry-admin/communications/whatsapp")).json();
  assert.deepEqual(r.subscribers, []);
});
test("template approval is provider truth and only exact bodies/categories reconcile", async () => {
  configure();
  template = {
    id,
    name: "crh_daily",
    language: "en",
    category: "MARKETING",
    body: "CRH {{1}}. Reply STOP.",
    variable_count: 1,
    examples: ["Faith"],
    status: "PENDING",
  };
  result = {
    data: [
      {
        id: "34567",
        name: template.name,
        language: "en",
        category: "MARKETING",
        status: "APPROVED",
        components: [{ type: "BODY", text: template.body }],
      },
    ],
  };
  assert.equal(
    (
      await request(
        "/ministry-admin/communications/whatsapp/templates/sync",
        {},
      )
    ).status,
    200,
  );
  assert.equal(
    JSON.parse(calls.find((c) => c.method === "patch").data).status,
    "APPROVED",
  );
  calls = [];
  result.data[0].components[0].text = "Changed remotely";
  await request("/ministry-admin/communications/whatsapp/templates/sync", {});
  assert.equal(
    JSON.parse(calls.find((c) => c.method === "patch").data).status,
    "NEEDS_REVIEW",
  );
});
test("template limits preserve manuscript instead of silently truncating", () => {
  const t = wa.template({
    name: "crh_daily",
    language: "en",
    category: "MARKETING",
    body: "CRH {{1}}. Reply STOP.",
    examples: ["Faith"],
  });
  assert.equal(t.variable_count, 1);
  assert.throws(() => wa.renderTemplate(t, ["A".repeat(1024)]));
  assert.throws(() => wa.template({ ...t, body: "CRH {{2}} STOP" }));
  assert.throws(() =>
    wa.messagePayload(
      "+2348130000001",
      { ...t, status: "PENDING" },
      ["Faith"],
      id,
    ),
  );
  const p = wa.messagePayload(
    "+2348130000001",
    { ...t, status: "APPROVED" },
    ["Faith"],
    id,
  );
  assert.equal(p.type, "template");
  assert.equal(p.to, "2348130000001");
  assert.equal(p.biz_opaque_callback_data, id);
});
test("cost estimates never treat unknown pricing or credits as free", () => {
  const c = wa.costEstimate({ recipients: ["+2348130000001"] });
  assert.equal(c.estimate, null);
  assert.equal(c.availableCredits, null);
  assert.equal(c.blocked, true);
  const k = wa.costEstimate({
    recipients: ["+2348130000001"],
    rates: [{ prefix: "+234", unitPrice: 0.05 }],
    availableCredits: 0,
  });
  assert.equal(k.estimate, 0.05);
  assert.equal(k.sufficient, false);
  assert.equal(k.blocked, true);
});
test("daily planner respects DST/local times, Lagos date, release/revision and independent consent", () => {
  const now = new Date("2026-11-04T12:00:00Z"),
    reading = {
      publication_date: "2026-11-04",
      status: "published",
      reviewed_by: id,
      reviewed_at: "2026-11-03T12:00:00Z",
      release_at: "2026-11-04T05:00:00Z",
      revision: 7,
      content: {
        title: "Provision",
        mainReference: "Philippians 4:19",
        mainPassage: "Approved scripture",
        message: "Approved manuscript",
        keyLessons: ["Faith"],
        declaration: "Declaration",
        individualPrayers: ["Prayer"],
      },
    };
  const s = {
    id,
    status: "active",
    categories: ["devotional"],
    delivery_time: "06:00",
    timezone: "America/New_York",
  };
  assert.equal(wa.localParts(now, s.timezone).time, "07:00");
  const p = planner.planDaily([s], reading, now);
  assert.equal(p.length, 1);
  assert.equal(p[0].sourceRevision, 7);
  assert.match(p[0].text, /Approved manuscript/);
  assert.match(p[0].text, /Faith declaration/);
  assert.equal(
    planner.planDaily([{ ...s, status: "unsubscribed" }], reading, now).length,
    0,
  );
  assert.equal(
    planner.planDaily([s], { ...reading, status: "draft" }, now).length,
    0,
  );
  assert.equal(
    planner.planDaily([s], { ...reading, publication_date: "2026-11-03" }, now)
      .length,
    0,
  );
  assert.equal(
    wa.dailyDue(
      { ...s, timezone: "Pacific/Honolulu" },
      new Date("2026-11-04T01:00:00Z"),
    ),
    false,
  );
  assert.equal(
    wa.localParts(new Date("2026-07-04T12:00:00Z"), "America/New_York").time,
    "08:00",
  );
});
test("service/event planners require explicit rules, event dates and registration mapping", () => {
  const s = { id, status: "active", categories: ["services", "events"] },
    now = new Date("2026-11-04T12:00:00Z");
  assert.equal(
    planner.planServices(
      [s],
      [
        {
          enabled: true,
          type: "midweek",
          weekday: 3,
          time: "12:00",
          timezone: "Africa/Lagos",
        },
      ],
      now,
    ).length,
    1,
  );
  const event = {
    id,
    revision: 3,
    published: true,
    starts_at: "2026-11-05T10:00:00Z",
  };
  assert.equal(planner.planEvent([s], event, {}, now).length, 1);
  assert.equal(
    planner.planEvent([s], event, { type: "registration" }, now).length,
    0,
  );
  assert.equal(
    planner.planEvent(
      [s],
      event,
      { type: "registration", registrationIds: [id] },
      now,
    ).length,
    1,
  );
  assert.equal(
    planner.planEvent(
      [s],
      { ...event, published: false },
      { type: "cancellation" },
      now,
    ).length,
    0,
  );
  assert.equal(
    planner.planEvent(
      [s],
      { ...event, cancelled: true },
      { type: "cancellation" },
      now,
    ).length,
    1,
  );
});

test("verified public signup stores only pending proof, separate consent and chosen local time", async () => {
  configure();
  process.env.TURNSTILE_SITE_KEY = "fixture";
  process.env.TURNSTILE_SECRET_KEY = "fixture";
  const r = await request("/communications/whatsapp/subscribe", {
    name: "Fixture Reader",
    phone: "08130000001",
    countryCode: "+234",
    whatsappConsent: true,
    categories: ["devotional", "events"],
    time: "07:30",
    timezone: "Europe/London",
    verificationToken: "fixture",
  });
  assert.equal(r.status, 202);
  const data = await r.json();
  assert.match(data.joinUrl, /^https:\/\/wa.me\/2348130000000\?text=JOIN/);
  const write = calls.find(
    (c) =>
      c.url.endsWith("/communication_whatsapp_requests") && c.method === "post",
  );
  assert.ok(write);
  const saved = JSON.parse(write.data);
  assert.equal(saved.phone, "+2348130000001");
  assert.equal(saved.delivery_time, "07:30");
  assert.equal(saved.timezone, "Europe/London");
  assert.equal(saved.link_contact_id, null);
  const proof = new URL(data.joinUrl).searchParams.get("text").slice(5);
  assert.equal(saved.hash, wa.sha(proof));
  assert.ok(!write.data.includes(proof));
  assert.equal(
    calls.some(
      (c) => c.url.endsWith("/communication_contacts") && c.method === "post",
    ),
    false,
  );
  assert.equal(
    calls.some((c) => c.url.includes("/messages")),
    false,
  );
});
test("registration confirmation cannot target an unverified event identity", async () => {
  template = {
    id,
    name: "crh_registration",
    language: "en",
    category: "UTILITY",
    body: "CRH {{1}}. Reply STOP.",
    variable_count: 1,
    status: "APPROVED",
    revision: 1,
  };
  const r = await request("/ministry-admin/communications/whatsapp/campaigns", {
    type: "registration",
    category: "events",
    title: "Confirmation",
    templateId: id,
    eventId: id,
    subscriptionId: id,
    parameters: ["Registration received"],
    plannedAt: new Date(Date.now() + 3600000).toISOString(),
    creationKey: id,
  });
  assert.equal(r.status, 409);
  assert.equal(
    calls.some(
      (c) =>
        c.url.endsWith("/communication_whatsapp_campaigns") &&
        c.method === "post",
    ),
    false,
  );
});
