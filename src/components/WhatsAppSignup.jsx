import { useEffect, useId, useState } from "react";
import { Link } from "react-router-dom";
import { MessageCircle, ArrowRight, ShieldCheck } from "lucide-react";
import FormVerification from "./FormVerification";
import {
  publicCommunication,
  communicationError,
} from "../services/communications";
const zones = [
  "Africa/Lagos",
  "Africa/Accra",
  "Africa/Nairobi",
  "Africa/Johannesburg",
  "Europe/London",
  "Europe/Paris",
  "America/New_York",
  "America/Chicago",
  "America/Los_Angeles",
  "Asia/Dubai",
  "Asia/Kolkata",
  "Australia/Sydney",
  "Pacific/Auckland",
];
export default function WhatsAppSignup({ emailManageToken = "" }) {
  const id = useId(),
    [config, setConfig] = useState(null),
    [form, setForm] = useState({
      name: "",
      phone: "",
      countryCode: "+234",
      categories: ["devotional"],
      whatsappConsent: false,
      time: "06:00",
      timezone: "Africa/Lagos",
      website: "",
    }),
    [ready, setReady] = useState(false),
    [verificationToken, setToken] = useState(""),
    [reset, setReset] = useState(0),
    [busy, setBusy] = useState(false),
    [result, setResult] = useState(null),
    [error, setError] = useState("");
  useEffect(() => {
    let active = true;
    publicCommunication("whatsapp/config")
      .then((r) => active && setConfig(r))
      .catch(() => active && setConfig({ subscriptionReady: false }));
    return () => {
      active = false;
    };
  }, []);
  async function submit(e) {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      setResult(
        await publicCommunication("whatsapp/subscribe", {
          ...form,
          verificationToken,
          emailManageToken,
        }),
      );
    } catch (e) {
      setError(communicationError(e));
    } finally {
      setBusy(false);
      setReset((v) => v + 1);
    }
  }
  const disabled = !config?.subscriptionReady;
  return (
    <section
      className="crh-comms-signup crh-wa-signup dev-no-print"
      aria-labelledby={id + "title"}
    >
      <div className="crh-comms-intro">
        <MessageCircle size={32} />
        <p className="ministry-eyebrow">Faith for your everyday life</p>
        <h2 id={id + "title"}>
          Your devotional.
          <br />
          Your WhatsApp.
        </h2>
        <p>
          Choose daily inspiration from UNLEASH THE SUPERNATURAL and the
          ministry updates that matter to you.
        </p>
        <p>
          <ShieldCheck size={18} /> WhatsApp has its own consent. Joining never
          subscribes you to email or SMS.
        </p>
        <p>
          Default delivery preference: 6:00 a.m. Nigeria time. Choose a local
          time and time zone. Delivery is subject to provider approval and
          availability.
        </p>
        <Link to="/communication-privacy">
          Your privacy and choices <ArrowRight size={15} />
        </Link>
        {disabled && (
          <div className="crh-wa-callout" role="status">
            <strong>WhatsApp connection is being prepared</strong>
            <p>
              Automatic WhatsApp broadcasts are paused under our free-only
              policy. No phone number is collected until official number
              verification is connected. You can read the devotional online or
              subscribe by email now.
            </p>
          </div>
        )}
      </div>
      <form className="meeting-action-card" onSubmit={submit}>
        <fieldset disabled={disabled || busy || !!result}>
          <legend>Choose WhatsApp updates</legend>
          <label htmlFor={id + "name"}>
            Full name
            <input
              id={id + "name"}
              required
              maxLength={100}
              autoComplete="name"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
          </label>
          <div className="crh-wa-phone">
            <label htmlFor={id + "code"}>
              Country code
              <input
                id={id + "code"}
                type="tel"
                required
                pattern="\+[1-9][0-9]{0,2}"
                maxLength={4}
                value={form.countryCode}
                onChange={(e) =>
                  setForm({ ...form, countryCode: e.target.value })
                }
              />
            </label>
            <label htmlFor={id + "phone"}>
              WhatsApp number
              <input
                id={id + "phone"}
                type="tel"
                required
                maxLength={25}
                autoComplete="tel-national"
                placeholder="813 000 0000"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
              />
            </label>
          </div>
          <label htmlFor={id + "time"}>
            Preferred local delivery time
            <input
              id={id + "time"}
              type="time"
              required
              value={form.time}
              onChange={(e) => setForm({ ...form, time: e.target.value })}
            />
          </label>
          <label htmlFor={id + "zone"}>
            Time zone
            <input
              id={id + "zone"}
              list={id + "zones"}
              required
              maxLength={80}
              value={form.timezone}
              onChange={(e) => setForm({ ...form, timezone: e.target.value })}
            />
            <datalist id={id + "zones"}>
              {zones.map((z) => (
                <option key={z} value={z} />
              ))}
            </datalist>
          </label>
          {[
            ["devotional", "Daily devotional"],
            ["events", "Events & programmes"],
            ["services", "Sunday & midweek service reminders"],
            ["newsletter", "Important ministry updates"],
          ].map(([v, l]) => (
            <label className="crh-comms-check" key={v}>
              <input
                type="checkbox"
                checked={form.categories.includes(v)}
                onChange={(e) =>
                  setForm({
                    ...form,
                    categories: e.target.checked
                      ? [...form.categories, v]
                      : form.categories.filter((c) => c !== v),
                  })
                }
              />
              {l}
            </label>
          ))}
          <label className="crh-comms-check">
            <input
              type="checkbox"
              required
              checked={form.whatsappConsent}
              onChange={(e) =>
                setForm({ ...form, whatsappConsent: e.target.checked })
              }
            />
            I agree to receive my selected WhatsApp updates from Christ’s
            Reformation House International Inc. I can reply STOP at any time.
          </label>
        </fieldset>
        <div className="crh-comms-honey" aria-hidden="true">
          <label>
            Website
            <input
              tabIndex={-1}
              autoComplete="off"
              value={form.website}
              onChange={(e) => setForm({ ...form, website: e.target.value })}
            />
          </label>
        </div>
        {!disabled && !result && (
          <FormVerification
            action="subscribe"
            onReady={setReady}
            onToken={setToken}
            resetKey={reset}
          />
        )}
        <button
          className="ministry-button dark"
          disabled={
            disabled ||
            busy ||
            !ready ||
            !form.whatsappConsent ||
            !form.categories.length ||
            !!result
          }
        >
          {busy ? "Preparing verification…" : "Verify my WhatsApp number"}
          <ArrowRight size={16} />
        </button>
        {result && (
          <div role="status">
            <p>{result.message}</p>
            {result.joinUrl && (
              <a
                className="ministry-button dark"
                href={result.joinUrl}
                target="_blank"
                rel="noopener noreferrer"
              >
                Send my JOIN verification
              </a>
            )}
            {result.manageUrl && (
              <p>
                <a href={result.manageUrl}>Keep my private preference link</a>.
                Use it after sending JOIN; do not share it.
              </p>
            )}
          </div>
        )}
        {error && <p role="alert">{error}</p>}
      </form>
    </section>
  );
}
export function WhatsAppPreferences() {
  const [token] = useState(
      () =>
        new URLSearchParams(window.location.hash.slice(1)).get("token") || "",
    ),
    [data, setData] = useState(null),
    [form, setForm] = useState({
      categories: ["devotional"],
      time: "06:00",
      timezone: "Africa/Lagos",
    }),
    [error, setError] = useState(""),
    [notice, setNotice] = useState(""),
    [busy, setBusy] = useState(false);
  useEffect(() => {
    window.history.replaceState(null, "", window.location.pathname);
  }, []);
  async function read() {
    setBusy(true);
    setError("");
    try {
      const r = await publicCommunication("whatsapp/preferences/read", {
        token,
      });
      setData(r);
      if (r.status !== "pending")
        setForm({
          categories: r.categories,
          time: r.delivery_time,
          timezone: r.timezone,
        });
    } catch (e) {
      setError(communicationError(e));
    } finally {
      setBusy(false);
    }
  }
  async function save(unsubscribe) {
    setBusy(true);
    setError("");
    try {
      const r = await publicCommunication("whatsapp/preferences", {
        token,
        ...form,
        unsubscribe,
      });
      setNotice(r.message);
      await read();
    } catch (e) {
      setError(communicationError(e));
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="ministry-section crh-comms-manage">
      <article className="meeting-action-card">
        <h1>Your WhatsApp choices</h1>
        <p>
          WhatsApp preferences are separate from email. Opening this page never
          subscribes or unsubscribes you.
        </p>
        {!token ? (
          <p>
            Use the private preference link saved when you requested WhatsApp
            updates. You can also send STOP to the ministry on WhatsApp.
          </p>
        ) : (
          <>
            <button className="secondary-button" disabled={busy} onClick={read}>
              Load my WhatsApp preferences
            </button>
            {data && (
              <>
                <p>
                  {data.phone} · {data.status}
                </p>
                {data.status === "pending" ? (
                  <p>
                    Send the JOIN verification from your own WhatsApp number,
                    then load again.
                  </p>
                ) : (
                  data.status === "active" && (
                    <>
                      <fieldset>
                        <legend>WhatsApp updates</legend>
                        {[
                          ["devotional", "Daily devotional"],
                          ["events", "Events"],
                          ["services", "Service reminders"],
                          ["newsletter", "Ministry updates"],
                        ].map(([v, l]) => (
                          <label className="crh-comms-check" key={v}>
                            <input
                              type="checkbox"
                              checked={form.categories.includes(v)}
                              onChange={(e) =>
                                setForm({
                                  ...form,
                                  categories: e.target.checked
                                    ? [...form.categories, v]
                                    : form.categories.filter((x) => x !== v),
                                })
                              }
                            />
                            {l}
                          </label>
                        ))}
                      </fieldset>
                      <label>
                        Local delivery time
                        <input
                          type="time"
                          value={form.time}
                          onChange={(e) =>
                            setForm({ ...form, time: e.target.value })
                          }
                        />
                      </label>
                      <label>
                        Time zone
                        <input
                          value={form.timezone}
                          onChange={(e) =>
                            setForm({ ...form, timezone: e.target.value })
                          }
                        />
                      </label>
                      <div className="platform-actions">
                        <button
                          className="ministry-button dark"
                          disabled={busy || !form.categories.length}
                          onClick={() => save(false)}
                        >
                          Save WhatsApp choices
                        </button>
                        <button
                          className="secondary-button"
                          disabled={busy}
                          onClick={() => save(true)}
                        >
                          Stop WhatsApp updates
                        </button>
                      </div>
                    </>
                  )
                )}
              </>
            )}
          </>
        )}
        {notice && <p role="status">{notice}</p>}
        {error && <p role="alert">{error}</p>}
        <Link to="/devotional">Read today’s devotional</Link>
      </article>
    </section>
  );
}
