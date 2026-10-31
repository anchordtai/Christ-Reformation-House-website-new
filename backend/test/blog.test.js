const { test, before, after, beforeEach } = require("node:test"),
  assert = require("node:assert/strict"),
  crypto = require("node:crypto");
process.env.SUPABASE_URL = "https://example.supabase.co";
process.env.SUPABASE_SERVICE_ROLE_KEY = "test-only";
const axios = require("axios"),
  express = require("express"),
  sharp = require("sharp");
const { validatePost } = require("../blog-data"),
  { normalizeImage } = require("../blog-media");
const ai = require("../blog-ai");
const id = crypto.randomUUID(),
  media = crypto.randomUUID(),
  now = Date.parse("2026-10-31T12:00:00Z");
const input = {
  id,
  slug: "test-article",
  revision: 0,
  title: "Article",
  excerpt: "A summary",
  body: "First paragraph.\n\nSecond paragraph.",
  author: "Test Editor",
  category: "Teaching",
  tags: ["Prayer"],
  cover_id: media,
  cover_alt: "Test cover",
  status: "scheduled",
  publish_at: "2026-11-01T07:00:00Z",
  reviewed: true,
};
let server,
  base,
  requests,
  user,
  post,
  stale,
  bot = true,
  aiClaim = true;
const original = axios.defaults.adapter;
axios.defaults.adapter = async (c) => {
  requests.push(c);
  const b = typeof c.data === "string" ? JSON.parse(c.data) : c.data;
  let data = [];
  if (c.url.endsWith("/auth/v1/user")) data = user;
  else if (c.url.includes("siteverify"))
    data = {
      success: bot,
      action: b.response === "comment-token" ? "blog_comment" : "blog_like",
      hostname: "www.christreformationhouse.org.ng",
    };
  else if (c.url.endsWith("/ministry_blog_posts")) {
    if (c.method === "get") data = post ? [post] : [];
    else if (stale) data = [];
    else data = [{ ...b }];
  } else if (c.url.includes("rpc/crh_blog_counts")) data = 5;
  else if (c.url.includes("rpc/crh_blog_ai_claim")) data = aiClaim;
  else if (c.url.includes(":generateContent"))
    data = {
      candidates: [
        {
          finishReason: "STOP",
          content: {
            parts: [
              {
                text: JSON.stringify({
                  title: "AI suggestion",
                  excerpt: "Summary",
                  body: "Suggested draft",
                  tags: ["Faith"],
                }),
              },
            ],
          },
        },
      ],
    };
  else if (c.url.includes("rpc/crh_blog_interact")) data = { saved: true };
  return { data, status: 200, statusText: "OK", config: c, headers: {} };
};
before(
  () =>
    new Promise((resolve) => {
      const app = express();
      app.use(express.json());
      app.use("/api", require("../blog").router);
      server = app.listen(0, "127.0.0.1", () => {
        base = `http://127.0.0.1:${server.address().port}/api`;
        resolve();
      });
    }),
);
after(() => {
  axios.defaults.adapter = original;
  return new Promise((r) => server.close(r));
});
beforeEach(() => {
  requests = [];
  post = { ...input, revision: 1, publish_at: "2026-01-01T00:00:00Z" };
  stale = false;
  user = {
    id: crypto.randomUUID(),
    email_confirmed_at: "yes",
    app_metadata: { devotional_editor: true },
  };
  process.env.TURNSTILE_SITE_KEY = "test";
  process.env.TURNSTILE_SECRET_KEY = "test";
  delete process.env.BLOG_AI_ENABLED;
  delete process.env.GEMINI_API_KEY;
  delete process.env.BLOG_AI_MODEL;
  bot = true;
  aiClaim = true;
});
const req = (path, body, token) =>
  fetch(base + path, {
    method: body === undefined ? "GET" : "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: "Bearer " + token } : {}),
    },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
test("publication requires human review, still image, valid schedule and bounded fields", () => {
  assert.equal(validatePost(input, "staff", now).status, "scheduled");
  for (const b of [
    { reviewed: false },
    { cover_id: null },
    { cover_alt: "" },
    { publish_at: "2020-01-01" },
    { title: "x".repeat(161) },
    { tags: Array(9).fill("x") },
    { status: "published" },
  ])
    assert.throws(() => validatePost({ ...input, ...b }, "staff", now));
  const draft = validatePost(
    { ...input, status: "draft", reviewed: false, cover_id: null },
    "staff",
    now,
  );
  assert.equal(draft.reviewed_at, null);
});
test("public reads, images and social metadata all check reviewed release time", async () => {
  for (const path of [
    "/blog",
    "/blog/test-article",
    "/blog/images/" + media,
    "/blog/share/test-article",
  ]) {
    post = null;
    const r = await req(path);
    assert.equal(r.status, path === "/blog" ? 200 : 404);
    const query = requests.findLast((c) =>
      c.url.endsWith("/ministry_blog_posts"),
    ).params;
    assert.equal(query.status, "in.(published,scheduled)");
    assert.equal(query.reviewed_at, "not.is.null");
    assert.match(query.publish_at, /^lte\./);
  }
});
test("search uses parameterized PostgREST full-text filters and bounded pagination", async () => {
  await req("/blog?q=faith%20prayer&page=2");
  const p = requests.at(-1).params;
  assert.equal(p.search, "wfts(english).faith prayer");
  assert.equal(p.offset, 24);
  assert.equal(p.limit, 13);
  assert.equal((await req("/blog?page=-1")).status, 400);
  assert.equal((await req("/blog?q=" + "a".repeat(101))).status, 400);
});
test("social HTML escapes article content and exposes only canonical released metadata", async () => {
  post = {
    ...post,
    title: "<script>bad</script>",
    body: "<img src=x onerror=alert(1)>",
  };
  const r = await req("/blog/share/test-article");
  const html = await r.text();
  assert.equal(r.headers.get("cache-control"), "no-store");
  assert.match(html, /&lt;script&gt;/);
  assert.doesNotMatch(html, /<script>|<img src=x/);
  assert.match(html, /og:image/);
  assert.match(html, /www.christreformationhouse.org.ng\/blog\/test-article/);
});
test("editor routes reject unsigned users and editable metadata roles, including binary uploads", async () => {
  for (const path of [
    "/ministry-admin/blog",
    "/ministry-admin/blog/images",
    "/ministry-admin/blog/comments",
    "/ministry-admin/blog/ai",
  ])
    assert.equal(
      (
        await req(
          path,
          path.endsWith("images") || path.endsWith("ai") ? {} : undefined,
        )
      ).status,
      401,
    );
  assert.equal(requests.length, 0);
  user.app_metadata = {};
  user.user_metadata = { role: "admin" };
  assert.equal(
    (await req("/ministry-admin/blog", undefined, "fake")).status,
    403,
  );
  assert.equal(
    requests.some((c) => c.url.includes("/rest/")),
    false,
  );
});
test("revisions and immutable links prevent overwriting another editor", async () => {
  assert.equal(
    (await req("/ministry-admin/blog", { ...input, revision: 0 }, "staff"))
      .status,
    409,
  );
  assert.equal(
    (
      await req(
        "/ministry-admin/blog",
        { ...input, slug: "different", revision: 1 },
        "staff",
      )
    ).status,
    409,
  );
  stale = true;
  assert.equal(
    (
      await req(
        "/ministry-admin/blog",
        { ...input, status: "draft", revision: 1 },
        "staff",
      )
    ).status,
    409,
  );
  assert.equal(
    requests.find((c) => c.method === "patch").params.revision,
    "eq.1",
  );
});
test("draft save never retains release approval; scheduling persists a reviewed timestamp", async () => {
  post = null;
  let r = await req(
    "/ministry-admin/blog",
    { ...input, status: "draft" },
    "staff",
  );
  assert.equal(r.status, 200);
  assert.equal((await r.json()).post.reviewed_at, null);
  r = await req(
    "/ministry-admin/blog",
    { ...input, publish_at: "2099-01-01T00:00:00Z" },
    "staff",
  );
  assert.equal(r.status, 200);
  assert.ok((await r.json()).post.reviewed_at);
});
test("likes require bot action verification and store a domain-separated hash", async () => {
  const b = { visitor: "a".repeat(64), liked: true };
  assert.equal((await req("/blog/" + id + "/like", b)).status, 400);
  assert.equal(requests.length, 0);
  assert.equal(
    (
      await req("/blog/" + id + "/like", {
        ...b,
        verificationToken: "comment-token",
      })
    ).status,
    400,
  );
  assert.equal(
    (
      await req("/blog/" + id + "/like", {
        ...b,
        verificationToken: "like-token",
      })
    ).status,
    200,
  );
  const rpc = requests.find((c) => c.url.includes("crh_blog_interact")),
    data = JSON.parse(rpc.data);
  assert.notEqual(data.p_visitor, b.visitor);
  assert.equal(data.p_like, true);
  assert.equal(
    requests.filter((c) => c.url.includes("crh_blog_interact")).length,
    1,
  );
});
test("comments enforce consent and honeypot; only approved rows are public", async () => {
  const b = {
    id: crypto.randomUUID(),
    visitor: "b".repeat(64),
    alias: "Reader",
    body: "A comment",
    verificationToken: "comment-token",
    consent: true,
  };
  assert.equal(
    (await req("/blog/" + id + "/comments", { ...b, consent: false })).status,
    400,
  );
  assert.equal(
    (await req("/blog/" + id + "/comments", { ...b, website: "spam" })).status,
    400,
  );
  assert.equal((await req("/blog/" + id + "/comments", b)).status, 202);
  await req("/blog/" + id + "/community");
  assert.equal(
    requests.find((c) => c.url.endsWith("/ministry_blog_comments")).params
      .status,
    "eq.approved",
  );
});
test("moderation compares expected status and records the staff actor", async () => {
  const cid = crypto.randomUUID();
  assert.equal(
    (
      await req(
        "/ministry-admin/blog/comments/" + cid,
        { status: "approved", expected: "pending" },
        "staff",
      )
    ).status,
    409,
  );
  const r = requests.find((c) => c.method === "patch");
  assert.equal(r.params.status, "eq.pending");
  assert.equal(JSON.parse(r.data).moderated_by, user.id);
});
test("image validation decodes bytes, strips metadata, resizes and rejects SVG/corruption", async () => {
  for (const bytes of [
    Buffer.from("<svg></svg>"),
    Buffer.from("fake jpg"),
    Buffer.alloc(5242881),
  ])
    await assert.rejects(normalizeImage(bytes));
  const original = await sharp({
    create: { width: 2000, height: 1000, channels: 3, background: "#234f41" },
  })
    .jpeg()
    .withMetadata({ exif: { IFD0: { Artist: "Private author" } } })
    .toBuffer();
  const result = await normalizeImage(original),
    meta = await sharp(result).metadata();
  assert.equal(meta.format, "webp");
  assert.equal(meta.width, 1600);
  assert.equal(meta.height, 800);
  assert.equal(meta.exif, undefined);
});
test("AI is off without complete config and validates consent before quota or provider calls", async () => {
  await assert.rejects(
    ai.assist({ action: "draft", input: "brief", consent: true }, user.id),
    (e) => e.status === 503,
  );
  assert.equal(requests.length, 0);
  process.env.BLOG_AI_ENABLED = "true";
  process.env.GEMINI_API_KEY = "test-provider-key";
  process.env.BLOG_AI_MODEL = "gemini-test";
  await assert.rejects(
    ai.assist({ action: "draft", input: "brief" }, user.id),
    (e) => e.status === 400,
  );
  assert.equal(requests.length, 0);
  aiClaim = false;
  await assert.rejects(
    ai.assist({ action: "draft", input: "brief", consent: true }, user.id),
    (e) => e.status === 429,
  );
  assert.equal(
    requests.some((c) => c.url.includes(":generateContent")),
    false,
  );
});
test("AI sends only provided editorial text to a fixed provider and returns unsaved suggestions", async () => {
  process.env.BLOG_AI_ENABLED = "true";
  process.env.GEMINI_API_KEY = "test-provider-key";
  process.env.BLOG_AI_MODEL = "gemini-test";
  const suggestion = await ai.assist(
    { action: "draft", input: "Public brief", consent: true },
    user.id,
  );
  assert.equal(suggestion.title, "AI suggestion");
  const provider = requests.find((c) => c.url.includes(":generateContent"));
  assert.equal(
    provider.url,
    "https://generativelanguage.googleapis.com/v1beta/models/gemini-test:generateContent",
  );
  assert.equal(provider.headers["x-goog-api-key"], "test-provider-key");
  assert.equal(
    requests.some((c) => c.url.endsWith("/ministry_blog_posts")),
    false,
  );
});
