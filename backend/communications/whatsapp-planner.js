const wa = require("./whatsapp-core");
// Pure, previewable planner. No provider calls, billing permissions or queue writes.
function planDaily(subscriptions, reading, now = new Date()) {
  let text;
  try {
    text = wa.devotionalText(reading, now);
  } catch {
    return [];
  }
  const date = wa.localParts(now, "Africa/Lagos").date;
  return subscriptions
    .filter(
      (s) =>
        s.status === "active" &&
        s.categories.includes("devotional") &&
        wa.dailyDue(s, now),
    )
    .map((s) => ({
      subscriptionId: s.id,
      sourceKey: "devotional:" + date,
      sourceRevision: reading.revision,
      deliveryKey: "devotional:" + date + ":" + s.id,
      text,
      expiresAt: date + "T23:59:59+01:00",
      blocked: true,
      reason: wa.COST_BLOCK,
    }));
}
function planServices(subscriptions, rules, now = new Date()) {
  const plans = [];
  for (const rule of rules) {
    if (
      !rule.enabled ||
      !["sunday", "midweek"].includes(rule.type) ||
      !Number.isInteger(rule.weekday) ||
      rule.weekday < 0 ||
      rule.weekday > 6 ||
      !/^([01]\d|2[0-3]):[0-5]\d$/.test(rule.time || "")
    )
      continue;
    const local = wa.localParts(now, rule.timezone),
      day = new Date(local.date + "T12:00:00Z").getUTCDay();
    if (day !== rule.weekday || local.time < rule.time) continue;
    for (const s of subscriptions.filter(
      (s) => s.status === "active" && s.categories.includes("services"),
    ))
      plans.push({
        subscriptionId: s.id,
        type: rule.type,
        sourceKey: rule.type + ":" + local.date,
        deliveryKey: rule.type + ":" + local.date + ":" + s.id,
        blocked: true,
        reason: wa.COST_BLOCK,
      });
  }
  return plans;
}
function planEvent(
  subscriptions,
  event,
  { type = "reminder", registrationIds = [] } = {},
  now = new Date(),
) {
  if (
    !event ||
    !["event", "registration", "reminder", "cancellation"].includes(type)
  )
    return [];
  const starts = Date.parse(event.starts_at);
  if (!Number.isFinite(starts) || !event.id || !event.revision) return [];
  // Visibility changes are not evidence that a programme was cancelled.
  if (type === "cancellation" && event.cancelled !== true) return [];
  if (type !== "cancellation" && (!event.published || starts <= +now))
    return [];
  if (type === "reminder" && starts - +now > 86400000) return [];
  return subscriptions
    .filter(
      (s) =>
        s.status === "active" &&
        s.categories.includes("events") &&
        (type !== "registration" || registrationIds.includes(s.id)),
    )
    .map((s) => ({
      subscriptionId: s.id,
      type,
      eventId: event.id,
      sourceRevision: event.revision,
      deliveryKey: `event:${event.id}:${event.revision}:${type}:${s.id}`,
      blocked: true,
      reason: wa.COST_BLOCK,
    }));
}
module.exports = { planDaily, planServices, planEvent };
