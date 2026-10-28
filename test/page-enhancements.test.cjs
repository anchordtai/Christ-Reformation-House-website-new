const { test, before, beforeEach, afterEach, after } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { JSDOM } = require('jsdom');
const { buildSync } = require('esbuild');
const React = require('react');
const { act } = React;
const { createRoot } = require('react-dom/client');
const { Simulate } = require('react-dom/test-utils');
const { MemoryRouter } = require('react-router-dom');
let dom, root, node, Component, observed, callback, reduced, scrolls;
const temp = fs.mkdtempSync(path.join(process.cwd(), '.motion-test-'));
before(() => {
  dom = new JSDOM('<!doctype html><body></body>', { url: 'http://localhost/' });
  global.window = dom.window; global.document = dom.window.document; global.IS_REACT_ACT_ENVIRONMENT = true;
  window.scrollTo = options => scrolls.push(options);
  window.matchMedia = () => ({ matches: reduced, addEventListener() {}, removeEventListener() {} });
  global.IntersectionObserver = window.IntersectionObserver = class { constructor(fn) { callback = fn; } observe(el) { observed.push(el); } unobserve() {} disconnect() {} };
  global.cancelAnimationFrame = () => {};
  global.requestAnimationFrame = fn => setTimeout(fn, 0);
  const output = path.join(temp, 'motion.cjs');
  buildSync({ entryPoints: ['src/components/PageEnhancements.jsx'], outfile: output, bundle: true, platform: 'node', format: 'cjs', jsx: 'automatic', external: ['react', 'react-dom', 'react-dom/*', 'react-router-dom'] });
  Component = require(output).default;
});
beforeEach(() => { reduced = false; scrolls = []; observed = []; node = document.createElement('div'); document.body.append(node); root = createRoot(node); Object.defineProperty(window, 'scrollY', { configurable: true, value: 0 }); });
afterEach(async () => { await act(async () => root.unmount()); node.remove(); });
after(() => { fs.rmSync(temp, { recursive: true, force: true }); dom.window.close(); });
async function render() { await act(async () => root.render(React.createElement(MemoryRouter, { future: { v7_startTransition: true, v7_relativeSplatPath: true } }, React.createElement(Component), React.createElement('main', { id: 'main-content' }, React.createElement('section', null, 'Readable content'))))); }
test('scroll entrance decoration preserves content and exposes a skip link', async () => {
  await render(); assert.ok(node.textContent.includes('Readable content')); assert.equal(node.querySelector('.site-skip-link').getAttribute('href'), '#main-content');
  assert.equal(observed.length, 1); callback([{ target: observed[0], isIntersecting: true }]); assert.ok(observed[0].classList.contains('motion-enter'));
});
test('reduced-motion preference skips entrance observation', async () => {
  reduced = true; await render(); assert.equal(observed.length, 0); assert.ok(node.textContent.includes('Readable content'));
});
test('back-to-top appears only after scrolling and respects reduced motion', async () => {
  reduced = true; await render(); assert.equal(node.querySelector('.site-back-top'), null);
  await act(async () => { Object.defineProperty(window, 'scrollY', { configurable: true, value: 800 }); window.dispatchEvent(new window.Event('scroll')); });
  await act(async () => Simulate.click(node.querySelector('.site-back-top')));
  assert.deepEqual(scrolls.at(-1), { top: 0, behavior: 'instant' });
});
