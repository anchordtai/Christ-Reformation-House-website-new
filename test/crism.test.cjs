const { test, before, after, beforeEach, afterEach } = require("node:test");
const assert = require("node:assert/strict"),
  fs = require("node:fs"),
  path = require("node:path");
const { JSDOM } = require("jsdom"),
  { build } = require("esbuild");
const dom = new JSDOM(
  "<html><head><title>Church</title></head><body></body></html>",
  { url: "https://church.example/crism" },
);
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
  { MemoryRouter, Routes, Route } = require("react-router-dom"),
  { Simulate } = require("react-dom/test-utils");
const temp = fs.mkdtempSync(path.join(process.cwd(), ".crism-test-"));
let View, root, node;
const axios=require('axios'),oldAdapter=axios.defaults.adapter;
axios.defaults.adapter=async config=>({status:200,statusText:'OK',headers:{},config,data:config.url.endsWith('/fees')?{equivalents:[{currency:'NGN',amount_minor:2250000,application:{amount_minor:250000},tuition:{amount_minor:2000000}}]}:{programmes:[],intakes:[]}});
before(async () => {
  const out = path.join(temp, "view.cjs");
  await build({
    entryPoints: ["src/crism/Crism.jsx"],
    outfile: out,
    bundle: true,
    format: "cjs",
    platform: "node",
    jsx: "automatic",
    loader: { ".css": "empty" },
    define: {"import.meta.env":JSON.stringify({PROD:false,VITE_API_URL:""})},
    external: ["react", "react-dom", "react-router-dom", "axios"],
  });
  View = require(out).default;
});
after(() => {
  fs.rmSync(temp, { recursive: true, force: true });
  axios.defaults.adapter=oldAdapter;
  dom.window.close();
});
beforeEach(() => {
  node = document.createElement("div");
  document.body.append(node);
  root = createRoot(node);
});
afterEach(async () => {
  await act(async () => root.unmount());
  node.remove();
});
const render = async (route) =>
  act(async () =>
    root.render(
      React.createElement(
        MemoryRouter,
        {
          initialEntries: [route],
          future: { v7_startTransition: true, v7_relativeSplatPath: true },
        },
        React.createElement(
          Routes,
          null,
          React.createElement(Route, {
            path: "/crism/*",
            element: React.createElement(View),
          }),
        ),
      ),
    ),
  );
const heading = () => node.querySelector("h1").textContent;
const byLabel = (t) =>
  [...node.querySelectorAll("label")]
    .find((l) => l.firstChild.textContent === t)
    ?.querySelector("input,select");
const change = async (el, value) =>
  act(async () => Simulate.change(el, { target: { value } }));
test("institution homepage has its own identity, affiliation and honest opening status", async () => {
  await render("/crism");
  assert.match(heading(), /Rooted in the Word/);
  assert.match(node.textContent, /Admissions: 10 December 2026/);
  assert.match(node.textContent, /Six proposed schools/);
  assert.equal(node.querySelectorAll(".crism-school").length, 6);
  assert.equal(node.querySelector('a[href="/crism/student"]'), null);
  assert.equal(node.querySelector('button[type="submit"]'), null);
});
test("programme search and filters work together and retain detail links", async () => {
  await render("/crism/programmes");
  assert.equal(node.querySelectorAll(".crism-programme").length, 21);
  await change(byLabel("Find a programme"), "theology");
  assert.equal(node.querySelectorAll(".crism-programme").length, 2);
  await change(byLabel("Qualification type"), "Diploma");
  assert.equal(node.querySelectorAll(".crism-programme").length, 1);
  assert.match(
    node.querySelector(".crism-programme").getAttribute("href"),
    /diploma-in-theology$/,
  );
});
test("school filter in a shared URL scopes the catalogue without inventing a result", async () => {
  await render("/crism/programmes?school=missions-evangelism");
  assert.equal(node.querySelectorAll(".crism-programme").length, 1);
  assert.match(
    node.querySelector(".crism-programme").textContent,
    /Evangelism and Missions/,
  );
});
test("empty search has a working clear control", async () => {
  await render("/crism/programmes?q=no-such-programme");
  assert.equal(node.querySelectorAll(".crism-programme").length, 0);
  const b = [...node.querySelectorAll("button")].find(
    (b) => b.textContent === "Clear filters",
  );
  await act(async () => Simulate.click(b));
  assert.equal(node.querySelectorAll(".crism-programme").length, 21);
});
test("each school detail has its real proposed course areas", async () => {
  await render("/crism/schools/biblical-studies");
  assert.match(heading(), /School of Biblical Studies/);
  assert.match(node.textContent, /Biblical Interpretation and Hermeneutics/);
  assert.equal(
    node
      .querySelector('a[href="/crism/programmes?school=biblical-studies"]')
      .textContent.includes("View related programmes"),
    true,
  );
});
test("programme detail labels unconfirmed curriculum and does not collect fees", async () => {
  await render("/crism/programmes/diploma-in-theology");
  assert.equal(heading(), "Diploma in Theology");
  assert.match(node.textContent, /does not accept applications or payments/);
  assert.match(node.textContent, /no claim of university accreditation/);
  assert.equal(node.querySelector('input[type="file"]'), null);
});
test("unknown school/programme is not replaced by a different catalogue record", async () => {
  await render("/crism/programmes/unknown");
  assert.equal(heading(), "Let’s find your way.");
  assert.ok(node.querySelector('a[href="/crism"]'));
});
test("mobile navigation exposes its state and closes after route navigation", async () => {
  await render("/crism");
  const b = node.querySelector('[aria-controls="crism-navigation"]');
  await act(async () => Simulate.click(b));
  assert.equal(b.getAttribute("aria-expanded"), "true");
  await act(async () =>
    Simulate.click(
      node.querySelector('#crism-navigation a[href="/crism/about"]'),
      { button: 0 },
    ),
  );
  assert.equal(heading(), "Meet CRISM.");
  assert.equal(b.getAttribute("aria-expanded"), "false");
});
test("contact handoff uses the existing ministry inbox and warns against private uploads", async () => {
  await render("/crism/contact");
  assert.ok(node.querySelector('a[href="/contact"]'));
  assert.match(node.textContent, /do not send passports/);
  assert.ok(
    node.querySelector('a[href^="mailto:admissions@christreformationhouse.org.ng"]'),
  );
  assert.equal(node.querySelector("form"), null);
});
test("admissions shows approved window, fees and a real portal link while draft curricula stay gated", async () => {
  await render("/crism/admissions");
  assert.match(node.textContent, /10 December 2026–10 January 2027/);
  assert.match(node.textContent, /2,500/);
  assert.ok(node.querySelector('a[href="/crism/portal"]'));
  assert.match(node.textContent,/Degree admissions remain closed/);
  assert.equal(node.querySelectorAll('.school-grid:last-of-type .school-card').length,12);
});
