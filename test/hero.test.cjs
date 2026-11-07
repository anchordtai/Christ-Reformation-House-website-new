const { test, before, beforeEach, afterEach, after } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { JSDOM } = require('jsdom');
const { build } = require('esbuild');
const React = require('react');
const { act } = React;
const { createRoot } = require('react-dom/client');
const { Simulate } = require('react-dom/test-utils');
const { MemoryRouter } = require('react-router-dom');
let root, node, Hero, dom, reduced;
const originalNow = Date.now;
const temporary = fs.mkdtempSync(path.join(process.cwd(), '.hero-test-'));
before(async () => {
  dom = new JSDOM('<!doctype html><body></body>', { url: 'http://localhost/' });
  global.window = dom.window; global.document = dom.window.document; global.IS_REACT_ACT_ENVIRONMENT = true;
  Object.defineProperty(document, 'visibilityState', { configurable: true, value: 'visible' });
  window.matchMedia = () => ({ matches: reduced, addEventListener() {}, removeEventListener() {} });
  const output = path.join(temporary, 'Hero.cjs');
  await build({ entryPoints: ['src/components/HeroCarousel.jsx'], outfile: output, bundle: true, platform: 'node', format: 'cjs', jsx: 'automatic', external: ['react', 'react-dom', 'react-dom/*', 'react-router-dom'], plugins: [{ name: 'public-events', setup(builder) { builder.onResolve({ filter: /^\.\.\/services\/ministry$/ }, () => ({ path: 'events', namespace: 'test' })); builder.onLoad({ filter: /.*/, namespace: 'test' }, () => ({ contents: 'export const getEvents=()=>Promise.resolve(globalThis.__heroEvents || [])' })); } }] });
  Hero = require(output).default;
});
beforeEach(() => {
  reduced = false; global.__heroEvents = [];
  Date.now = () => Date.parse('2026-11-07T12:00:00+01:00');
  Object.defineProperty(document, 'visibilityState', { configurable: true, value: 'visible' });
  node = document.createElement('div'); document.body.append(node); root = createRoot(node);
});
afterEach(async () => { await act(async () => root.unmount()); node.remove(); Date.now = originalNow; });
after(() => { fs.rmSync(temporary, { recursive: true, force: true }); dom.window.close(); delete global.__heroEvents; });
const render = async () => act(async () => root.render(React.createElement(MemoryRouter, null, React.createElement(Hero))));
const click = async label => act(async () => Simulate.click(node.querySelector(`[aria-label="${label}"]`)));
const selected = () => node.querySelector('.ministry-slide-dot[aria-pressed="true"]').getAttribute('aria-label');

