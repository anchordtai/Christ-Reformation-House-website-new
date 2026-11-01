const { test, before, beforeEach, afterEach, after } = require("node:test"),
  assert = require("node:assert/strict"),
  fs = require("node:fs"),
  path = require("node:path"),
  { JSDOM } = require("jsdom"),
  { buildSync } = require("esbuild");
const React = require("react"),
  { act } = React,
  { createRoot } = require("react-dom/client"),
  { Simulate } = require("react-dom/test-utils"),
  { MemoryRouter } = require("react-router-dom");
let root, node, dom, Welcome, Ribbon, lib, reduced, clock;
const realNow = Date.now,
  temp = fs.mkdtempSync(path.join(process.cwd(), ".november-test-"));
before(async () => {
  dom = new JSDOM("<!doctype html><body></body>", {
    url: "https://church.example/",
  });
  global.window = dom.window;
  global.document = dom.window.document;
  global.IS_REACT_ACT_ENVIRONMENT = true;
  window.matchMedia = () => ({
    matches: reduced,
    addEventListener() {},
    removeEventListener() {},
  });
  const out = path.join(temp, "welcome.cjs");
  buildSync({
    entryPoints: ["src/components/NovemberWelcome.jsx"],
    outfile: out,
    bundle: true,
    platform: "node",
    format: "cjs",
    jsx: "automatic",
    loader: { ".css": "empty" },
    external: ["react", "react-dom", "react-dom/*", "react-router-dom"],
  });
  const m = require(out);
  Welcome = m.default;
  Ribbon = m.NovemberThemeRibbon;
  lib = await import("../src/utils/november-campaign.mjs");
});
beforeEach(() => {
  clock = Date.parse("2026-11-01T00:00:00Z");
  Date.now = () => clock;
  reduced = false;
  Object.defineProperty(document, "visibilityState", {
    configurable: true,
    value: "visible",
  });
  node = document.createElement("div");
  document.body.append(node);
  root = createRoot(node);
});
afterEach(async () => {
  await act(async () => root.unmount());
  node.remove();
  Date.now = realNow;
});
after(() => {
  fs.rmSync(temp, { recursive: true, force: true });
  dom.window.close();
});
const render = async (Component = Welcome, route = "/") =>
  act(async () =>
    root.render(
      React.createElement(
        MemoryRouter,
        { initialEntries: [route] },
        React.createElement(Component, {
          fallback: React.createElement("p", null, "Standard ministry welcome"),
        }),
      ),
    ),
  );
const click = async (label) =>
  act(async () =>
    Simulate.click(node.querySelector(`[aria-label="${label}"]`)),
  );
