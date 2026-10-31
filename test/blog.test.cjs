const { test, before, beforeEach, afterEach, after } = require("node:test"),
  assert = require("node:assert/strict"),
  fs = require("node:fs"),
  path = require("node:path");
const { JSDOM } = require("jsdom"),
  { build } = require("esbuild");
const dom = new JSDOM("<html><head></head><body></body></html>", {
  url: "https://church.example/blog",
  pretendToBeVisual: true,
});
global.window = dom.window;
global.document = dom.window.document;
global.navigator = dom.window.navigator;
global.localStorage = dom.window.localStorage;
global.sessionStorage = dom.window.sessionStorage;
global.IS_REACT_ACT_ENVIRONMENT = true;
const React = require("react"),
  { act } = React,
  { createRoot } = require("react-dom/client"),
  { Simulate } = require("react-dom/test-utils"),
  { MemoryRouter, Routes, Route } = require("react-router-dom");
const temp = fs.mkdtempSync(path.join(process.cwd(), ".blog-test-"));
let components = {},
  root,
  node,
  calls,
  handlers,
  signed = false;
const id = "11111111-1111-4111-8111-111111111111",
  post = {
    id,
    slug: "test-article",
    revision: 1,
    title: "Test article",
    excerpt: "A test introduction",
    body: "First paragraph.\n\n<script>bad</script>",
    author: "Test author",
    category: "Teaching",
    tags: ["Faith"],
    cover_id: "22222222-2222-4222-8222-222222222222",
    cover_alt: "Test cover",
    status: "draft",
    publish_at: null,
  };
before(async () => {
  for (const [name, file] of Object.entries({
    List: "src/pages/Blog.jsx",
    Post: "src/pages/BlogPost.jsx",
    Desk: "src/pages/BlogEditor.jsx",
    Community: "src/components/BlogCommunity.jsx",
  })) {
    const out = path.join(temp, name + ".cjs");
    await build({
      entryPoints: [file],
      outfile: out,
      bundle: true,
      platform: "node",
      format: "cjs",
      jsx: "automatic",
      loader: { ".css": "empty" },
      define: { "import.meta.env": "{}" },
      external: [
        "react",
        "react-dom",
        "react-dom/*",
        "react-router-dom",
        "axios",
      ],
      plugins: [
        {
          name: "blog-fixture",
          setup(b) {
            b.onResolve({ filter: /services\/blog$/ }, () => ({
              path: "service",
              namespace: "fixture",
            }));
            b.onResolve(
              { filter: /components\/FormVerification$|\.\/FormVerification$/ },
              () => ({ path: "verification", namespace: "fixture" }),
            );
            b.onResolve({ filter: /components\/StaffAccess$/ }, () => ({
              path: "staff",
              namespace: "fixture",
            }));
            b.onLoad({ filter: /.*/, namespace: "fixture" }, (args) => ({
              contents:
                args.path === "verification"
                  ? `import {useEffect} from 'react';export default function Verification({onReady,onToken}){useEffect(()=>{onReady(true);onToken('fixture-token')},[]);return null}`
                  : args.path === "staff"
                    ? `import React from 'react';export default function Staff({children}){return globalThis.__blogSigned?children:React.createElement('p',null,'Staff sign in')}`
                    : `export const blogError=e=>e.message;export const blogDate=d=>'Lagos date';export const blogImage=id=>'/image/'+id;export const blogUrl=slug=>'https://www.christreformationhouse.org.ng/blog/'+slug;${["blogList", "blogPost", "blogCommunity", "blogInteract", "blogDesk", "blogSave", "blogUpload", "blogPrivateImage", "blogModeration", "blogModerate", "blogAI"].map((n) => `export const ${n}=(...a)=>globalThis.__blog('${n}',...a);`).join("")}`,
              loader: "js",
            }));
          },
        },
      ],
    });
    components[name] = require(out).default;
  }
});
beforeEach(() => {
  node = document.createElement("div");
  document.body.append(node);
  root = createRoot(node);
  localStorage.clear();
  sessionStorage.clear();
  calls = [];
  globalThis.__blogSigned = false;
  handlers = {
    blogList: async () => ({ posts: [], has_more: false }),
    blogPost: async () => ({ ...post, publish_at: "2026-01-01T00:00:00Z" }),
    blogCommunity: async () => ({ likes: 0, comments: [], has_more: false }),
    blogDesk: async () => ({ posts: [post], ai_ready: false }),
    blogModeration: async () => [],
    blogPrivateImage: async () => new Blob(),
    blogSave: async (p) => ({ ...p, revision: p.revision + 1 }),
    blogInteract: async () => ({
      message: "Your comment is awaiting staff review.",
    }),
  };
  globalThis.__blog = (name, ...a) => {
    calls.push({ name, args: a });
    if (!handlers[name]) throw Error("Unexpected " + name);
    return handlers[name](...a);
  };
  URL.createObjectURL = () => "blob:test";
  URL.revokeObjectURL = () => {};
});
afterEach(async () => {
  await act(async () => root.unmount());
  node.remove();
});
after(() => {
  fs.rmSync(temp, { recursive: true, force: true });
  dom.window.close();
});
const render = async (name, route = "/blog") =>
  act(async () =>
    root.render(
      React.createElement(
        MemoryRouter,
        {
          initialEntries: [route],
          future: { v7_startTransition: true, v7_relativeSplatPath: true },
        },
        name === "Post"
          ? React.createElement(
              Routes,
              null,
              React.createElement(Route, {
                path: "/blog/:id",
                element: React.createElement(components.Post),
              }),
            )
          : React.createElement(
              components[name],
              name === "Community" ? { post } : {},
            ),
      ),
    ),
  );
