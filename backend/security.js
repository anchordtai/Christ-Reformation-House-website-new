// Process-local protection. Add a shared gateway limiter before scaling to
// multiple workers; this does not claim cross-instance coordination.
function requestLimits({ limit = 60, maxKeys = 2500, windowMs = 60000 } = {}) {
  const buckets = new Map();
  return (req, res, next) => {
    if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) return next();
    const now = Date.now();
    // Group dynamic IDs into a small fixed namespace instead of accepting
    // arbitrary paths as memory keys. Never trust client forwarding headers.
    const path = req.path.startsWith('/auth/') ? '/auth' : `/${req.path.split('/')[1] || ''}`;
    const key = `${req.ip}:${path}`;
    let bucket = buckets.get(key);
    if (bucket && now - bucket.time >= windowMs) { buckets.delete(key); bucket = null; }
    if (!bucket && buckets.size >= maxKeys) {
      for (const [id, value] of buckets) if (now - value.time >= windowMs) buckets.delete(id);
      if (buckets.size >= maxKeys) return res.status(429).set('Retry-After', '60').json({ error: 'The service is receiving too many requests. Please retry shortly.' });
    }
    if (bucket && bucket.count >= (path === '/auth' ? Math.min(limit, 15) : limit)) return res.status(429).set('Retry-After', '60').json({ error: 'Too many requests. Please wait a minute and try again.' });
    buckets.set(key, bucket ? { ...bucket, count: bucket.count + 1 } : { time: now, count: 1 });
    next();
  };
}
function responseHeaders(req, res, next) {
  res.set('X-Content-Type-Options', 'nosniff');
  res.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  if (/^\/api\/(auth|admin|donations|payments|prayer-requests|contact|store\/orders)(\/|$)/.test(req.path)) res.set('Cache-Control', 'no-store');
  next();
}
module.exports = { requestLimits, responseHeaders };
