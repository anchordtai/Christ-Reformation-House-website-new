import { useEffect, useState } from "react";
import {
  staffCommunication,
  communicationError,
} from "../services/communications";
const kinds = {
  devotional: ["Daily devotional", "devotional"],
  sunday: ["Sunday service", "services"],
  midweek: ["Midweek service", "services"],
  event: ["Event announcement", "events"],
  registration: ["Registration confirmation", "events"],
  reminder: ["Event reminder", "events"],
  cancellation: ["Programme cancellation", "events"],
  update: ["Important ministry update", "newsletter"],
};
const initialTemplate = {
  name: "",
  language: "en",
  category: "MARKETING",
  body: "Christ’s Reformation House International Inc.\n\n{{1}}\n\nReply STOP to opt out.",
  examples:
    "UNLEASH THE SUPERNATURAL — Read today’s approved devotional on our website.",
};
export default function WhatsAppDesk({ role }) {
  const [data, setData] = useState(null),
    [tab, setTab] = useState("overview"),
    [error, setError] = useState(""),
    [notice, setNotice] = useState(""),
    [busy, setBusy] = useState(false),
    [offset, setOffset] = useState(0),
    [template, setTemplate] = useState(initialTemplate),
    [type, setType] = useState("devotional"),
    [title, setTitle] = useState(""),
    [templateId, setTemplateId] = useState(""),
    [parameters, setParameters] = useState([]),
    [planned, setPlanned] = useState(""),
    [preview, setPreview] = useState(""),
    [creationKey, setKey] = useState(() => crypto.randomUUID()),
    [cursor, setCursor] = useState(null),
    [submission, setSubmission] = useState(null),
    [confirmed, setConfirmed] = useState(false),
    [eventId, setEventId] = useState(""),
    [subscriptionId, setSubscriptionId] = useState("");
  const canEdit = ["admin", "approver", "manager", "editor"].includes(role),
    canApprove = ["admin", "approver"].includes(role),
    canContacts = ["admin", "approver", "manager"].includes(role);
  const api = (p = "", b) => staffCommunication("/whatsapp" + p, b);
  async function load() {
    setData(await api("?offset=" + offset));
  }
  async function action(fn) {
    if (busy) return;
    setBusy(true);
    setError("");
    setNotice("");
    try {
      await fn();
    } catch (e) {
      setError(communicationError(e));
    } finally {
      setBusy(false);
    }
  }
  useEffect(() => {
    let active = true;
    api("?offset=" + offset)
      .then((r) => active && setData(r))
      .catch((e) => active && setError(communicationError(e)));
    return () => {
      active = false;
    };
  }, [offset]);
  const selected = data?.templates.find((t) => t.id === templateId);
  async function sync() {
    const r = await api("/templates/sync", cursor ? { after: cursor } : {});
    setCursor(r.after);
    setNotice(
      r.message +
        (r.after ? " More provider templates remain; load the next page." : ""),
    );
    await load();
  }
  return (
    <section className="crh-wa-panel">
      <h2>WhatsApp ministry centre</h2>
      <p>
        Official Meta Cloud API · Separate consent · Clear delivery reporting
      </p>
      {error && (
        <p role="alert" className="platform-error">
          {error}
        </p>
      )}
      {notice && <p role="status">{notice}</p>}
      <nav aria-label="WhatsApp tools">
        {[
          "overview",
          "templates",
          "plans",
          "subscribers",
          "reports",
          "setup",
        ].map((t) => (
          <button
            className="secondary-button"
            key={t}
            aria-pressed={tab === t}
            onClick={() => setTab(t)}
          >
            {t[0].toUpperCase() + t.slice(1)}
          </button>
        ))}
        <button
          className="secondary-button"
          disabled={busy}
          onClick={() => action(load)}
        >
          Refresh WhatsApp
        </button>
      </nav>
      {!data ? (
        <p role="status">Loading WhatsApp…</p>
      ) : (
        <>
          <div className="crh-wa-callout">
            <strong>Free-only sending lock</strong>
            <p>{data.config.reason}</p>
            <p>
              Templates and campaign plans can be prepared. A planned time does
              not schedule delivery. No billing balance is assumed.
            </p>
          </div>
          {tab === "overview" && (
            <>
              <div className="crh-wa-stats">
                {[
                  ["total", "Subscribers"],
                  ["active", "Active"],
                  ["submitted", "Submitted"],
                  ["delivered", "Delivered"],
                  ["read", "Read receipts"],
                  ["failed", "Failed"],
                ].map(([k, l]) => (
                  <div key={k}>
                    <strong>{data.metrics[k] ?? 0}</strong>
                    {l}
                  </div>
                ))}
              </div>
              <div className="meeting-action-card">
                <h3>Costs & usage</h3>
                <p>
                  Available credits: unknown · Credits consumed: unknown ·
                  Actual cost: unknown
                </p>
                <p>{data.metrics.costNote}</p>
                <p>
                  Read receipts / delivered:{" "}
                  {data.metrics.delivered
                    ? Math.round(
                        (data.metrics.read / data.metrics.delivered) * 100,
                      ) + "%"
                    : "— (no confirmed deliveries)"}
                  . Receipts may be unavailable for some readers.
                </p>
                <p>
                  Default devotional preference is 06:00 Africa/Lagos;
                  subscribers choose their local time. Queue delays and provider
                  approval affect delivery.
                </p>
                {canContacts && (
                  <button
                    className="secondary-button"
                    disabled={busy}
                    onClick={() =>
                      action(async () => {
                        const r = await api("/automation-preview", {});
                        setNotice(
                          `${r.date}: ${r.dailyEligible} daily devotional recipients due; ${r.eventReminderCandidates} event reminder candidates. ${r.scope} ${r.serviceRules} ${r.reason}`,
                        );
                      })
                    }
                  >
                    Preview automation eligibility
                  </button>
                )}
              </div>
            </>
          )}
          {tab === "templates" && (
            <>
              <p>
                Meta decides approval and category. Saving a local draft does
                not approve or submit it. This integration supports body-only
                templates up to 1,024 characters.
              </p>
              {canEdit && (
                <form
                  className="meeting-action-card"
                  onSubmit={(e) => {
                    e.preventDefault();
                    action(async () => {
                      await api("/templates", {
                        ...template,
                        examples: template.examples
                          ? template.examples.split("\n")
                          : [],
                      });
                      setTemplate(initialTemplate);
                      setNotice("Local template draft saved.");
                      await load();
                    });
                  }}
                >
                  <h3>Create a template draft</h3>
                  <label>
                    Template name
                    <input
                      required
                      pattern="[a-z][a-z0-9_]{2,99}"
                      placeholder="crh_daily_devotional"
                      value={template.name}
                      onChange={(e) =>
                        setTemplate({ ...template, name: e.target.value })
                      }
                    />
                  </label>
                  <label>
                    Language
                    <input
                      required
                      maxLength={5}
                      value={template.language}
                      onChange={(e) =>
                        setTemplate({ ...template, language: e.target.value })
                      }
                    />
                  </label>
                  <label>
                    Category
                    <select
                      value={template.category}
                      onChange={(e) =>
                        setTemplate({ ...template, category: e.target.value })
                      }
                    >
                      <option>MARKETING</option>
                      <option>UTILITY</option>
                    </select>
                  </label>
                  <p>
                    Daily inspiration and general announcements should be
                    submitted as marketing. Utility is for eligible specific
                    transactions such as a requested registration confirmation;
                    Meta may reclassify.
                  </p>
                  <label>
                    Template body
                    <textarea
                      required
                      rows={7}
                      maxLength={1024}
                      value={template.body}
                      onChange={(e) =>
                        setTemplate({ ...template, body: e.target.value })
                      }
                    />
                  </label>
                  <label>
                    Examples: one line for each sequential variable
                    <textarea
                      rows={3}
                      value={template.examples}
                      onChange={(e) =>
                        setTemplate({ ...template, examples: e.target.value })
                      }
                    />
                  </label>
                  <button className="ministry-button dark" disabled={busy}>
                    Save local template
                  </button>
                </form>
              )}
              {canApprove && (
                <button
                  className="secondary-button"
                  disabled={busy || !data.config.configured}
                  onClick={() => action(sync)}
                >
                  {cursor
                    ? "Load next Meta template page"
                    : "Reconcile Meta approval status"}
                </button>
              )}
              {data.templates.map((t) => (
                <article className="crh-comms-campaign" key={t.id}>
                  <strong>{t.name}</strong>
                  <p>
                    {t.language} · {t.category} ·{" "}
                    <span className="crh-wa-badge">{t.status}</span>
                  </p>
                  <details>
                    <summary>Review template</summary>
                    <pre className="crh-wa-message">{t.body}</pre>
                  </details>
                  {canApprove && t.status === "LOCAL_DRAFT" && (
                    <button
                      className="secondary-button"
                      disabled={busy || !data.config.configured}
                      onClick={() => {
                        setSubmission(t);
                        setConfirmed(false);
                      }}
                    >
                      Review submission to Meta
                    </button>
                  )}
                </article>
              ))}
              {submission && (
                <form
                  className="meeting-action-card"
                  onSubmit={(e) => {
                    e.preventDefault();
                    action(async () => {
                      const r = await api(
                        "/templates/" + submission.id + "/submit",
                        { revision: submission.revision, confirm: confirmed },
                      );
                      setNotice(r.message);
                      setSubmission(null);
                      await load();
                    });
                  }}
                >
                  <h3>Submit {submission.name}</h3>
                  <pre className="crh-wa-message">{submission.body}</pre>
                  <label className="crh-comms-check">
                    <input
                      type="checkbox"
                      required
                      checked={confirmed}
                      onChange={(e) => setConfirmed(e.target.checked)}
                    />
                    I reviewed this template and its category and approve
                    sending it to Meta for review. This does not send a
                    campaign.
                  </label>
                  <button
                    className="ministry-button dark"
                    disabled={busy || !confirmed}
                  >
                    Submit for Meta review
                  </button>
                  <button
                    className="secondary-button"
                    type="button"
                    onClick={() => setSubmission(null)}
                  >
                    Close review
                  </button>
                </form>
              )}
            </>
          )}
          {tab === "plans" && (
            <>
              {canEdit && (
                <div className="crh-comms-grid">
                  <form
                    className="meeting-action-card"
                    onSubmit={(e) => {
                      e.preventDefault();
                      action(async () => {
                        const r = await api("/campaigns", {
                          type,
                          category: kinds[type][1],
                          title,
                          templateId,
                          parameters,
                          eventId,
                          subscriptionId,
                          plannedAt: planned + ":00+01:00",
                          creationKey,
                        });
                        setKey(crypto.randomUUID());
                        setNotice(r.message);
                        await load();
                      });
                    }}
                  >
                    <h3>Prepare a ministry message</h3>
                    <label>
                      Message type
                      <select
                        value={type}
                        onChange={(e) => setType(e.target.value)}
                      >
                        {Object.entries(kinds).map(([v, [label]]) => (
                          <option key={v} value={v}>
                            {label}
                          </option>
                        ))}
                      </select>
                    </label>
                    <p>
                      Recipients must have confirmed WhatsApp consent for{" "}
                      {kinds[type][1]}. Registration-specific messages also need
                      verified event registration mapping before activation.
                    </p>
                    {type === "registration" && (
                      <>
                        <label>
                          Registered event
                          <select
                            required
                            value={eventId}
                            onChange={(e) => setEventId(e.target.value)}
                          >
                            <option value="">Choose upcoming event</option>
                            {(data.events || []).map((e) => (
                              <option key={e.id} value={e.id}>
                                {e.title}
                              </option>
                            ))}
                          </select>
                        </label>
                        <label>
                          Verified subscriber
                          <select
                            required
                            value={subscriptionId}
                            onChange={(e) => setSubscriptionId(e.target.value)}
                          >
                            <option value="">Choose subscriber</option>
                            {data.subscribers
                              .filter(
                                (s) =>
                                  s.status === "active" &&
                                  s.categories.includes("events"),
                              )
                              .map((s) => (
                                <option key={s.id} value={s.id}>
                                  {s.phone}
                                </option>
                              ))}
                          </select>
                        </label>
                        <p>
                          The server checks a confirmed linked email identity
                          against this event registration. A phone number alone
                          cannot establish registration.
                        </p>
                      </>
                    )}
                    <label>
                      Plan title
                      <input
                        required
                        maxLength={160}
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                      />
                    </label>
                    <label>
                      Saved template
                      <select
                        required
                        value={templateId}
                        onChange={(e) => {
                          setTemplateId(e.target.value);
                          setParameters(
                            Array(
                              data.templates.find(
                                (t) => t.id === e.target.value,
                              )?.variable_count || 0,
                            ).fill(""),
                          );
                          setPreview("");
                        }}
                      >
                        <option value="">Choose a template</option>
                        {data.templates.map((t) => (
                          <option value={t.id} key={t.id}>
                            {t.name} · {t.status}
                          </option>
                        ))}
                      </select>
                    </label>
                    {selected && (
                      <p>
                        Template status: {selected.status}. Only verified
                        approved templates may be considered for future
                        delivery.
                      </p>
                    )}
                    {parameters.map((v, i) => (
                      <label key={i}>
                        Variable {i + 1}
                        <textarea
                          required
                          maxLength={1024}
                          rows={3}
                          value={v}
                          onChange={(e) =>
                            setParameters(
                              parameters.map((x, n) =>
                                n === i ? e.target.value : x,
                              ),
                            )
                          }
                        />
                      </label>
                    ))}
                    <label>
                      Planned time (Nigeria, WAT)
                      <input
                        type="datetime-local"
                        required
                        value={planned}
                        onChange={(e) => setPlanned(e.target.value)}
                      />
                    </label>
                    <div className="platform-actions">
                      <button
                        className="secondary-button"
                        type="button"
                        disabled={busy || !templateId}
                        onClick={() =>
                          action(async () => {
                            const r = await api("/preview", {
                              templateId,
                              parameters,
                            });
                            setPreview(r.text);
                          })
                        }
                      >
                        Preview message
                      </button>
                      <button
                        className="ministry-button dark"
                        disabled={busy || !templateId}
                      >
                        Save unsent plan
                      </button>
                    </div>
                  </form>
                  <section className="meeting-action-card">
                    <h3>Preview</h3>
                    <button
                      className="secondary-button"
                      disabled={busy}
                      onClick={() =>
                        action(async () => {
                          const r = await api("/preview/devotional", {});
                          setPreview(r.text);
                          setNotice(r.note);
                        })
                      }
                    >
                      Load today’s full released devotional
                    </button>
                    <p>
                      Full devotional sections are preserved here. Never shorten
                      scripture or silently truncate a manuscript to fit a
                      template. Prepare a reviewed notification with the
                      full-reading link if needed.
                    </p>
                    <pre className="crh-wa-message">
                      {preview ||
                        "Preview a saved template or today’s released devotional."}
                    </pre>
                  </section>
                </div>
              )}
              {data.campaigns.map((c) => (
                <article className="crh-comms-campaign" key={c.id}>
                  <strong>{c.title}</strong>
                  <p>
                    {kinds[c.type]?.[0] || c.type} · {c.status} ·{" "}
                    {new Date(c.planned_at).toLocaleString("en-NG", {
                      timeZone: "Africa/Lagos",
                    })}{" "}
                    WAT
                  </p>
                  <details>
                    <summary>Read saved plan</summary>
                    <pre className="crh-wa-message">{c.text}</pre>
                  </details>
                  {canContacts && (
                    <button
                      className="secondary-button"
                      disabled={busy}
                      onClick={() =>
                        action(async () => {
                          const r = await api(
                            "/campaigns/" + c.id + "/estimate",
                            {},
                          );
                          setNotice(
                            `${r.recipients} consent-eligible recipients. Cost: unknown. Credits: unknown. ${r.reason}`,
                          );
                        })
                      }
                    >
                      Check audience & cost gate
                    </button>
                  )}
                  {canContacts && c.status === "planned" && (
                    <button
                      className="secondary-button"
                      disabled={busy}
                      onClick={() =>
                        action(async () => {
                          await api("/campaigns/" + c.id + "/cancel", {
                            revision: c.revision,
                          });
                          await load();
                        })
                      }
                    >
                      Cancel plan
                    </button>
                  )}
                  <button className="secondary-button" disabled>
                    Sending blocked: free-only policy
                  </button>
                </article>
              ))}
            </>
          )}
          {tab === "subscribers" && (
            <section className="meeting-action-card">
              <h3>WhatsApp subscribers</h3>
              <p>
                Phone ownership is verified through an inbound JOIN message.
                Email consent is independent. Only authorised managers can view
                this masked list.
              </p>
              <div className="crh-comms-report">
                <table>
                  <thead>
                    <tr>
                      <th>Number</th>
                      <th>Status</th>
                      <th>Consent</th>
                      <th>Local time</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.subscribers.map((s) => (
                      <tr key={s.id}>
                        <td>{s.phone}</td>
                        <td>{s.status}</td>
                        <td>{s.categories.join(", ")}</td>
                        <td>
                          {s.delivery_time} {s.timezone}
                        </td>
                        <td>
                          {canContacts && s.status === "active" && (
                            <button
                              className="secondary-button"
                              disabled={busy}
                              onClick={() =>
                                action(async () => {
                                  const r = await api(
                                    "/subscribers/" + s.id + "/stop",
                                    {},
                                  );
                                  setNotice(r.message);
                                  await load();
                                })
                              }
                            >
                              Record opt-out
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {canContacts && (
                <div className="platform-actions">
                  <button
                    className="secondary-button"
                    disabled={offset === 0 || busy}
                    onClick={() => setOffset(Math.max(0, offset - 50))}
                  >
                    Previous
                  </button>
                  <button
                    className="secondary-button"
                    disabled={busy || data.subscribers.length < 50}
                    onClick={() => setOffset(offset + 50)}
                  >
                    Next
                  </button>
                </div>
              )}
            </section>
          )}
          {tab === "reports" && (
            <section className="meeting-action-card">
              <h3>Delivery & campaign performance</h3>
              <p>{data.scope}</p>
              <p>
                Submitted is provider acceptance. Delivered and read require
                signed Meta callbacks. Uncertain attempts require
                reconciliation; do not blindly retry.
              </p>
              <div className="crh-comms-report">
                <table>
                  <thead>
                    <tr>
                      <th>Campaign</th>
                      <th>Status</th>
                      <th>Submitted</th>
                      <th>Delivered</th>
                      <th>Read</th>
                      <th>Diagnostic</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.jobs.map((j) => (
                      <tr key={j.id}>
                        <td>
                          {data.campaigns.find((c) => c.id === j.campaign_id)
                            ?.title || j.campaign_id}
                        </td>
                        <td>{j.status}</td>
                        <td>{j.submitted_at || "—"}</td>
                        <td>{j.delivered_at || "—"}</td>
                        <td>{j.read_at || "—"}</td>
                        <td>{j.error_code || "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          )}
          {tab === "setup" && (
            <section className="meeting-action-card">
              <h3>Official connection checklist</h3>
              <p>
                Connection:{" "}
                {data.config.configured
                  ? "Credentials present; complete live verification"
                  : "Awaiting Meta setup"}
                . Broadcast delivery remains blocked even when credentials are
                present.
              </p>
              <p>
                Missing server settings:{" "}
                {data.config.missing.join(", ") || "none"}. Never paste
                credentials into a template or campaign.
              </p>
              <ol>
                <li>
                  Use a Meta business portfolio and WhatsApp Business Platform
                  app.
                </li>
                <li>
                  Register and verify the ministry number; preserve the existing
                  WhatsApp app unless Meta approves a supported migration or
                  coexistence.
                </li>
                <li>
                  Store the official server credentials in Render. Configure the
                  signed webhook for messages and template status updates.
                </li>
                <li>
                  Use Meta’s test number and authorised test recipient to
                  validate ownership, delivery, STOP and failure handling before
                  any future activation.
                </li>
                <li>
                  Approve accurate templates and independently verify pricing
                  and balance. Paid bulk sending needs a separate owner decision
                  and implementation review.
                </li>
              </ol>
              <p>
                Daily, service and event automation is prepared as planning
                logic. Real recurring broadcasts and registration-specific sends
                remain inactive pending provider tests, event mapping and the
                cost decision.
              </p>
            </section>
          )}
        </>
      )}
    </section>
  );
}
