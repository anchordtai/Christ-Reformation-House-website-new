const sharp = require("sharp"),
  crypto = require("crypto");
const { createClient } = require("@supabase/supabase-js");
const { db, uuid } = require("./blog-data");
const { fail } = require("./ministry-admin");
const BUCKET = "crh-blog-media";
let storage,
  bucketReady = false;
function client() {
  if (!storage)
    storage = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY,
      { auth: { persistSession: false, autoRefreshToken: false } },
    ).storage;
  return storage;
}
async function bucket() {
  if (bucketReady) return;
  const s = client(),
    r = await s.getBucket(BUCKET);
  if (r.error) {
    if (
      String(r.error.statusCode) !== "404" &&
      String(r.error.status) !== "404" &&
      r.error.message !== "Bucket not found"
    )
      throw r.error;
    const made = await s.createBucket(BUCKET, {
      public: false,
      fileSizeLimit: 5242880,
      allowedMimeTypes: ["image/webp"],
    });
    if (made.error) throw made.error;
  } else if (r.data.public)
    throw fail(503, "Blog image storage must be private.");
  bucketReady = true;
}
async function normalizeImage(buffer) {
  if (!Buffer.isBuffer(buffer) || buffer.length < 1 || buffer.length > 5242880)
    throw fail(400, "Choose a JPEG, PNG or WebP image up to 5 MB.");
  try {
    const image = sharp(buffer, {
        limitInputPixels: 16000000,
        animated: false,
        failOn: "warning",
      }),
      meta = await image.metadata();
    if (!["jpeg", "png", "webp"].includes(meta.format) || (meta.pages || 1) > 1)
      throw Error("format");
    return await image
      .rotate()
      .resize({
        width: 1600,
        height: 1600,
        fit: "inside",
        withoutEnlargement: true,
      })
      .webp({ quality: 82 })
      .toBuffer();
  } catch {
    throw fail(
      400,
      "The image is invalid, animated or too large. Use a still JPEG, PNG or WebP image under 16 megapixels.",
    );
  }
}
async function upload(id, buffer, actor) {
  if (!uuid(id)) throw fail(400, "Invalid upload reference.");
  const bytes = await normalizeImage(buffer),
    hash = crypto.createHash("sha256").update(bytes).digest("hex");
  const existing = (
    await db("ministry_blog_media", "get", {
      id: `eq.${id}`,
      select: "id,sha256",
      limit: 1,
    })
  )[0];
  if (existing) {
    if (existing.sha256 !== hash)
      throw fail(409, "Upload reference already used. Choose the file again.");
    return { id };
  }
  await bucket();
  const s = client().from(BUCKET),
    result = await s.upload(`${id}.webp`, bytes, {
      contentType: "image/webp",
      upsert: false,
      cacheControl: "300",
    });
  if (result.error) {
    // A network timeout may have saved the object. A retry never overwrites it.
    const old = await s.download(`${id}.webp`);
    if (old.error) throw result.error;
    if (
      crypto
        .createHash("sha256")
        .update(Buffer.from(await old.data.arrayBuffer()))
        .digest("hex") !== hash
    )
      throw fail(409, "Upload reference already used.");
  }
  await db(
    "ministry_blog_media",
    "post",
    { on_conflict: "id" },
    { id, sha256: hash, bytes: bytes.length, created_by: actor },
    "return=representation,resolution=ignore-duplicates",
  );
  const saved = (
    await db("ministry_blog_media", "get", {
      id: `eq.${id}`,
      select: "sha256",
      limit: 1,
    })
  )[0];
  if (saved?.sha256 !== hash) throw fail(409, "Upload reference conflict.");
  return { id };
}
async function download(id) {
  if (!uuid(id)) throw fail(404, "Image not found.");
  const r = await client().from(BUCKET).download(`${id}.webp`);
  if (r.error) throw fail(404, "Image not found.");
  return Buffer.from(await r.data.arrayBuffer());
}
module.exports = { normalizeImage, upload, download };
