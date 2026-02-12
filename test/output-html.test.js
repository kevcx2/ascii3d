'use strict';

const assert = require('assert');
const { toHTML } = require('../src/output-html');

function makeBuffers(width, height, cells) {
  const size = width * height;
  const colorBuf = new Uint8Array(size * 3);
  const hitBuf = new Uint8Array(size);
  for (const c of cells) {
    const idx = c.y * width + c.x;
    hitBuf[idx] = 1;
    colorBuf[idx * 3]     = c.r;
    colorBuf[idx * 3 + 1] = c.g;
    colorBuf[idx * 3 + 2] = c.b;
  }
  return { colorBuf, hitBuf };
}

// ─── Test 1: Valid HTML structure ───────────────────────────────────────────
console.log('HTML output has valid structure');
{
  const { colorBuf, hitBuf } = makeBuffers(3, 1, [
    { x: 1, y: 0, r: 100, g: 150, b: 200 }
  ]);
  const out = toHTML(colorBuf, hitBuf, { width: 3, height: 1, char: '#', bgMode: 'empty' });
  assert(out.startsWith('<pre'), 'starts with <pre');
  assert(out.endsWith('</pre>'), 'ends with </pre>');
  assert(out.includes('<span style="color:rgb(100,150,200)">'), 'has span with color');
  assert(out.includes('#'), 'has char');
}

// ─── Test 2: HTML entity escaping ───────────────────────────────────────────
console.log('HTML: & char is escaped');
{
  const { colorBuf, hitBuf } = makeBuffers(1, 1, [
    { x: 0, y: 0, r: 100, g: 100, b: 100 }
  ]);
  const out = toHTML(colorBuf, hitBuf, { width: 1, height: 1, char: '&', bgMode: 'empty' });
  assert(out.includes('&amp;'), '& is escaped to &amp;');
  // Should not have unescaped & (except in &amp;)
  const stripped = out.replace(/&amp;/g, '').replace(/&lt;/g, '').replace(/&gt;/g, '').replace(/&quot;/g, '');
  // There will be & in rgb() color values... so just check the char is escaped
  assert(out.includes('>&#') === false || out.includes('>&amp;'), 'properly escaped');
}

// ─── Test 3: Empty mode: unhit cells are spaces ─────────────────────────────
console.log('HTML empty mode: unhit cells are spaces');
{
  const { colorBuf, hitBuf } = makeBuffers(3, 1, [
    { x: 1, y: 0, r: 100, g: 100, b: 100 }
  ]);
  const out = toHTML(colorBuf, hitBuf, { width: 3, height: 1, char: '#', bgMode: 'empty' });
  // The content between <pre...> and first <span should start with a space
  const preContent = out.replace(/<pre[^>]*>/, '').replace(/<\/pre>/, '');
  assert(preContent[0] === ' ', 'first cell is space in empty mode');
}

// ─── Test 4: Filled mode: all cells get char ────────────────────────────────
console.log('HTML filled mode: all cells get char');
{
  const size = 3;
  const colorBuf = new Uint8Array(size * 3);
  const hitBuf = new Uint8Array(size);
  for (let i = 0; i < size; i++) {
    colorBuf[i * 3] = 10; colorBuf[i * 3 + 1] = 10; colorBuf[i * 3 + 2] = 15;
  }
  const out = toHTML(colorBuf, hitBuf, { width: 3, height: 1, char: '@', bgMode: 'filled' });
  const charCount = (out.match(/@/g) || []).length;
  assert.strictEqual(charCount, 3, `3 chars in filled mode, got ${charCount}`);
}

// ─── Test 5: Run-length grouping ────────────────────────────────────────────
console.log('HTML run-length: same color → one span');
{
  const { colorBuf, hitBuf } = makeBuffers(3, 1, [
    { x: 0, y: 0, r: 50, g: 50, b: 50 },
    { x: 1, y: 0, r: 50, g: 50, b: 50 },
    { x: 2, y: 0, r: 50, g: 50, b: 50 }
  ]);
  const out = toHTML(colorBuf, hitBuf, { width: 3, height: 1, char: '@', bgMode: 'empty' });
  const spanCount = (out.match(/<span/g) || []).length;
  assert.strictEqual(spanCount, 1, `1 span for 3 same-color cells, got ${spanCount}`);
}

console.log('All HTML output tests passed!');
