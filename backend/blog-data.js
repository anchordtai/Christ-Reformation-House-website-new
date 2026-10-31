const axios = require("axios");
const { getSupabaseHeaders, getSupabaseRestUrl } = require("./supabase");
const { fail } = require("./ministry-admin");
const uuid = (v) =>
  typeof v === "string" &&
  /^[\da-f]{8}-[\da-f]{4}-4[\da-f]{3}-[89ab][\da-f]{3}-[\da-f]{12}$/i.test(v);
const slug = (v) =>
  typeof v === "string" &&
  v.length <= 120 &&
  /^[a-z0-9]+(-[a-z0-9]+)*$/.test(v);
const publicFields =
  "id,slug,title,excerpt,author,category,tags,cover_id,cover_alt,publish_at";
const released = () => ({
  status: "in.(published,scheduled)",
  reviewed_at: "not.is.null",
  publish_at: `lte.${new Date().toISOString()}`,
});
async function db(
  table,
  method = "get",
  params = {},
  data,
  prefer = "return=representation",
) {
  try {
    return (
      await axios({
        url: getSupabaseRestUrl(table),
        method,
        params,
        data,
        headers: { ...getSupabaseHeaders(), Prefer: prefer },
        timeout: 12000,
      })
    ).data;
  } catch (e) {
    if (e.response?.data?.code === "P0002")
      throw fail(404, "Article not found.");
    if (e.response?.data?.code === "23505")
      throw fail(
        409,
        "This reference is already in use. Reload before saving.",
      );
    throw e;
  }
}
function text(v, max, label, min = 1) {
  if (
    typeof v !== "string" ||
    v.trim().length < min ||
    v.length > max ||
    /[\x00-\x08\x0b\x0c\x0e-\x1f]/.test(v)
  )
    throw fail(400, `Check ${label}.`);
  return v.trim();
}
function validatePost(b, actor, now = Date.now()) {
  if (
    !uuid(b.id) ||
    !slug(b.slug) ||
    !Number.isInteger(b.revision) ||
    b.revision < 0
  )
    throw fail(400, "Invalid article reference, slug or revision.");
  if (!["draft", "scheduled", "published"].includes(b.status))
    throw fail(400, "Invalid publication status.");
  const p = {
    id: b.id,
    slug: b.slug,
    title: text(b.title, 160, "title"),
    excerpt: text(b.excerpt, 500, "excerpt", 0),
    body: text(b.body, 40000, "article"),
    author: text(b.author, 100, "author"),
    category: text(b.category, 60, "category"),
    cover_id: b.cover_id || null,
    cover_alt: text(b.cover_alt || "", 250, "image description", 0),
    status: b.status,
    updated_by: actor,
    updated_at: new Date(now).toISOString(),
    revision: b.revision + 1,
  };
  if (p.cover_id && !uuid(p.cover_id)) throw fail(400, "Upload a valid image.");
  if (!Array.isArray(b.tags) || b.tags.length > 8)
    throw fail(400, "Use at most 8 tags.");
  p.tags = [...new Set(b.tags.map((v) => text(v, 40, "tags")))];
  p.publish_at = b.publish_at ? new Date(b.publish_at).toISOString() : null;
  p.reviewed_at = null;
  if (p.status !== "draft") {
    if (b.reviewed !== true || !p.cover_id || !p.cover_alt)
      throw fail(
        400,
        "Review the article and supply an image with its description before release.",
      );
    if (!Number.isFinite(Date.parse(b.publish_at)))
      throw fail(400, "Choose a publication date.");
    if (p.status === "scheduled" && Date.parse(p.publish_at) <= now)
      throw fail(400, "Schedule a future date in Lagos time.");
    if (p.status === "published" && Date.parse(p.publish_at) > now)
      throw fail(400, "Use Scheduled for a future release.");
    p.reviewed_at = new Date(now).toISOString();
  }
  return p;
}
const escapeHtml = (v) =>
  String(v || "").replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ],
  );
module.exports = {
  db,
  uuid,
  slug,
  text,
  released,
  publicFields,
  validatePost,
  escapeHtml,
};
