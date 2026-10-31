const express = require("express"),
  crypto = require("crypto");
const {
  fail,
  wrap,
  limiter,
  ministryUser,
  bearer,
  isEventEditor,
} = require("./ministry-admin");
const {
  db,
  uuid,
  slug,
  text,
  released,
  publicFields,
  validatePost,
  escapeHtml: e,
} = require("./blog-data");
const router = express.Router(),
  readLimit = limiter(240),
  writeLimit = limiter(20),
  staffWrite = limiter(80),
  uploadLimit = limiter(15, 3600000);
const ORIGIN = "https://www.christreformationhouse.org.ng",
  API = "https://christ-reformation-house-website-new-1.onrender.com/api";
const staff = (fn) =>
  wrap(async (req, res) => {
    const u = await ministryUser(bearer(req));
    if (!isEventEditor(u))
      throw fail(403, "A ministry editor account is required.");
    req.ministryActor = u.id;
    await fn(req, res, u);
  });
function page(req, size = 12) {
  const n = Number(req.query.page || 0);
  if (!Number.isInteger(n) || n < 0 || n > 1000)
    throw fail(400, "Invalid page.");
  return { limit: size + 1, offset: n * size };
}
async function post(where, full = false) {
  return (
    await db("ministry_blog_posts", "get", {
      ...released(),
      ...where,
      select: publicFields + (full ? ",body" : ""),
      limit: 1,
    })
  )[0];
}
function visitor(req) {
  const v = req.body?.visitor;
  if (!/^[a-f0-9]{64}$/.test(v || ""))
    throw fail(400, "Enable browser storage to interact with this article.");
  return crypto
    .createHash("sha256")
    .update("crh-blog:" + v)
    .digest("hex");
}
router.get(
  "/blog",
  wrap(async (req, res) => {
    readLimit(req);
    const q = String(req.query.q || "").trim(),
      category = String(req.query.category || "").trim();
    if (q.length > 100 || category.length > 60)
      throw fail(400, "Shorten your search.");
    const rows = await db("ministry_blog_posts", "get", {
      ...released(),
      select: publicFields,
      order: "publish_at.desc,id.desc",
      ...page(req),
      ...(q ? { search: `wfts(english).${q}` } : {}),
      ...(category ? { category: `eq.${category}` } : {}),
    });
    res.json({ posts: rows.slice(0, 12), has_more: rows.length > 12 });
  }),
);
router.get(
  "/blog/images/:id",
  wrap(async (req, res) => {
    readLimit(req);
    if (
      !uuid(req.params.id) ||
      !(await post({ cover_id: `eq.${req.params.id}` }))
    )
      throw fail(404, "Image not found.");
    res
      .type("image/webp")
      .set("Cache-Control", "public,max-age=300")
      .send(await require("./blog-media").download(req.params.id));
  }),
);
router.get(
  "/blog/share/:slug",
  wrap(async (req, res) => {
    readLimit(req);
    if (!slug(req.params.slug)) throw fail(404, "Article not found.");
    const p = await post({ slug: `eq.${req.params.slug}` }, true);
    if (!p) throw fail(404, "Article not found.");
    const url = `${ORIGIN}/blog/${p.slug}`,
      image = `${API}/blog/images/${p.cover_id}`;
    res.type("html").send(
      `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${e(p.title)} | Christ's Reformation House</title><meta name="description" content="${e(p.excerpt)}"><link rel="canonical" href="${url}"><meta property="og:type" content="article"><meta property="og:title" content="${e(p.title)}"><meta property="og:description" content="${e(p.excerpt)}"><meta property="og:url" content="${url}"><meta property="og:image" content="${image}"><meta property="og:image:alt" content="${e(p.cover_alt)}"><meta name="twitter:card" content="summary_large_image"></head><body><main><h1>${e(p.title)}</h1><p>${e(p.author)}</p><img src="${image}" alt="${e(p.cover_alt)}" width="800"><p>${e(p.excerpt)}</p>${p.body
        .split(/\n\s*\n/)
        .map((v) => `<p>${e(v)}</p>`)
        .join(
          "",
        )}<a href="${url}">Read and join the conversation</a></main></body></html>`,
    );
  }),
);
router.get(
  "/blog/:slug",
  wrap(async (req, res) => {
    readLimit(req);
    if (!slug(req.params.slug)) throw fail(404, "Article not found.");
    const p = await post({ slug: `eq.${req.params.slug}` }, true);
    if (!p) throw fail(404, "Article not found.");
    res.json({ post: p });
  }),
);
router.get(
  "/blog/:id/community",
  wrap(async (req, res) => {
    readLimit(req);
    if (!uuid(req.params.id) || !(await post({ id: `eq.${req.params.id}` })))
      throw fail(404, "Article not found.");
    const likes = await db(
      "rpc/crh_blog_counts",
      "post",
      {},
      { p_post: req.params.id },
    );
    const comments = await db("ministry_blog_comments", "get", {
      post_id: `eq.${req.params.id}`,
      status: "eq.approved",
      select: "id,alias,body,created_at",
      order: "created_at.desc,id.desc",
      ...page(req, 20),
    });
    res.json({
      likes: Number(likes) || 0,
      comments: comments.slice(0, 20),
      has_more: comments.length > 20,
    });
  }),
);
router.post(
  "/blog/:id/like",
  wrap(async (req, res) => {
    writeLimit(req);
    if (!uuid(req.params.id) || typeof req.body?.liked !== "boolean")
      throw fail(400, "Invalid like.");
    const hash = visitor(req);
    await require("./site-security").verifyBot(req, "blog_like");
    await db(
      "rpc/crh_blog_interact",
      "post",
      {},
      { p_post: req.params.id, p_visitor: hash, p_like: req.body.liked },
    );
    res.json({ saved: true });
  }),
);
router.post(
  "/blog/:id/comments",
  wrap(async (req, res) => {
    writeLimit(req);
    if (
      !uuid(req.params.id) ||
      !uuid(req.body?.id) ||
      req.body?.consent !== true
    )
      throw fail(400, "Confirm that your comment may be published.");
    if (req.body.website) throw fail(400, "Comment could not be accepted.");
    const hash = visitor(req),
      alias = text(req.body.alias, 60, "display name"),
      body = text(req.body.body, 2000, "comment");
    await require("./site-security").verifyBot(req, "blog_comment");
    await db(
      "rpc/crh_blog_interact",
      "post",
      {},
      {
        p_post: req.params.id,
        p_visitor: hash,
        p_comment: req.body.id,
        p_alias: alias,
        p_body: body,
      },
    );
    res.status(202).json({ message: "Your comment is awaiting staff review." });
  }),
);
router.get(
  "/ministry-admin/blog",
  staff(async (req, res) => {
    res.json({
      posts: await db("ministry_blog_posts", "get", {
        select: "*",
        order: "updated_at.desc,id.desc",
        ...page(req, 30),
      }),
      ai_ready: require("./blog-ai").configured(),
    });
  }),
);
router.post(
  "/ministry-admin/blog",
  staff(async (req, res, u) => {
    staffWrite(req);
    let p;
    try {
      p = validatePost(req.body || {}, u.id);
    } catch (err) {
      if (err instanceof RangeError)
        throw fail(400, "Choose a valid publication date.");
      throw err;
    }
    const existing = (
      await db("ministry_blog_posts", "get", { id: `eq.${p.id}`, limit: 1 })
    )[0];
    if (existing && existing.slug !== p.slug)
      throw fail(409, "The article link cannot change after its first save.");
    if (existing && existing.revision !== req.body.revision)
      throw fail(
        409,
        "This article changed in another session. Reload before saving.",
      );
    if (!existing && req.body.revision !== 0)
      throw fail(409, "Article no longer available.");
    const rows = existing
      ? await db(
          "ministry_blog_posts",
          "patch",
          { id: `eq.${p.id}`, revision: `eq.${req.body.revision}` },
          p,
        )
      : await db("ministry_blog_posts", "post", {}, p);
    if (!rows[0])
      throw fail(
        409,
        "This article changed in another session. Reload before saving.",
      );
    res.json({ post: rows[0] });
  }),
);
// Authenticate before buffering images. Limit parallel transforms on the free service.
let uploading = false;
router.post(
  "/ministry-admin/blog/images",
  staff(async (req, res) => {
    uploadLimit(req);
    if (uploading)
      throw fail(429, "Another image is processing. Please retry.");
    uploading = true;
    try {
      await new Promise((resolve, reject) =>
        express.raw({
          type: ["image/jpeg", "image/png", "image/webp"],
          limit: "5mb",
        })(req, res, (err) =>
          err
            ? reject(
                fail(
                  err.status === 413 ? 413 : 400,
                  "Choose an image up to 5 MB.",
                ),
              )
            : resolve(),
        ),
      );
      res
        .status(201)
        .json(
          await require("./blog-media").upload(
            req.query.id,
            req.body,
            req.ministryActor,
          ),
        );
    } finally {
      uploading = false;
    }
  }),
);
router.get(
  "/ministry-admin/blog/images/:id",
  staff(async (req, res) => {
    res
      .type("image/webp")
      .send(await require("./blog-media").download(req.params.id));
  }),
);
router.get(
  "/ministry-admin/blog/comments",
  staff(async (req, res) => {
    const status = req.query.status || "pending";
    if (!["pending", "approved", "rejected"].includes(status))
      throw fail(400, "Invalid moderation filter.");
    res.json({
      comments: await db("ministry_blog_comments", "get", {
        status: `eq.${status}`,
        select: "id,post_id,alias,body,status,created_at",
        order: "created_at.desc,id.desc",
        ...page(req, 30),
      }),
    });
  }),
);
router.post(
  "/ministry-admin/blog/comments/:id",
  staff(async (req, res, u) => {
    staffWrite(req);
    const b = req.body || {};
    if (
      !uuid(req.params.id) ||
      !["pending", "approved", "rejected"].includes(b.status) ||
      !["pending", "approved", "rejected"].includes(b.expected)
    )
      throw fail(400, "Invalid moderation action.");
    const rows = await db(
      "ministry_blog_comments",
      "patch",
      { id: `eq.${req.params.id}`, status: `eq.${b.expected}` },
      {
        status: b.status,
        moderated_by: u.id,
        moderated_at: new Date().toISOString(),
      },
    );
    if (!rows[0]) throw fail(409, "Comment changed. Reload the queue.");
    res.json({ saved: true });
  }),
);
router.post(
  "/ministry-admin/blog/ai",
  staff(async (req, res, u) => {
    staffWrite(req);
    res.json({
      suggestion: await require("./blog-ai").assist(req.body || {}, u.id),
    });
  }),
);
module.exports = { router };
