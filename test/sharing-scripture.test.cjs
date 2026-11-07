const { test, before, beforeEach, afterEach, after } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { build } = require('esbuild');
const { JSDOM } = require('jsdom');
const React = require('react');
const { act } = React;
const { createRoot } = require('react-dom/client');
const { Simulate } = require('react-dom/test-utils');
const { MemoryRouter } = require('react-router-dom');
let dom, node, root, components, scripture, clipboard, shared;
const temporary = fs.mkdtempSync(path.join(process.cwd(), '.scripture-test-'));
const originalFetch = global.fetch;
before(async () => {
  dom = new JSDOM('<!doctype html><body></body>', { url: 'https://www.christreformationhouse.org.ng/' });
  global.window = dom.window; global.document = dom.window.document; global.navigator = dom.window.navigator; global.IS_REACT_ACT_ENVIRONMENT = true;
  global.fetch = async url => ({ ok: true, json: async () => JSON.parse(fs.readFileSync('public' + url, 'utf8')) });
  components = {};
  for (const [name, entry] of Object.entries({ Text: 'src/components/ScriptureText.jsx', Share: 'src/components/ContentShare.jsx', Bible: 'src/pages/Bible.jsx', helpers: 'src/utils/scripture.mjs' })) {
    const output = path.join(temporary, name + '.cjs');
    await build({ entryPoints: [entry], outfile: output, bundle: true, platform: 'node', format: 'cjs', jsx: 'automatic', external: ['react', 'react-dom', 'react-dom/*', 'react-router-dom'] });
    components[name] = require(output);
  }
  scripture = components.helpers;
});
beforeEach(() => {
  node = document.createElement('div'); document.body.append(node); root = createRoot(node);
  clipboard = []; shared = [];
  Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText: async text => clipboard.push(text) } });
  Object.defineProperty(navigator, 'share', { configurable: true, writable: true, value: async value => shared.push(value) });
});
afterEach(async () => { await act(async () => root.unmount()); node.remove(); });
after(() => { fs.rmSync(temporary, { recursive: true, force: true }); dom.window.close(); global.fetch = originalFetch; });
const render = async (component, props = {}, route = '/') => act(async () => root.render(React.createElement(MemoryRouter, { initialEntries: [route] }, React.createElement(component, props))));
const button = text => [...node.querySelectorAll('button')].find(element => element.textContent === text);
const click = async element => act(async () => Simulate.click(element));

