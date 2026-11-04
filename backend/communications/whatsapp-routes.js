const express = require("express"),
  crypto = require("node:crypto");
const { fail, wrap, limiter } = require("../ministry-admin");
const { db, rpc } = require("./data"),
  core = require("./core"),
  wa = require("./whatsapp-core"),
  provider = require("./whatsapp-provider");
const uuid = (v) =>
  typeof v === "string" &&
  /^[a-f0-9]{8}-[a-f0-9]{4}-[1-8][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i.test(
    v,
  );
const all = ["admin", "approver", "manager", "editor", "viewer"],
  edit = ["admin", "approver", "manager", "editor"],
  approve = ["admin", "approver"];
const publicLimit = limiter(8, 3600000),
  webhookLimit = limiter(600, 60000),
  manageLimit = limiter(60, 3600000);
module.exports = function (staff) {
  const router = express.Router();
  router.get(
    "/communications/whatsapp/config",
    wrap(async (req, res) => res.json(wa.config())),
  );
  router.post(
    "/communications/whatsapp/subscribe",
    wrap(async (req, res) => {
      publicLimit(req);
      if (req.body?.website)
        return res
          .status(202)
          .json({ message: "Subscription request received." });
      if (!wa.config().subscriptionReady)
        throw fail(
          503,
          "WhatsApp subscription verification is not connected yet. No phone number was saved. Email subscriptions remain available.",
        );
      if (!require("../site-security").botConfig().ready)
        throw fail(503, "Form verification is unavailable.");
      await require("../site-security").verifyBot(req, "subscribe");
      const c = wa.subscription(req.body);
      const proof = core.token(),
        manage = core.token();
      let link_contact_id = null;
      // Link channels only with proof of an existing confirmed email identity. Never match raw form email/phone guesses.
      if (req.body.emailManageToken) {
        if (!core.validToken(req.body.emailManageToken))
          throw fail(400, "Invalid email preference proof.");
        const [t] = await db("communication_tokens", "get", {
          hash: "eq." + core.sha(req.body.emailManageToken),
          purpose: "eq.manage",
          expires_at: "gt." + new Date().toISOString(),
          limit: 1,
        });
        const [existing] = t
          ? await db("communication_contacts", "get", {
              id: "eq." + t.contact_id,
              status: "eq.active",
              limit: 1,
            })
          : [];
        if (!existing)
          throw fail(
            400,
            "Use a current confirmed email preference link to connect channels.",
          );
        link_contact_id = existing.id;
      }
      const [recent] = await db("communication_whatsapp_requests", "get", {
        phone: "eq." + c.phone,
        created_at: "gt." + new Date(Date.now() - 3600000).toISOString(),
        select: "hash",
        limit: 1,
      });
      if (recent)
        throw fail(
          429,
          "A verification request was made recently. Use that request or try again in one hour.",
        );
      const business = wa.phone(
        process.env.WHATSAPP_BUSINESS_PHONE,
        "+" + String(process.env.WHATSAPP_BUSINESS_COUNTRY_CODE || "234"),
      );
      await db(
        "communication_whatsapp_requests",
        "post",
        {},
        {
          ...c,
          hash: core.sha(proof),
          manage_hash: core.sha(manage),
          link_contact_id,
        },
      );
      res
        .status(202)
        .json({
          message:
            "Send the prepared JOIN message from the WhatsApp number you entered. This verifies your number and chosen consent. Automatic broadcasts remain paused under the free-only policy.",
          joinUrl:
            "https://wa.me/" +
            business.slice(1) +
            "?text=" +
            encodeURIComponent("JOIN " + proof),
          manageUrl: core.ORIGIN + "/subscribe/whatsapp#token=" + manage,
        });
    }),
  );
  router.post(
    "/communications/whatsapp/preferences/read",
    wrap(async (req, res) => {
      manageLimit(req);
      if (!core.validToken(req.body?.token))
        throw fail(400, "Use your private WhatsApp preference link.");
      const [r] = await db("communication_whatsapp_requests", "get", {
        manage_hash: "eq." + core.sha(req.body.token),
        created_at: "gt." + new Date(Date.now() - 365 * 86400000).toISOString(),
        select: "phone,used_at,link_contact_id",
        limit: 1,
      });
      if (!r) throw fail(400, "This preference link is invalid or expired.");
      const [s] = r.used_at
        ? await db("communication_whatsapp_subscriptions", "get", {
            phone: "eq." + r.phone,
            contact_id: "eq." + r.link_contact_id,
            select: "status,categories,delivery_time,timezone",
            limit: 1,
          })
        : [];
      res.json(
        s
          ? { ...s, phone: wa.maskPhone(r.phone) }
          : { status: "pending", phone: wa.maskPhone(r.phone) },
      );
    }),
  );
  router.post(
    "/communications/whatsapp/preferences",
    wrap(async (req, res) => {
      manageLimit(req);
      if (!core.validToken(req.body?.token))
        throw fail(400, "Use your private WhatsApp preference link.");
      const stop = req.body.unsubscribe === true,
        p = stop
          ? { categories: [], delivery_time: "06:00", timezone: "Africa/Lagos" }
          : wa.preferences(req.body);
      if (
        !(await rpc("crh_whatsapp_preferences", {
          p_hash: core.sha(req.body.token),
          p_categories: p.categories,
          p_time: p.delivery_time,
          p_timezone: p.timezone,
          p_stop: stop,
        }))
      )
        throw fail(
          400,
          "This link cannot change an active subscription. You can always send STOP to the ministry on WhatsApp.",
        );
      res.json({
        message: stop
          ? "WhatsApp subscription stopped. Email choices are unchanged."
          : "WhatsApp preferences updated. Email choices are unchanged.",
      });
    }),
  );
  router.get(
    "/communications/webhooks/whatsapp",
    wrap(async (req, res) => {
      const expected = process.env.WHATSAPP_VERIFY_TOKEN || "",
        received = req.query["hub.verify_token"];
      if (
        expected.length < 32 ||
        typeof received !== "string" ||
        received.length !== expected.length ||
        !crypto.timingSafeEqual(Buffer.from(received), Buffer.from(expected)) ||
        req.query["hub.mode"] !== "subscribe" ||
        !/^\d{1,100}$/.test(req.query["hub.challenge"] || "")
      )
        throw fail(403, "Webhook verification failed.");
      res.type("text").send(req.query["hub.challenge"]);
    }),
  );
  router.post(
    "/communications/webhooks/whatsapp",
    wrap(async (req, res) => {
      if (
        !wa.signature(
          req.rawBody,
          req.headers["x-hub-signature-256"],
          process.env.WHATSAPP_APP_SECRET,
        )
      )
        throw fail(401, "Invalid WhatsApp webhook signature.");
      webhookLimit(req);
      const b = req.body;
      if (
        b?.object !== "whatsapp_business_account" ||
        !Array.isArray(b.entry) ||
        b.entry.length > 100
      )
        throw fail(400, "Invalid WhatsApp event.");
      for (const entry of b.entry) {
        if (String(entry.id) !== process.env.WHATSAPP_BUSINESS_ACCOUNT_ID)
          throw fail(403, "Unexpected WhatsApp account.");
        for (const change of entry.changes || []) {
          const v = change.value || {};
          if (change.field === "message_template_status_update") {
            // Approval events invalidate cached status until the exact provider body is reconciled.
            if (v.message_template_id)
              await db(
                "communication_whatsapp_templates",
                "patch",
                { provider_id: "eq." + String(v.message_template_id) },
                {
                  status: ["REJECTED", "PAUSED", "DISABLED"].includes(v.event)
                    ? v.event
                    : "NEEDS_REVIEW",
                  synced_at: null,
                },
              );
            continue;
          }
          if (change.field !== "messages") continue;
          if (
            String(v.metadata?.phone_number_id) !==
            process.env.WHATSAPP_PHONE_NUMBER_ID
          )
            throw fail(403, "Unexpected WhatsApp number.");
          if ((v.messages?.length || 0) + (v.statuses?.length || 0) > 200)
            throw fail(400, "Webhook batch too large.");
          for (const m of v.messages || []) {
            const text = String(
              m.text?.body ||
                m.button?.text ||
                m.interactive?.button_reply?.id ||
                "",
            ).trim();
            const stop = /^(STOP|UNSUBSCRIBE|CANCEL|END|QUIT)$/i.test(text),
              join = /^JOIN ([a-f0-9]{64})$/i.exec(text);
            if (!stop && !join) continue;
            if (!/^\d{8,15}$/.test(m.from || "") || typeof m.id !== "string")
              throw fail(400, "Invalid inbound message.");
            const at = new Date(Number(m.timestamp) * 1000);
            if (!Number.isFinite(+at)) throw fail(400, "Invalid event time.");
            await rpc("crh_whatsapp_inbound", {
              p_key: core.sha("inbound:" + m.id),
              p_phone: "+" + m.from,
              p_action: stop ? "stop" : "join",
              p_hash: join ? core.sha(join[1].toLowerCase()) : "",
              p_at: at.toISOString(),
            });
          }
          for (const s of v.statuses || []) {
            if (!["sent", "delivered", "read", "failed"].includes(s.status))
              continue;
            const at = new Date(Number(s.timestamp) * 1000);
            if (
              typeof s.id !== "string" ||
              s.id.length > 300 ||
              !Number.isFinite(+at) ||
              +at > Date.now() + 300000
            )
              throw fail(400, "Invalid delivery status.");
            if (
              !(await rpc("crh_whatsapp_delivery", {
                p_key: core.sha(s.id + ":" + s.status + ":" + s.timestamp),
                p_provider: s.id,
                p_event: s.status,
                p_at: at.toISOString(),
                p_pricing: s.pricing || null,
                p_error: s.errors?.[0]?.code ? String(s.errors[0].code) : null,
              }))
            )
              throw fail(
                503,
                "Unknown message reference; retry for reconciliation.",
              );
          }
        }
      }
      res.status(200).json({ received: true });
    }),
  );
  router.get(
    "/ministry-admin/communications/whatsapp",
    staff(all, async (req, res, u, role) => {
      const offset = Number(req.query.offset || 0);
      if (!Number.isSafeInteger(offset) || offset < 0 || offset > 100000)
        throw fail(400, "Invalid page.");
      const canSee = ["admin", "approver", "manager"].includes(role);
      const [templates, campaigns, jobs, subscribers, metrics, events] =
        await Promise.all([
          db("communication_whatsapp_templates", "get", {
            order: "created_at.desc",
            limit: 50,
          }),
          db("communication_whatsapp_campaigns", "get", {
            order: "created_at.desc",
            limit: 30,
          }),
          db("communication_whatsapp_jobs", "get", {
            select:
              "id,campaign_id,status,error_code,submitted_at,delivered_at,read_at,created_at",
            order: "created_at.desc",
            limit: 50,
          }),
          canSee
            ? db("communication_whatsapp_subscriptions", "get", {
                select:
                  "id,phone,status,categories,delivery_time,timezone,contact_id",
                order: "created_at.desc",
                limit: 50,
                offset,
              })
            : [],
          rpc("crh_whatsapp_metrics", {}),
          db("ministry_events", "get", {
            select: "id,title,starts_at",
            published: "eq.true",
            starts_at: "gt." + new Date().toISOString(),
            order: "starts_at.asc",
            limit: 100,
          }),
        ]);
      res.json({
        config: wa.config(),
        templates,
        campaigns,
        jobs,
        events,
        subscribers: subscribers.map((s) => ({
          ...s,
          phone: wa.maskPhone(s.phone),
        })),
        metrics,
        scope:
          "Latest 50 templates, 30 plans, 50 attempts and one page of 50 masked subscribers. Totals cover all records; unknown costs and credits are not zero.",
      });
    }),
  );
  router.post(
    "/ministry-admin/communications/whatsapp/templates",
    staff(edit, async (req, res, u) => {
      const t = wa.template(req.body);
      let row;
      try {
        [row] = await db(
          "communication_whatsapp_templates",
          "post",
          {},
          { ...t, created_by: u.id },
        );
      } catch (e) {
        if (e.response?.status === 409)
          throw fail(
            409,
            "This template name and language already exist. Refresh before creating another.",
          );
        throw e;
      }
      res.status(201).json({ template: row });
    }),
  );
  router.post(
    "/ministry-admin/communications/whatsapp/templates/:id/submit",
    staff(approve, async (req, res, u) => {
      if (
        !uuid(req.params.id) ||
        !Number.isInteger(req.body?.revision) ||
        req.body.confirm !== true
      )
        throw fail(400, "Review and confirm this template submission.");
      // No external write occurs until explicit staff review and account configuration.
      if (!wa.config().configured)
        throw fail(
          503,
          "Connect the official Meta account before submitting templates.",
        );
      const [t] = await db(
        "communication_whatsapp_templates",
        "patch",
        {
          id: "eq." + req.params.id,
          status: "eq.LOCAL_DRAFT",
          revision: "eq." + req.body.revision,
        },
        { status: "SUBMITTING" },
      );
      if (!t)
        throw fail(
          409,
          "Template changed or already submitted. Reconcile its provider status before retrying.",
        );
      try {
        const result = await provider.submitTemplate(t);
        await db(
          "communication_whatsapp_templates",
          "patch",
          { id: "eq." + t.id },
          {
            provider_id: String(result.id),
            status: "PENDING",
            synced_at: null,
          },
        );
      } catch {
        await db(
          "communication_whatsapp_templates",
          "patch",
          { id: "eq." + t.id },
          { status: "NEEDS_REVIEW" },
        );
        throw fail(
          503,
          "Submission result is uncertain. Refresh Meta templates to reconcile by name; do not resubmit blindly.",
        );
      }
      await db(
        "communication_activity",
        "post",
        {},
        { actor_id: u.id, action: "whatsapp_template_submitted" },
      );
      res.json({
        message: "Submitted to Meta. Approval is not assumed; refresh status.",
      });
    }),
  );
  router.post(
    "/ministry-admin/communications/whatsapp/templates/sync",
    staff(approve, async (req, res) => {
      const page = await provider.listTemplates(req.body?.after);
      let reconciled = 0;
      for (const remote of page.data) {
        const [t] = await db("communication_whatsapp_templates", "get", {
          name: "eq." + remote.name,
          language: "eq." + remote.language,
          limit: 1,
        });
        if (!t) continue;
        const body = (remote.components || []).find(
          (c) => c.type === "BODY",
        )?.text;
        const supported = (remote.components || []).every((c) =>
          ["BODY"].includes(c.type),
        );
        const status =
          body === t.body &&
          supported &&
          remote.category === t.category &&
          ["PENDING", "APPROVED", "REJECTED", "PAUSED", "DISABLED"].includes(
            remote.status,
          )
            ? remote.status
            : "NEEDS_REVIEW";
        await db(
          "communication_whatsapp_templates",
          "patch",
          { id: "eq." + t.id },
          {
            provider_id: String(remote.id),
            status,
            synced_at: new Date().toISOString(),
          },
        );
        reconciled++;
      }
      res.json({
        reconciled,
        after: page.after,
        message:
          "Provider status reconciled only for exact matching body, category and supported components.",
      });
    }),
  );
  router.post(
    "/ministry-admin/communications/whatsapp/automation-preview",
    staff(["admin", "approver", "manager"], async (req, res) => {
      const now = new Date(),
        date = wa.localParts(now, "Africa/Lagos").date;
      const [subscribers, readings, events] = await Promise.all([
        db("communication_whatsapp_subscriptions", "get", {
          status: "eq.active",
          select: "id,status,categories,delivery_time,timezone",
          limit: 500,
        }),
        db("devotional_entries", "get", {
          publication_date: "eq." + date,
          status: "in.(published,scheduled)",
          reviewed_by: "not.is.null",
          reviewed_at: "not.is.null",
          release_at: "lte." + now.toISOString(),
          limit: 1,
        }),
        db("ministry_events", "get", {
          published: "eq.true",
          starts_at: "gt." + now.toISOString(),
          select: "id,revision,starts_at,published",
          order: "starts_at.asc",
          limit: 100,
        }),
      ]);
      const planner = require("./whatsapp-planner"),
        daily = planner.planDaily(subscribers, readings[0], now);
      const reminders = events.flatMap((event) =>
        planner.planEvent(subscribers, event, { type: "reminder" }, now),
      );
      res.json({
        date,
        timezone: "Africa/Lagos",
        dailyEligible: daily.length,
        eventReminderCandidates: reminders.length,
        blocked: true,
        reason: wa.COST_BLOCK,
        scope:
          "Preview of at most 500 active subscriptions and 100 upcoming published events. No jobs are queued.",
        serviceRules:
          "Sunday and midweek times require explicit ministry schedules; none are assumed.",
        registration:
          "Registration confirmations require a verified linked email and exact event registration. Cancellations require explicit cancellation data, never just an unpublished event.",
      });
    }),
  );
  router.post(
    "/ministry-admin/communications/whatsapp/preview/devotional",
    staff(edit, async (req, res) => {
      const date = wa.localParts(new Date(), "Africa/Lagos").date;
      const [row] = await db("devotional_entries", "get", {
        publication_date: "eq." + date,
        status: "in.(published,scheduled)",
        reviewed_by: "not.is.null",
        reviewed_at: "not.is.null",
        release_at: "lte." + new Date().toISOString(),
        limit: 1,
      });
      res.json({
        text: wa.devotionalText(row),
        sourceKey: "devotional:" + date,
        revision: row.revision,
        note: "Full approved content preview. A template must fit Meta limits; no text is silently truncated and nothing is sent.",
      });
    }),
  );
  router.post(
    "/ministry-admin/communications/whatsapp/preview",
    staff(edit, async (req, res) => {
      if (!uuid(req.body?.templateId))
        throw fail(400, "Choose a saved template.");
      const [t] = await db("communication_whatsapp_templates", "get", {
        id: "eq." + req.body.templateId,
        limit: 1,
      });
      if (!t) throw fail(404, "Template not found.");
      res.json({
        text: wa.renderTemplate(t, req.body.parameters),
        templateStatus: t.status,
        sendable: false,
        reason: wa.COST_BLOCK,
      });
    }),
  );
  router.post(
    "/ministry-admin/communications/whatsapp/campaigns",
    staff(edit, async (req, res, u) => {
      const c = wa.campaign(req.body);
      if (!uuid(req.body.creationKey) || !uuid(req.body.templateId))
        throw fail(400, "Reload the composer before saving.");
      const [t] = await db("communication_whatsapp_templates", "get", {
        id: "eq." + req.body.templateId,
        limit: 1,
      });
      if (!t) throw fail(404, "Template not found.");
      const text = wa.renderTemplate(t, req.body.parameters);
      if (t.category === "UTILITY" && c.type !== "registration")
        throw fail(
          400,
          "Utility templates require a verified, specific registration in this release. General devotional and event campaigns use marketing templates.",
        );
      let event_id = null,
        target_subscription_id = null;
      if (c.type === "registration") {
        if (!uuid(req.body.eventId) || !uuid(req.body.subscriptionId))
          throw fail(
            400,
            "Choose the event and verified recipient for this registration confirmation.",
          );
        const [s] = await db("communication_whatsapp_subscriptions", "get", {
          id: "eq." + req.body.subscriptionId,
          status: "eq.active",
          limit: 1,
        });
        const [contact] = s
          ? await db("communication_contacts", "get", {
              id: "eq." + s.contact_id,
              status: "eq.active",
              email: "not.is.null",
              confirmed_at: "not.is.null",
              limit: 1,
            })
          : [];
        const [registration] =
          contact && s.categories.includes("events")
            ? await db("ministry_event_registrations", "get", {
                event_id: "eq." + req.body.eventId,
                email: "eq." + contact.email,
                select: "id",
                limit: 1,
              })
            : [];
        const [event] = await db("ministry_events", "get", {
          id: "eq." + req.body.eventId,
          published: "eq.true",
          starts_at: "gt." + new Date().toISOString(),
          select: "id",
          limit: 1,
        });
        if (!registration || !event)
          throw fail(
            409,
            "No matching upcoming registration with verified email identity and active WhatsApp event consent. Link channels through the subscriber preference page first.",
          );
        event_id = event.id;
        target_subscription_id = s.id;
      }
      // Free-only plans have a planned time, never a scheduled/sendable state.
      let row;
      const value = {
        ...c,
        event_id,
        target_subscription_id,
        template_id: t.id,
        template_revision: t.revision,
        parameters: req.body.parameters,
        text,
        creation_key: req.body.creationKey,
        created_by: u.id,
      };
      try {
        [row] = await db("communication_whatsapp_campaigns", "post", {}, value);
      } catch (e) {
        if (e.response?.status !== 409) throw e;
        [row] = await db("communication_whatsapp_campaigns", "get", {
          creation_key: "eq." + req.body.creationKey,
          limit: 1,
        });
        if (
          !row ||
          row.created_by !== u.id ||
          row.text !== text ||
          row.template_id !== t.id ||
          Date.parse(row.planned_at) !== Date.parse(value.planned_at) ||
          row.category !== c.category ||
          row.type !== c.type ||
          row.title !== c.title ||
          row.event_id !== event_id ||
          row.target_subscription_id !== target_subscription_id
        )
          throw fail(409, "This save key was already used. Refresh first.");
      }
      await db(
        "communication_activity",
        "post",
        {},
        { actor_id: u.id, action: "whatsapp_plan_saved" },
      );
      res
        .status(201)
        .json({
          campaign: row,
          message:
            "Plan saved; no sending is scheduled under the free-only policy.",
        });
    }),
  );
  router.post(
    "/ministry-admin/communications/whatsapp/campaigns/:id/estimate",
    staff(["admin", "approver", "manager"], async (req, res) => {
      if (!uuid(req.params.id)) throw fail(400, "Invalid campaign.");
      const [c] = await db("communication_whatsapp_campaigns", "get", {
        id: "eq." + req.params.id,
        limit: 1,
      });
      if (!c) throw fail(404, "Campaign not found.");
      const eligible =
        c.type === "registration"
          ? await db("communication_whatsapp_subscriptions", "get", {
              id: "eq." + c.target_subscription_id,
              status: "eq.active",
              categories: "cs.{events}",
              select: "id",
              limit: 1,
            }).then((r) => r.length)
          : await rpc("crh_whatsapp_audience_count", {
              p_category: c.category,
            });
      res.json({
        recipients: Number(eligible),
        estimate: null,
        currency: null,
        availableCredits: null,
        sufficient: null,
        blocked: true,
        reason: wa.COST_BLOCK,
        note: "No verified rate card or credit balance is configured. Unknown is not free.",
      });
    }),
  );
  router.post(
    "/ministry-admin/communications/whatsapp/campaigns/:id/schedule",
    staff(approve, async () => {
      wa.requireSending();
    }),
  );
  router.post(
    "/ministry-admin/communications/whatsapp/campaigns/:id/cancel",
    staff(["admin", "approver", "manager"], async (req, res, u) => {
      if (!uuid(req.params.id) || !Number.isInteger(req.body?.revision))
        throw fail(400, "Reload the plan.");
      const [c] = await db(
        "communication_whatsapp_campaigns",
        "patch",
        {
          id: "eq." + req.params.id,
          revision: "eq." + req.body.revision,
          status: "eq.planned",
        },
        { status: "cancelled", revision: req.body.revision + 1 },
      );
      if (!c) throw fail(409, "Plan changed; refresh first.");
      await db(
        "communication_activity",
        "post",
        {},
        { actor_id: u.id, action: "whatsapp_plan_cancelled" },
      );
      res.json({ campaign: c });
    }),
  );
  router.post(
    "/ministry-admin/communications/whatsapp/subscribers/:id/stop",
    staff(["admin", "approver", "manager"], async (req, res, u) => {
      if (!uuid(req.params.id)) throw fail(400, "Invalid subscription.");
      const [s] = await db("communication_whatsapp_subscriptions", "get", {
        id: "eq." + req.params.id,
        select: "phone",
        limit: 1,
      });
      if (!s) throw fail(404, "Subscriber not found.");
      await rpc("crh_whatsapp_inbound", {
        p_key: core.sha("staff-stop:" + crypto.randomUUID()),
        p_phone: s.phone,
        p_action: "stop",
        p_hash: "",
        p_at: new Date().toISOString(),
      });
      await db(
        "communication_activity",
        "post",
        {},
        { actor_id: u.id, action: "whatsapp_staff_opt_out" },
      );
      res.json({ message: "WhatsApp opt-out saved. Email is unchanged." });
    }),
  );
  return router;
};