test('all five slides retain the two approved portraits and have local media and alternative text', async () => {
  await render(); assert.equal(node.querySelectorAll('h1').length, 1);
  assert.equal(node.querySelectorAll('.ministry-slide-dot').length, 5);
  for (const image of node.querySelectorAll('img')) { assert.ok(fs.existsSync('public' + image.getAttribute('src'))); assert.ok(image.alt.length > 20); }
  assert.match(node.textContent, /7th–13th December 2026/);
  assert.match(node.textContent, /5:00 PM/);
  await click('Show slide 4: Grow in the Word'); assert.match(node.textContent, /Rooted in Christ/);
  await click('Show slide 5: A community of prayer'); assert.equal(node.querySelector('.ministry-actions a').getAttribute('href'), '/prayer-request');
});
test('arrows, indicators and keyboard cycle through the full collection and wrap', async () => {
  await render(); await click('Next ministry slide'); assert.match(selected(), /slide 2/);
  await click('Previous ministry slide'); assert.match(selected(), /slide 1/);
  await click('Previous ministry slide'); assert.match(selected(), /slide 5/);
  await act(async () => Simulate.keyDown(node.querySelector('section'), { key: 'ArrowRight', preventDefault() {} })); assert.match(selected(), /slide 1/);
});
test('autoplay advances at seven seconds and explicit pause survives mouse leave', async context => {
  context.mock.timers.enable({ apis: ['setTimeout'] });
  try { await render(); await act(async () => context.mock.timers.tick(7000)); assert.match(selected(), /slide 2/);
    await click('Pause slideshow'); await act(async () => Simulate.mouseLeave(node.querySelector('section')));
    await act(async () => context.mock.timers.tick(14000)); assert.match(selected(), /slide 2/);
    await click('Play slideshow'); await act(async () => context.mock.timers.tick(7000)); assert.match(selected(), /slide 3/);
  } finally { context.mock.timers.reset(); }
});
test('hover pauses temporarily and mouse leave resumes autoplay', async context => {
  context.mock.timers.enable({ apis: ['setTimeout'] });
  try { await render(); await act(async () => Simulate.mouseEnter(node.querySelector('section')));
    await act(async () => context.mock.timers.tick(14000)); assert.match(selected(), /slide 1/);
    await act(async () => Simulate.mouseLeave(node.querySelector('section')));
    await act(async () => context.mock.timers.tick(7000)); assert.match(selected(), /slide 2/);
  } finally { context.mock.timers.reset(); }
});
test('manual navigation restarts the dwell time without permanently disabling autoplay', async context => {
  context.mock.timers.enable({ apis: ['setTimeout'] });
  try { await render(); await click('Next ministry slide'); await act(async () => context.mock.timers.tick(7000)); assert.match(selected(), /slide 3/); }
  finally { context.mock.timers.reset(); }
});
test('horizontal touch navigates while vertical scrolling does not', async () => {
  await render(); const surface = node.querySelector('section');
  await act(async () => { Simulate.touchStart(surface, { touches: [{ clientX: 260, clientY: 100 }] }); Simulate.touchEnd(surface, { changedTouches: [{ clientX: 80, clientY: 110 }] }); }); assert.match(selected(), /slide 2/);
  await act(async () => { Simulate.touchStart(surface, { touches: [{ clientX: 260, clientY: 100 }] }); Simulate.touchEnd(surface, { changedTouches: [{ clientX: 240, clientY: 400 }] }); }); assert.match(selected(), /slide 2/);
});
test('reduced motion and hidden tabs suspend automatic transitions', async context => {
  reduced = true; context.mock.timers.enable({ apis: ['setTimeout'] });
  try { await render(); await act(async () => context.mock.timers.tick(21000)); assert.match(selected(), /slide 1/); assert.equal(node.querySelector('[aria-label="Pause slideshow"]'), null); }
  finally { context.mock.timers.reset(); }
});
test('hidden browser suspends and visible browser resumes', async context => {
  context.mock.timers.enable({ apis: ['setTimeout'] });
  try { await render(); await act(async () => { Object.defineProperty(document, 'visibilityState', { configurable: true, value: 'hidden' }); document.dispatchEvent(new window.Event('visibilitychange')); });
    await act(async () => context.mock.timers.tick(14000)); assert.match(selected(), /slide 1/);
    await act(async () => { Object.defineProperty(document, 'visibilityState', { configurable: true, value: 'visible' }); document.dispatchEvent(new window.Event('visibilitychange')); });
    await act(async () => context.mock.timers.tick(7000)); assert.match(selected(), /slide 2/);
  } finally { context.mock.timers.reset(); }
});
test('registration uses the existing published event route and watch uses the broadcast page', async () => {
  global.__heroEvents = [{ id: 'existing-crusade', title: 'God of Wonder', starts_at: '2026-12-07T16:00:00Z', ends_at: '2026-12-13T20:00:00Z', registration_enabled: true }];
  await render(); assert.equal(node.querySelector('.ministry-actions a').getAttribute('href'), '/events/register/existing-crusade'); assert.ok(node.querySelector('a[href="/watch#broadcast"]'));
});
test('missing crusade registration does not create a guessed event URL', async () => {
  await render(); assert.equal(node.querySelector('.ministry-actions button').disabled, true); assert.match(node.textContent, /Online registration opens/); assert.equal(node.querySelector('a[href^="/events/register/"]'), null);
});
test('the complete slider collection contains images only', async () => {
  await render();
  for (const button of [...node.querySelectorAll('.ministry-slide-dot')]) {
    await act(async () => Simulate.click(button));
    assert.equal(node.querySelector('video'), null);
    assert.ok(node.querySelector('.is-active img'));
  }
});
test('media error leaves a local fallback and visible event details', async () => {
  await render(); await act(async () => Simulate.error(node.querySelector('img'))); assert.equal(node.querySelector('img').getAttribute('src'), '/assets/img/crhlogo.jpg'); assert.match(node.textContent, /Media is unavailable/); assert.match(node.textContent, /GOD OF/);
});
test('after the convention the preserved ministry slides return', async () => {
  Date.now = () => Date.parse('2026-12-14T00:00:00+01:00'); await render(); assert.equal(node.querySelectorAll('.ministry-slide-dot').length, 2); assert.match(node.textContent, /Rooted in Christ/);
});
