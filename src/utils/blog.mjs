export function lagosInput(iso) {
  return iso
    ? new Date(Date.parse(iso) + 3600000).toISOString().slice(0, 16)
    : "";
}
export function lagosISO(value) {
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value))
    throw Error("Choose a valid Lagos date and time.");
  const d = new Date(value + ":00+01:00");
  if (!Number.isFinite(+d) || lagosInput(d.toISOString()) !== value)
    throw Error("Choose a valid Lagos date and time.");
  return d.toISOString();
}
export function readerId() {
  const key = "crhBlogReaderV1";
  let id = localStorage.getItem(key);
  if (!/^[a-f0-9]{64}$/.test(id || "")) {
    id = Array.from(crypto.getRandomValues(new Uint8Array(32)), (b) =>
      b.toString(16).padStart(2, "0"),
    ).join("");
    localStorage.setItem(key, id);
  }
  return id;
}
export function makeSlug(title) {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 120)
    .replace(/-$/, "");
}

export function newBlogId() {
  const b = crypto.getRandomValues(new Uint8Array(16));
  b[6] = (b[6] & 15) | 64;
  b[8] = (b[8] & 63) | 128;
  const h = Array.from(b, (x) => x.toString(16).padStart(2, "0")).join("");
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`;
}