const button = (t) =>
    [...node.querySelectorAll("button")].find((b) => b.textContent === t),
  click = async (e) => act(async () => Simulate.click(e)),
  change = async (el, value) =>
    act(async () => Simulate.change(el, { target: { value, checked: value } }));
const label = (t) =>
  [...node.querySelectorAll("label")]
    .find((el) => el.firstChild.textContent === t)
    ?.querySelector("input,textarea,select");
test("journal shows an honest empty state and no fabricated articles", async () => {
  await render("List");
  assert.match(node.textContent, /The next story starts here/);
  assert.doesNotMatch(node.textContent, /John Doe|Jane Smith|January 2024/);
  assert.equal(node.querySelectorAll(".blog-card").length, 0);
});
test("search and category are server-backed; actual article slugs link to detail", async () => {
  handlers.blogList = async () => ({
    posts: [{ ...post, publish_at: "2026-01-01" }],
    has_more: false,
  });
  await render("List");
  await change(label("Search the journal"), "prayer");
  await act(async () => Simulate.submit(node.querySelector("form")));
  assert.equal(
    calls.filter((c) => c.name === "blogList").at(-1).args[0].q,
    "prayer",
  );
  assert.ok(node.querySelector('a[href="/blog/test-article"]'));
  await click(button("Teaching"));
  assert.equal(
    calls.filter((c) => c.name === "blogList").at(-1).args[0].category,
    "Teaching",
  );
});
test("detail fetches the exact slug and renders article text without executing HTML", async () => {
  await render("Post", "/blog/test-article");
  assert.equal(
    calls.find((c) => c.name === "blogPost").args[0],
    "test-article",
  );
  assert.match(node.textContent, /<script>bad<\/script>/);
  assert.equal(node.querySelector(".blog-prose script"), null);
  assert.ok(node.querySelector('a[href="/donate"]'));
});
test("unavailable detail never falls back to another article", async () => {
  handlers.blogPost = async () => {
    throw { response: { status: 404 } };
  };
  await render("Post", "/blog/future-post");
  assert.match(node.textContent, /Article unavailable/);
  assert.equal(node.querySelector(".blog-article"), null);
  assert.equal(
    calls.some((c) => c.name === "blogCommunity"),
    false,
  );
});
test("editor makes no private requests before sign-in", async () => {
  await render("Desk");
  assert.match(node.textContent, /Staff sign in/);
  assert.equal(calls.length, 0);
});
test("draft editing preserves failed text, revision and manual publication review", async () => {
  globalThis.__blogSigned = true;
  await render("Desk");
  await click(node.querySelector(".blog-draft-row"));
  await change(label("Article"), "Unsaved manuscript");
  handlers.blogSave = async () => {
    throw Error("Revision conflict");
  };
  await act(async () => Simulate.submit(node.querySelector("form")));
  assert.match(node.textContent, /Revision conflict/);
  assert.equal(label("Article").value, "Unsaved manuscript");
  assert.equal(calls.find((c) => c.name === "blogSave").args[0].revision, 1);
  assert.match(node.textContent, /AI is not configured yet/);
});
test("scheduling sends UTC converted from explicit Lagos time and resets review on edits", async () => {
  globalThis.__blogSigned = true;
  await render("Desk");
  await click(node.querySelector(".blog-draft-row"));
  await change(label("Publication"), "scheduled");
  await act(async () => {
    const field = label("Release date and time — Lagos");
    field.value = "2099-11-01T08:00";
    Simulate.input(field);
  });
  const checkbox = node.querySelector("input[type=checkbox]");
  await change(checkbox, true);
  await change(label("Title"), "Changed title");
  assert.equal(checkbox.checked, false);
  await change(checkbox, true);
  await act(async () => Simulate.submit(node.querySelector("form")));
  const sent = calls.find((c) => c.name === "blogSave").args[0];
  assert.equal(sent.publish_at, "2099-11-01T07:00:00.000Z");
  assert.equal(sent.reviewed, true);
  assert.match(node.textContent, /Reviewed and scheduled/);
});
test("comment retries retain id and draft, send verification, and show success only after save", async () => {
  await render("Community");
  await click(button("Write a comment"));
  await change(label("Display name"), "Reader");
  await change(label("Your comment"), "Keep my comment");
  await change(node.querySelector("input[type=checkbox]"), true);
  handlers.blogInteract = async () => {
    throw Error("Connection lost");
  };
  await act(async () => Simulate.submit(node.querySelector("form")));
  assert.equal(label("Your comment").value, "Keep my comment");
  assert.match(node.textContent, /Connection lost/);
  handlers.blogInteract = async () => ({
    message: "Your comment is awaiting staff review.",
  });
  await act(async () => Simulate.submit(node.querySelector("form")));
  const writes = calls.filter((c) => c.name === "blogInteract");
  assert.equal(writes[0].args[2].id, writes[1].args[2].id);
  assert.equal(writes[1].args[2].verificationToken, "fixture-token");
  assert.match(node.textContent, /awaiting staff review/);
  assert.equal(node.querySelector("textarea"), null);
});
test("sharing uses the canonical church link and Instagram remains a manual share flow", async () => {
  await render("Community");
  const wa = node.querySelector('a[href^="https://wa.me"]');
  assert.ok(
    decodeURIComponent(wa.href).includes(
      "https://www.christreformationhouse.org.ng/blog/test-article",
    ),
  );
  assert.ok(button("Copy link / Instagram"));
  assert.ok(button("Download cover"));
});
test("Lagos dates reject impossible values and convert without the editor device timezone", async () => {
  const u = await import("../src/utils/blog.mjs");
  assert.equal(u.lagosISO("2026-11-01T08:00"), "2026-11-01T07:00:00.000Z");
  assert.equal(u.lagosInput("2026-11-01T07:00:00Z"), "2026-11-01T08:00");
  assert.throws(() => u.lagosISO("2026-02-30T08:00"));
  assert.match(
    u.newBlogId(),
    /^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/,
  );
});
