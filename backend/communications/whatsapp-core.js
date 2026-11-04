const crypto = require("node:crypto");
const { parsePhoneNumberFromString } = require("libphonenumber-js/max");
const { fail } = require("../ministry-admin");
const { sha, ORIGIN } = require("./core");
const TYPES = [
  "devotional",
  "sunday",
  "midweek",
  "event",
  "registration",
  "reminder",
  "cancellation",
  "update",
];
const CONSENT_VERSION = "crh-whatsapp-2026-11-04";
// Owner's free-only instruction is deliberately NOT an environment-toggleable billing permission.
const COST_BLOCK =
  "WhatsApp bulk sending is blocked by the ministry’s free-only policy. Meta templates have separate charges; email credits do not cover WhatsApp.";
function config(env = process.env) {
  const missing = [
    "WHATSAPP_ACCESS_TOKEN",
    "WHATSAPP_PHONE_NUMBER_ID",
    "WHATSAPP_BUSINESS_ACCOUNT_ID",
    "WHATSAPP_APP_SECRET",
    "WHATSAPP_VERIFY_TOKEN",
    "WHATSAPP_API_VERSION",
    "WHATSAPP_BUSINESS_PHONE",
  ].filter((k) => !env[k]);
  return {
    provider: "meta_cloud",
    moduleEnabled: env.WHATSAPP_MODULE_ENABLED === "true",
    configured: !missing.length,
    missing,
    subscriptionReady:
      env.WHATSAPP_MODULE_ENABLED === "true" && !missing.length,
    bulkSending: false,
    freeOnly: true,
    reason: COST_BLOCK,
    defaultTime: "06:00",
    defaultTimezone: "Africa/Lagos",
    credits: null,
  };
}
function phone(number, countryCode) {
  const cc = String(countryCode || "").trim();
  if (!/^\+[1-9]\d{0,2}$/.test(cc))
    throw fail(400, "Choose an international country calling code.");
  let n = String(number || "").trim();
  if (!/^[+\d ()-]{5,30}$/.test(n))
    throw fail(400, "Enter a valid WhatsApp phone number.");
  n = n.replace(/[ ()-]/g, "");
  if (!n.startsWith("+")) n = cc + n.replace(/^0/, "");
  if (!n.startsWith(cc) || !/^\+[1-9]\d{7,14}$/.test(n))
    throw fail(
      400,
      "Phone number must match its country code and use international format.",
    );
  const parsed = parsePhoneNumberFromString(n);
  if (!parsed?.isValid() || "+" + parsed.countryCallingCode !== cc)
    throw fail(
      400,
      "This is not a valid phone number for the chosen country code.",
    );
  return parsed.number;
}
function preferences(b) {
  if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(b.time || ""))
    throw fail(400, "Choose a delivery time.");
  const timezone = String(b.timezone || "");
  if (timezone.length > 80) throw fail(400, "Choose a valid time zone.");
  try {
    new Intl.DateTimeFormat("en", { timeZone: timezone }).format();
  } catch {
    throw fail(400, "Choose a valid time zone.");
  }
  if (
    !Array.isArray(b.categories) ||
    !b.categories.length ||
    b.categories.some(
      (c) => !["devotional", "events", "services", "newsletter"].includes(c),
    )
  )
    throw fail(400, "Choose the WhatsApp updates you want.");
  return {
    categories: [...new Set(b.categories)],
    delivery_time: b.time,
    timezone,
  };
}
function subscription(b) {
  if (b?.whatsappConsent !== true)
    throw fail(
      400,
      "Separate WhatsApp consent is required. Email consent does not subscribe you.",
    );
  const name = String(b.name || "").trim();
  if (!name || name.length > 100 || /[\x00-\x1f]/.test(name))
    throw fail(400, "Enter your full name.");
  return { name, phone: phone(b.phone, b.countryCode), ...preferences(b) };
}
const maskPhone = (p) => String(p).replace(/.(?=.{4})/g, "•");
function signature(raw, value, secret) {
  if (
    !Buffer.isBuffer(raw) ||
    typeof secret !== "string" ||
    secret.length < 16 ||
    !/^sha256=[a-f0-9]{64}$/.test(value || "")
  )
    return false;
  const expected =
    "sha256=" + crypto.createHmac("sha256", secret).update(raw).digest("hex");
  return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(value));
}
function localParts(now, timezone) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(now);
  const p = Object.fromEntries(parts.map((x) => [x.type, x.value]));
  return {
    date: p.year + "-" + p.month + "-" + p.day,
    time: p.hour + ":" + p.minute,
  };
}
function dailyDue(s, now = new Date()) {
  const local = localParts(now, s.timezone),
    lagos = localParts(now, "Africa/Lagos");
  // No old Lagos readings to subscribers who are a day behind or ahead.
  return local.date === lagos.date && local.time >= s.delivery_time;
}
function template(b) {
  const name = String(b?.name || ""),
    language = String(b?.language || "en"),
    body = String(b?.body || "").trim(),
    category = b?.category;
  if (
    !/^[a-z][a-z0-9_]{2,99}$/.test(name) ||
    !/^(?:[a-z]{2}|[a-z]{2}_[A-Z]{2})$/.test(language) ||
    !["MARKETING", "UTILITY"].includes(category) ||
    !body ||
    body.length > 1024
  )
    throw fail(
      400,
      "Use a lowercase template name, supported language, category and body up to 1,024 characters.",
    );
  const vars = [...body.matchAll(/\{\{(\d+)\}\}/g)].map((x) => Number(x[1])),
    unique = [...new Set(vars)].sort((a, b) => a - b);
  if (
    body.replace(/\{\{\d+\}\}/g, "").match(/[{}]/) ||
    unique.length > 8 ||
    unique.some((x, i) => x !== i + 1)
  )
    throw fail(400, "Template variables must be sequential {{1}} to {{8}}.");
  if (!/STOP/i.test(body) || !/(CRH|Reformation House)/i.test(body))
    throw fail(
      400,
      "Include CRH branding and a reply STOP opt-out instruction.",
    );
  const examples = b.examples || [];
  if (
    !Array.isArray(examples) ||
    examples.length !== unique.length ||
    examples.some((x) => typeof x !== "string" || !x.trim() || x.length > 800)
  )
    throw fail(400, "Supply one realistic example for each template variable.");
  return {
    name,
    language,
    category,
    body,
    examples,
    variable_count: unique.length,
  };
}
function renderTemplate(t, parameters) {
  if (
    !Array.isArray(parameters) ||
    parameters.length !== t.variable_count ||
    parameters.some(
      (x) =>
        typeof x !== "string" ||
        !x.trim() ||
        x.length > 1024 ||
        /[\x00-\x08]/.test(x),
    )
  )
    throw fail(400, "Complete every saved template variable.");
  const text = t.body.replace(
    /\{\{(\d+)\}\}/g,
    (_, n) => parameters[Number(n) - 1],
  );
  if (text.length > 1024)
    throw fail(
      400,
      "This message exceeds the supported 1,024-character template body. Use an approved shorter notification and the full-reading link; the full devotional preview is preserved.",
    );
  return text;
}
function devotionalText(row, now = new Date()) {
  const date = localParts(now, "Africa/Lagos").date;
  if (
    !row ||
    row.publication_date !== date ||
    !row.reviewed_by ||
    !row.reviewed_at ||
    !require("../devotionals").visible(row, now)
  )
    throw fail(
      409,
      "No reviewed, released devotional exists for today in Nigeria.",
    );
  const c = row.content;
  return [
    "Christ’s Reformation House International Inc.",
    "UNLEASH THE SUPERNATURAL — " + date,
    c.title,
    c.mainReference,
    c.mainPassage,
    c.message,
    "Key lessons",
    ...(c.keyLessons || []),
    "Faith declaration",
    c.declaration,
    "Prayer points",
    ...(c.individualPrayers || []),
    ...(c.churchPrayers || []),
    c.closingPrayer,
    ORIGIN + "/devotional/" + date,
    "Reply STOP to opt out.",
  ]
    .filter(Boolean)
    .join("\n\n");
}
function campaign(b) {
  if (
    !TYPES.includes(b?.type) ||
    !["devotional", "events", "services", "newsletter"].includes(b.category)
  )
    throw fail(400, "Choose a ministry message type and consent category.");
  const categories = {
    devotional: "devotional",
    sunday: "services",
    midweek: "services",
    event: "events",
    registration: "events",
    reminder: "events",
    cancellation: "events",
    update: "newsletter",
  };
  if (categories[b.type] !== b.category)
    throw fail(
      400,
      "This message type requires its matching consent category.",
    );
  const title = String(b.title || "").trim();
  if (!title || title.length > 160)
    throw fail(400, "Enter a campaign title up to 160 characters.");
  const date = new Date(b.plannedAt);
  if (
    !/(Z|[+-]\d{2}:\d{2})$/.test(b.plannedAt || "") ||
    !Number.isFinite(+date) ||
    date < Date.now() - 60000 ||
    date > Date.now() + 366 * 86400000
  )
    throw fail(400, "Choose a future planned time with a time zone.");
  return {
    type: b.type,
    category: b.category,
    title,
    planned_at: date.toISOString(),
  };
}
function costEstimate({
  recipients,
  parts = 1,
  rates = [],
  currency = "USD",
  availableCredits = null,
} = {}) {
  const known =
    Array.isArray(recipients) &&
    recipients.every((p) =>
      rates.some(
        (r) =>
          p.startsWith(r.prefix) &&
          Number.isFinite(r.unitPrice) &&
          r.unitPrice >= 0,
      ),
    );
  let estimate = null;
  if (known)
    estimate = recipients.reduce(
      (sum, p) =>
        sum +
        [...rates]
          .sort((a, b) => b.prefix.length - a.prefix.length)
          .find((r) => p.startsWith(r.prefix)).unitPrice *
          parts,
      0,
    );
  return {
    recipients: recipients?.length || 0,
    messages: (recipients?.length || 0) * parts,
    currency,
    estimate,
    availableCredits,
    sufficient:
      estimate !== null && availableCredits !== null
        ? availableCredits >= estimate
        : null,
    blocked: true,
    reason: COST_BLOCK,
  };
}
function requireSending() {
  throw fail(402, COST_BLOCK);
}
function messagePayload(phoneNumber, t, parameters, jobId) {
  if (t.status !== "APPROVED")
    throw fail(409, "Meta has not approved this template.");
  renderTemplate(t, parameters);
  return {
    messaging_product: "whatsapp",
    recipient_type: "individual",
    to: phoneNumber.replace(/^\+/, ""),
    type: "template",
    template: {
      name: t.name,
      language: { code: t.language },
      components: parameters.length
        ? [
            {
              type: "body",
              parameters: parameters.map((text) => ({ type: "text", text })),
            },
          ]
        : [],
    },
    biz_opaque_callback_data: jobId,
  };
}
module.exports = {
  TYPES,
  CONSENT_VERSION,
  COST_BLOCK,
  config,
  phone,
  preferences,
  subscription,
  maskPhone,
  signature,
  localParts,
  dailyDue,
  template,
  renderTemplate,
  devotionalText,
  campaign,
  costEstimate,
  requireSending,
  messagePayload,
  sha,
};