test('all 66 book names resolve to the correct local Bible book', () => {
  const books = JSON.parse(fs.readFileSync('src/content/bible-books.json'));
  for (const book of books) assert.equal(scripture.parseScripture(`${book.name} 1:1`).book, book.id);
});
test('reference matching handles aliases, numbered books, chapter references and verse ranges', () => {
  const results = scripture.scriptureMatches('See Psalm 77:14, John 3:16–18, 2 Cor. 5:17 and II Timothy 1:7. Read Matthew 6.');
  assert.deepEqual(results.map(value => value.book), [19, 43, 47, 55, 40]);
  assert.equal(results[1].endVerse, 18); assert.equal(results[4].verse, null);
  assert.equal(scripture.parseScripture('John 3:35–4:2').endChapter, 4);
  for (const bad of ['John 22:1', 'Genesis 0:1', 'John 3:18-16', '<script>John 3:16</script>', 'Not a reference']) assert.equal(scripture.parseScripture(bad), null);
});
test('links preserve surrounding text and route to the selected verse without external Bible services', async () => {
  await render(components.Text.default, { children: 'Trust God. Read John 3:16–18 today.' });
  assert.equal(node.textContent, 'Trust God. Read John 3:16–18 today.');
  const link = node.querySelector('a'); assert.equal(link.getAttribute('href'), '/bible?reference=John%203%3A16%E2%80%9318');
  assert.equal(link.getAttribute('aria-label'), 'Read John 3:16–18 in the Bible');
});
test('content linking preserves controls and avoids nested links', async () => {
  await render(components.Text.ScriptureContent, { children: React.createElement('div', null,
    React.createElement('p', null, 'Psalm 77:14'), React.createElement('a', { href: '/events' }, 'John 3:16'), React.createElement('button', null, 'Romans 8:1')) });
  assert.equal(node.querySelectorAll('a.scripture-link').length, 1);
  assert.equal(node.querySelector('a[href="/events"]').textContent, 'John 3:16');
  assert.equal(node.querySelectorAll('a a').length, 0); assert.equal(node.querySelector('button').textContent, 'Romans 8:1');
});
test('a Bible deep link displays the exact requested KJV range', async () => {
  await render(components.Bible.default, {}, '/bible?reference=John%203%3A16%E2%80%9318');
  const text = node.querySelector('.crh-bible-text'); assert.ok(text); assert.equal(text.querySelectorAll('p').length, 3);
  assert.match(text.textContent, /For God so loved the world/); assert.match(text.textContent, /condemned already/);
  await click(button('Copy scripture')); assert.match(clipboard[0], /John 3:16–18 \(KJV\)/);
});
test('cross-chapter links display only the requested start and end boundaries', async () => {
  await render(components.Bible.default, {}, '/bible?reference=John%203%3A35%E2%80%934%3A2');
  assert.equal(node.querySelectorAll('.crh-bible-text p').length, 4);
  assert.match(node.querySelector('.crh-bible-text').textContent, /The Father loveth the Son/);
});
test('invalid verse numbers are actionable and a reader can recover to the chapter', async () => {
  await render(components.Bible.default, {}, '/bible?reference=John%203%3A999');
  assert.match(node.querySelector('[role="alert"]').textContent, /verse range is not available/);
  await click(button('Read the whole chapter')); assert.equal(node.querySelectorAll('.crh-bible-text p').length, 36);
});
test('a malformed Bible link still offers the working book browser', async () => {
  await render(components.Bible.default, {}, '/bible?reference=unknown'); assert.match(node.querySelector('[role="alert"]').textContent, /could not recognise/); assert.equal(node.querySelectorAll('select').length, 3);
});
test('event sharing encodes the public registration URL for WhatsApp, Facebook and email', async () => {
  const url = 'https://www.christreformationhouse.org.ng/events/register/test-event';
  await render(components.Share.default, { title: 'God of Wonder', url, text: 'Rainbow Street' });
  assert.ok(decodeURIComponent(node.querySelector('a[href^="https://wa.me/"]').href).includes(url));
  assert.equal(new URL(node.querySelector('a[href*="facebook.com"]').href).searchParams.get('u'), url);
  assert.ok(node.querySelector('a[href^="mailto:"]')); await click(button('Copy link')); assert.deepEqual(clipboard, [url]);
});
test('meeting device sharing preserves the guest invitation and provider selection', async () => {
  const url = 'https://www.christreformationhouse.org.ng/meetings/room/crh-demo?title=Sunday%20Prayer&provider=public';
  await render(components.Share.default, { title: 'Sunday Prayer', url });
  await click(button('Share using your device')); assert.equal(shared[0].url, url);
});
test('native share cancellation stays quiet and clipboard failure exposes a selectable link', async () => {
  navigator.share = async () => { throw Object.assign(new Error('Cancelled'), { name: 'AbortError' }); };
  navigator.clipboard.writeText = async () => { throw Error('Unavailable'); };
  await render(components.Share.default, { title: 'Prayer', url: 'https://www.christreformationhouse.org.ng/meetings/room/crh-demo' });
  await click(button('Share using your device')); assert.equal(node.querySelector('[role="status"]'), null);
  await click(button('Copy link')); assert.ok(node.querySelector('input[readonly]')); assert.match(node.querySelector('[role="status"]').textContent, /Copy the link below/);
});
test('invalid share URLs do not produce script or credential-bearing links', async () => {
  await render(components.Share.default, { title: 'Invalid', url: 'javascript:alert(1)' }); assert.equal(node.querySelector('a'), null);
});
