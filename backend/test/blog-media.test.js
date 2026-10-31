const { test, before, after } = require("node:test"),
  assert = require("node:assert/strict"),
  crypto = require("node:crypto"),
  sharp = require("sharp"),
  axios = require("axios");
process.env.SUPABASE_URL = "https://media-fixture.supabase.co";
process.env.SUPABASE_SERVICE_ROLE_KEY = "fixture-only";
const originalFetch = global.fetch,
  originalAdapter = axios.defaults.adapter;
const rows = new Map(),
  objects = new Map(),
  requests = [];
let exists = false;
axios.defaults.adapter = async (c) => {
  const body = typeof c.data === "string" ? JSON.parse(c.data) : c.data;
  let data = [];
  if (c.method === "get") {
    const id = c.params.id.slice(3);
    if (rows.has(id)) data = [rows.get(id)];
  } else if (c.method === "post") {
    if (!rows.has(body.id)) rows.set(body.id, body);
    data = [rows.get(body.id)];
  }
  return { data, status: 200, statusText: "OK", config: c, headers: {} };
};
global.fetch = async (url, options = {}) => {
  const u = String(url);
  requests.push({ url: u, ...options });
  if (u.endsWith("/bucket/crh-blog-media"))
    return new Response(
      JSON.stringify(
        exists
          ? { id: "crh-blog-media", public: false }
          : {
              statusCode: "404",
              error: "not_found",
              message: "Bucket not found",
            },
      ),
      {
        status: exists ? 200 : 404,
        headers: { "Content-Type": "application/json" },
      },
    );
  if (u.endsWith("/bucket") && options.method === "POST") {
    exists = true;
    return new Response(JSON.stringify({ name: "crh-blog-media" }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }
  const path = u.split("/object/")[1];
  if (options.method === "POST") {
    if (objects.has(path))
      return new Response(
        JSON.stringify({
          statusCode: "409",
          message: "The resource already exists",
        }),
        { status: 409, headers: { "Content-Type": "application/json" } },
      );
    objects.set(path, Buffer.from(options.body));
    return new Response(JSON.stringify({ Key: path }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }
  const bytes = objects.get(path);
  return new Response(bytes || "not found", {
    status: bytes ? 200 : 404,
    headers: { "Content-Type": "image/webp" },
  });
};
after(() => {
  global.fetch = originalFetch;
  axios.defaults.adapter = originalAdapter;
});
const media = require("../blog-media");
let source;
before(async () => {
  source = await sharp({
    create: { width: 100, height: 60, channels: 3, background: "#123456" },
  })
    .png()
    .toBuffer();
});
test("first upload creates a private WebP-only bucket and stores normalized immutable content", async () => {
  const id = crypto.randomUUID();
  const saved = await media.upload(id, source, crypto.randomUUID());
  assert.equal(saved.id, id);
  const create = requests.find((r) => r.url.endsWith("/bucket"));
  const body = JSON.parse(create.body);
  assert.equal(body.public, false);
  assert.deepEqual(body.allowed_mime_types, ["image/webp"]);
  const upload = requests.find(
    (r) => r.method === "POST" && r.url.includes("/object/"),
  );
  assert.equal(new Headers(upload.headers).get("x-upsert"), "false");
  assert.ok(rows.get(id).sha256);
  const bytes = await media.download(id);
  assert.equal((await sharp(bytes).metadata()).format, "webp");
  const count = requests.length;
  await media.upload(id, source, crypto.randomUUID());
  assert.equal(requests.length, count);
  await assert.rejects(
    media.upload(
      id,
      await sharp({
        create: { width: 2, height: 2, channels: 3, background: "red" },
      })
        .png()
        .toBuffer(),
      crypto.randomUUID(),
    ),
    (e) => e.status === 409,
  );
});
test("an uncertain earlier object upload is recovered by hash without overwriting it", async () => {
  const id = crypto.randomUUID();
  objects.set(`crh-blog-media/${id}.webp`, await media.normalizeImage(source));
  await media.upload(id, source, crypto.randomUUID());
  assert.ok(rows.has(id));
  const different = crypto.randomUUID();
  objects.set(`crh-blog-media/${different}.webp`, Buffer.from("different"));
  await assert.rejects(
    media.upload(different, source, crypto.randomUUID()),
    (e) => e.status === 409,
  );
  assert.equal(rows.has(different), false);
});
