'use strict';

const assert = require('assert');
const { toANSI } = require('../src/output-ansi');

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

// ─── Test 1: Contains expected escape sequences ─────────────────────────────
console.log('ANSI output contains escape sequences for known RGB');
{
  const { colorBuf, hitBuf } = makeBuffers(3, 1, [
    { x: 1, y: 0, r: 100, g: 150, b: 200 }
  ]);
  const out = toANSI(colorBuf, hitBuf, { width: 3, height: 1, char: '#', bgMode: 'empty', colorMode: 'truecolor' });
  assert(out.includes('\x1b[38;2;100;150;200m'), 'contains correct escape');
  assert(out.includes('#'), 'contains render char');
}

// ─── Test 2: Empty mode: unhit cells produce spaces ─────────────────────────
console.log('Empty mode: unhit cells are spaces');
{
  const { colorBuf, hitBuf } = makeBuffers(3, 1, [
    { x: 1, y: 0, r: 100, g: 100, b: 100 }
  ]);
  const out = toANSI(colorBuf, hitBuf, { width: 3, height: 1, char: '&', bgMode: 'empty', colorMode: 'truecolor' });
  // First char on the row should be a space (cell 0 is unhit)
  const afterHome = out.replace('\x1b[H', '');
  assert(afterHome[0] === ' ', 'first cell is space');
}

// ─── Test 3: Filled mode: unhit cells get the char ──────────────────────────
console.log('Filled mode: unhit cells get char with bgColor');
{
  const size = 3;
  const colorBuf = new Uint8Array(size * 3);
  const hitBuf = new Uint8Array(size);
  // Set all to bgColor
  for (let i = 0; i < size; i++) {
    colorBuf[i * 3] = 10;
    colorBuf[i * 3 + 1] = 10;
    colorBuf[i * 3 + 2] = 15;
  }
  const out = toANSI(colorBuf, hitBuf, { width: 3, height: 1, char: '&', bgMode: 'filled', colorMode: 'truecolor' });
  // All cells should be '&' even though none are hit
  assert(out.includes('\x1b[38;2;10;10;15m'), 'has bg color escape');
  const charCount = (out.match(/&/g) || []).length;
  assert.strictEqual(charCount, 3, `3 chars, got ${charCount}`);
}

// ─── Test 4: Run-length optimization ────────────────────────────────────────
console.log('Run-length: same color → one escape');
{
  const { colorBuf, hitBuf } = makeBuffers(3, 1, [
    { x: 0, y: 0, r: 50, g: 50, b: 50 },
    { x: 1, y: 0, r: 50, g: 50, b: 50 },
    { x: 2, y: 0, r: 50, g: 50, b: 50 }
  ]);
  const out = toANSI(colorBuf, hitBuf, { width: 3, height: 1, char: '@', bgMode: 'empty', colorMode: 'truecolor' });
  const escapeCount = (out.match(/\x1b\[38;2;50;50;50m/g) || []).length;
  assert.strictEqual(escapeCount, 1, `only 1 escape for 3 same-color cells, got ${escapeCount}`);
}

// ─── Test 5: Starts with cursor home ────────────────────────────────────────
console.log('Starts with cursor home');
{
  const { colorBuf, hitBuf } = makeBuffers(1, 1, []);
  const out = toANSI(colorBuf, hitBuf, { width: 1, height: 1, char: '&', bgMode: 'empty' });
  assert(out.startsWith('\x1b[H'), 'starts with cursor home');
}

// ─── Test 6: Ends with reset ────────────────────────────────────────────────
console.log('Ends with reset');
{
  const { colorBuf, hitBuf } = makeBuffers(1, 1, []);
  const out = toANSI(colorBuf, hitBuf, { width: 1, height: 1, char: '&', bgMode: 'empty' });
  assert(out.endsWith('\x1b[0m'), 'ends with reset');
}

console.log('All ANSI output tests passed!');
