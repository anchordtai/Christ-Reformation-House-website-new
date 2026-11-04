const { test, before, beforeEach, afterEach, after } = require("node:test"),
  assert = require("node:assert/strict"),
  fs = require("node:fs"),
  path = require("node:path");
const { JSDOM } = require("jsdom"),
  { build } = require("esbuild");
const dom = new JSDOM("<html><head></head><body></body></html>", {
  url:
    "https://www.christreformationhouse.org.ng/subscribe/whatsapp#token=" +
    "a".repeat(64),
});
Object.assign(global, {
  window: dom.window,
  document: dom.window.document,
  IS_REACT_ACT_ENVIRONMENT: true,
});
Object.defineProperty(global, "navigator", {
  value: dom.window.navigator,
  configurable: true,
});
const React = require("react"),
  { act } = React,
  { createRoot } = require("react-dom/client"),
  { Simulate } = require("react-dom/test-utils"),
  { MemoryRouter } = require("react-router-dom");
let Signup, Preferences, Desk, root, node, calls, configured;
const temp = fs.mkdtempSync(path.join(process.cwd(), ".whatsapp-test-"));
before(async () => {
  const plugin = {
    name: "fixtures",
    setup(b) {
      b.onResolve({ filter: /services\/communications$/ }, () => ({
        path: "api",
        namespace: "fixture",
      }));
      b.onResolve({ filter: /FormVerification$/ }, () => ({
        path: "bot",
        namespace: "fixture",
      }));
      b.onLoad({ filter: /.*/, namespace: "fixture" }, (a) => ({
        contents:
          a.path === "bot"
            ? `import {useEffect} from 'react';export default function Bot({onReady,onToken}){useEffect(()=>{onReady(true);onToken('fixture')},[]);return null}`
            : `export const publicCommunication=(...a)=>globalThis.__wa(...a);export const staffCommunication=(...a)=>globalThis.__wa('STAFF',...a);export const communicationError=e=>e.message;`,
      }));
    },
  };
  for (const [name, file] of [
    ["Signup", "src/components/WhatsAppSignup.jsx"],
    ["Desk", "src/components/WhatsAppDesk.jsx"],
  ])
    await build({
      entryPoints: [file],
      outfile: path.join(temp, name + ".cjs"),
      bundle: true,
      platform: "node",
      format: "cjs",
      jsx: "automatic",
      loader: { ".css": "empty" },
      external: ["react", "react-dom", "react-router-dom"],
      plugins: [plugin],
    });
  const m = require(path.join(temp, "Signup.cjs"));
  Signup = m.default;
  Preferences = m.WhatsAppPreferences;
  Desk = require(path.join(temp, "Desk.cjs")).default;
});
beforeEach(() => {
  calls = [];
  configured = false;
  globalThis.__wa = async (...a) => {
    calls.push(a);
    if (a[0] === "whatsapp/config") return { subscriptionReady: configured };
    if (a[0] === "whatsapp/preferences/read")
      return {
        status: "active",
        phone: "•••0001",
        categories: ["devotional"],
        delivery_time: "06:00",
        timezone: "Africa/Lagos",
      };
    if (a[0] === "STAFF")
      return {
        config: {
          reason: "Free-only policy",
          configured: false,
          missing: ["WHATSAPP_ACCESS_TOKEN"],
        },
        templates: [],
        campaigns: [],
        subscribers: [],
        jobs: [],
        metrics: {
          total: 0,
          active: 0,
          submitted: 0,
          delivered: 0,
          read: 0,
          failed: 0,
        },
      };
    return { message: "Fixture saved" };
  };
  node = document.createElement("div");
  document.body.append(node);
  root = createRoot(node);
});
afterEach(async () => {
  await act(async () => root.unmount());
  node.remove();
});
after(() => {
  fs.rmSync(temp, { recursive: true, force: true });
  dom.window.close();
});
async function render(Component, props = {}) {
  await act(async () =>
    root.render(
      React.createElement(
        MemoryRouter,
        null,
        React.createElement(Component, props),
      ),
    ),
  );
}
const button = (text) =>
  [...node.querySelectorAll("button")].find((b) =>
    b.textContent.includes(text),
  );
test("WhatsApp setup gate prevents phone collection and explicitly separates consent", async () => {
  await render(Signup);
  assert.ok(node.querySelector("fieldset").disabled);
  assert.equal(button("Verify my WhatsApp").disabled, true);
  assert.match(
    node.textContent,
    /Joining never subscribes you to email or SMS/,
  );
  assert.match(node.textContent, /No phone number is collected/);
  assert.equal(
    node.querySelector("input[type=checkbox][required]").checked,
    false,
  );
  assert.equal(calls.length, 1);
});
test("WhatsApp consent is unchecked even when connection ready; timezone/time defaults are visible", async () => {
  configured = true;
  await render(Signup);
  assert.equal(node.querySelector("fieldset").disabled, false);
  assert.equal(node.querySelector("input[type=time]").value, "06:00");
  assert.equal(node.querySelector("input[list]").value, "Africa/Lagos");
  assert.equal(button("Verify my WhatsApp").disabled, true);
  assert.equal(node.querySelector("input[type=email]"), null);
});
test("private WhatsApp preference URL is scrubbed and does nothing until explicit action", async () => {
  window.history.replaceState(
    null,
    "",
    "/subscribe/whatsapp#token=" + "a".repeat(64),
  );
  await render(Preferences);
  assert.equal(calls.length, 0);
  assert.equal(window.location.hash, "");
  await act(async () => Simulate.click(button("Load my WhatsApp")));
  assert.equal(calls[0][0], "whatsapp/preferences/read");
  assert.equal(calls[0][1].token, "a".repeat(64));
  await act(async () => Simulate.click(button("Stop WhatsApp")));
  assert.equal(calls[1][0], "whatsapp/preferences");
  assert.equal(calls[1][1].unsubscribe, true);
});
test("staff WhatsApp dashboard reports unknown costs rather than fake zero balances", async () => {
  await render(Desk, { role: "viewer" });
  assert.match(node.textContent, /Available credits: unknown/);
  assert.match(node.textContent, /planned time does not schedule delivery/);
  assert.match(node.textContent, /no confirmed deliveries/);
  await act(async () => Simulate.click(button("Templates")));
  assert.equal(button("Save local template"), undefined);
  assert.equal(button("Reconcile Meta"), undefined);
});
