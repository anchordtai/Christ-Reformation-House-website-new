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
let root, node, Hero, dom, reduced, listeners;
const temporary = fs.mkdtempSync(path.join(process.cwd(), '.hero-test-'));
before(() => {
  dom = new JSDOM('<!doctype html><body></body>', { url: 'http://localhost/' });
  global.window = dom.window; global.document = dom.window.document; global.IS_REACT_ACT_ENVIRONMENT = true;
  Object.defineProperty(document, 'visibilityState', { configurable: true, value: 'visible' });
  window.matchMedia = () => ({ matches: reduced, addEventListener: (_, fn) => listeners.push(fn), removeEventListener: () => {} });
  const output = path.join(temporary, 'Hero.cjs');
  buildSync({ entryPoints: ['src/components/HeroCarousel.jsx'], outfile: output, bundle: true, platform: 'node', format: 'cjs', jsx: 'automatic', external: ['react', 'react-dom', 'react-dom/*', 'react-router-dom'] });
  Hero = require(output).default;
});
beforeEach(() => { reduced = false; listeners = []; Object.defineProperty(document, 'visibilityState', { configurable: true, value: 'visible' }); node = document.createElement('div'); document.body.append(node); root = createRoot(node); });
afterEach(async () => { await act(async () => root.unmount()); node.remove(); });
after(() => { fs.rmSync(temporary, { recursive: true, force: true }); dom.window.close(); });
const render = async () => act(async () => root.render(React.createElement(MemoryRouter, { future: { v7_startTransition: true, v7_relativeSplatPath: true } }, React.createElement(Hero))));
const click = async label => act(async () => Simulate.click(node.querySelector(`[aria-label="${label}"]`)));
const selected = () => node.querySelector('.ministry-slide-dot[aria-pressed="true"]').getAttribute('aria-label');
test('both local ministry portraits are available with descriptive alt text and one main heading', async () => {
  await render(); assert.equal(node.querySelectorAll('h1').length, 1);
  for (const image of node.querySelectorAll('img')) { assert.ok(fs.existsSync('public' + image.getAttribute('src'))); assert.ok(image.alt.includes('Anchord Taiwo')); }
  assert.ok(node.textContent.includes('AI-created ministry portraits'));
});
test('next, previous, dots, and keyboard navigation update the visible slide', async () => {
  await render(); await click('Next ministry slide'); assert.ok(selected().includes('slide 2')); assert.equal(node.querySelector('.ministry-actions a').getAttribute('href'), '/prayer-request');
  await act(async () => Simulate.keyDown(node.querySelector('section'), { key: 'ArrowLeft', preventDefault() {} })); assert.ok(selected().includes('slide 1'));
  await click('Show slide 2: A community of prayer'); assert.ok(selected().includes('slide 2')); await click('Previous ministry slide'); assert.ok(selected().includes('slide 1'));
});
test('autoplay can be paused and resumed without navigating the page', async context => {
  context.mock.timers.enable({ apis: ['setInterval'] });
  try { await render(); await act(async () => context.mock.timers.tick(7000)); assert.ok(selected().includes('slide 2')); await click('Pause slideshow'); await act(async () => context.mock.timers.tick(14000)); assert.ok(selected().includes('slide 2')); await click('Play slideshow'); await act(async () => context.mock.timers.tick(7000)); assert.ok(selected().includes('slide 1')); }
  finally { context.mock.timers.reset(); }
});
test('reduced-motion users receive a manual slider without autoplay', async context => {
  reduced = true; context.mock.timers.enable({ apis: ['setInterval'] });
  try { await render(); await act(async () => context.mock.timers.tick(21000)); assert.ok(selected().includes('slide 1')); assert.equal(node.querySelector('[aria-label="Pause slideshow"]'), null); await click('Next ministry slide'); assert.ok(selected().includes('slide 2')); }
  finally { context.mock.timers.reset(); }
});
test('keyboard focus stops automatic rotation until explicitly played', async context => {
  context.mock.timers.enable({ apis: ['setInterval'] });
  try { await render(); await act(async () => Simulate.focus(node.querySelector('.ministry-actions a'))); await act(async () => context.mock.timers.tick(14000)); assert.ok(selected().includes('slide 1')); assert.ok(node.querySelector('[aria-label="Play slideshow"]')); }
  finally { context.mock.timers.reset(); }
});
test('a hidden browser tab stops the rotation timer', async context => {
  context.mock.timers.enable({ apis: ['setInterval'] });
  try { await render(); await act(async () => { Object.defineProperty(document, 'visibilityState', { configurable: true, value: 'hidden' }); document.dispatchEvent(new window.Event('visibilitychange')); }); await act(async () => context.mock.timers.tick(14000)); assert.ok(selected().includes('slide 1')); }
  finally { context.mock.timers.reset(); }
});