const image = () => node.querySelector(".november-banner-frame img");
test("campaign follows exact Lagos month boundaries and never leaks onto private or checkout routes", () => {
  assert.equal(
    lib.isNovemberCampaign(Date.parse("2026-10-31T22:59:59Z")),
    false,
  );
  assert.equal(
    lib.isNovemberCampaign(Date.parse("2026-10-31T23:00:00Z")),
    true,
  );
  assert.equal(
    lib.isNovemberCampaign(Date.parse("2026-11-30T22:59:59Z")),
    true,
  );
  assert.equal(
    lib.isNovemberCampaign(Date.parse("2026-11-30T23:00:00Z")),
    false,
  );
  for (const route of [
    "/admin/blog",
    "/donate",
    "/donate/return",
    "/store",
    "/meetings/room/test",
  ])
    assert.equal(lib.novemberRibbonPath(route), false);
  assert.equal(lib.novemberRibbonPath("/devotional/2026-11-01"), true);
});
test("all three real banners have accessible references and downloadable social images", async () => {
  await render();
  assert.match(image().alt, /Anchord Taiwo/);
  assert.equal(node.querySelectorAll("h1").length, 1);
  for (const b of lib.novemberBanners) {
    assert.ok(fs.existsSync("public" + b.image));
    assert.ok(fs.existsSync("public" + b.social));
    assert.ok(b.reference);
  }
  assert.equal(
    node.querySelector('a[href="/november"]').textContent.includes("theme"),
    true,
  );
});
test("arrows, dots and keyboard navigation select every banner and wrap safely", async () => {
  await render();
  await click("Next November banner");
  assert.match(image().src, /banner-2/);
  await act(async () =>
    Simulate.keyDown(node.querySelector("section"), {
      key: "ArrowRight",
      preventDefault() {},
    }),
  );
  assert.match(image().src, /banner-3/);
  await click("Next November banner");
  assert.match(image().src, /banner-1/);
  await click("Previous November banner");
  assert.match(image().src, /banner-3/);
  await click("Show November banner 2: The Lord provides");
  assert.match(image().src, /banner-2/);
});
test("autoplay pauses for user interaction and resumes only on play", async (c) => {
  c.mock.timers.enable({ apis: ["setInterval"] });
  try {
    await render();
    await act(async () => c.mock.timers.tick(9000));
    assert.match(image().src, /banner-2/);
    await click("Pause November slideshow");
    await act(async () => c.mock.timers.tick(18000));
    assert.match(image().src, /banner-2/);
    await click("Play November slideshow");
    await act(async () => c.mock.timers.tick(9000));
    assert.match(image().src, /banner-3/);
  } finally {
    c.mock.timers.reset();
  }
});
test("reduced motion, focus and hidden tabs prevent automatic movement", async (c) => {
  c.mock.timers.enable({ apis: ["setInterval"] });
  try {
    reduced = true;
    await render();
    await act(async () => c.mock.timers.tick(18000));
    assert.match(image().src, /banner-1/);
    assert.equal(
      node.querySelector('[aria-label="Pause November slideshow"]'),
      null,
    );
    await click("Next November banner");
    assert.match(image().src, /banner-2/);
  } finally {
    c.mock.timers.reset();
  }
});
test("horizontal swipes navigate, while vertical reading gestures leave the slide alone", async () => {
  await render();
  const el = node.querySelector("section");
  await act(async () => {
    Simulate.touchStart(el, { touches: [{ clientX: 300, clientY: 100 }] });
    Simulate.touchEnd(el, { changedTouches: [{ clientX: 80, clientY: 110 }] });
  });
  assert.match(image().src, /banner-2/);
  await act(async () => {
    Simulate.touchStart(el, { touches: [{ clientX: 200, clientY: 100 }] });
    Simulate.touchEnd(el, { changedTouches: [{ clientX: 190, clientY: 350 }] });
  });
  assert.match(image().src, /banner-2/);
});
test("a failed image retains readable theme and scripture with a retry control", async () => {
  await render();
  await act(async () => Simulate.error(image()));
  assert.match(node.textContent, /Bible text is available below/);
  assert.match(node.textContent, /Philippians 4:19/);
  assert.ok(node.querySelector('[aria-label="Play November slideshow"]'));
});
test("month expiry restores the original welcome without a page reload", async (c) => {
  c.mock.timers.enable({ apis: ["setInterval"] });
  try {
    await render();
    clock = lib.NOVEMBER_END;
    await act(async () => c.mock.timers.tick(60000));
    assert.match(node.textContent, /Standard ministry welcome/);
    assert.equal(image(), null);
  } finally {
    c.mock.timers.reset();
  }
});
test("supporting pages receive a compact theme link", async () => {
  await render(Ribbon, "/blog");
  assert.ok(node.querySelector('a[href="/november"]'));
  assert.match(node.textContent, /Supernatural Provision/);
});
test("hover, keyboard focus and backgrounding each suspend rotation", async (c) => {
  c.mock.timers.enable({ apis: ["setInterval"] });
  try {
    await render();
    const el = node.querySelector("section");
    await act(async () => Simulate.mouseEnter(el));
    await act(async () => c.mock.timers.tick(18000));
    assert.match(image().src, /banner-1/);
    await act(async () => Simulate.mouseLeave(el));
    await act(async () => c.mock.timers.tick(9000));
    assert.match(image().src, /banner-2/);
    await act(async () => Simulate.focus(node.querySelector("a")));
    await act(async () => c.mock.timers.tick(18000));
    assert.match(image().src, /banner-2/);
    await click("Play November slideshow");
    await act(async () => {
      Object.defineProperty(document, "visibilityState", {
        configurable: true,
        value: "hidden",
      });
      document.dispatchEvent(new window.Event("visibilitychange"));
    });
    await act(async () => c.mock.timers.tick(18000));
    assert.match(image().src, /banner-2/);
  } finally {
    c.mock.timers.reset();
  }
});
