const axios = require("axios");
const { fail } = require("../ministry-admin");
const core = require("./whatsapp-core");
function settings() {
  const e = process.env;
  if (
    !/^[0-9]{5,30}$/.test(e.WHATSAPP_BUSINESS_ACCOUNT_ID || "") ||
    !/^v\d{2}\.\d+$/.test(e.WHATSAPP_API_VERSION || "") ||
    !e.WHATSAPP_ACCESS_TOKEN
  )
    throw fail(
      503,
      "Configure Meta business account, API version and server token first.",
    );
  return {
    url:
      "https://graph.facebook.com/" +
      e.WHATSAPP_API_VERSION +
      "/" +
      e.WHATSAPP_BUSINESS_ACCOUNT_ID +
      "/message_templates",
    options: {
      headers: { Authorization: "Bearer " + e.WHATSAPP_ACCESS_TOKEN },
      timeout: 15000,
      maxRedirects: 0,
    },
  };
}
async function submitTemplate(t) {
  const { url, options } = settings();
  const components = [
    {
      type: "BODY",
      text: t.body,
      ...(t.examples.length ? { example: { body_text: [t.examples] } } : {}),
    },
  ];
  const { data } = await axios.post(
    url,
    { name: t.name, language: t.language, category: t.category, components },
    options,
  );
  if (!data?.id)
    throw fail(
      503,
      "Meta template submission reference is unknown. Reconcile by name before retrying.",
    );
  return data;
}
async function listTemplates(after) {
  const { url, options } = settings();
  if (after && !/^[\w=-]{1,2000}$/.test(after))
    throw fail(400, "Invalid template page cursor.");
  const { data } = await axios.get(url, {
    ...options,
    params: {
      fields: "id,name,language,status,category,components",
      limit: 100,
      ...(after ? { after } : {}),
    },
  });
  return {
    data: data.data || [],
    after:
      data.paging?.cursors?.after && data.paging?.next
        ? data.paging.cursors.after
        : null,
  };
}
// Prepared payload adapter; the deployment cannot authorize paid or uncertain-price traffic.
async function sendTemplate(phone, template, parameters, jobId) {
  core.requireSending();
  return core.messagePayload(phone, template, parameters, jobId);
}
module.exports = { submitTemplate, listTemplates, sendTemplate };
