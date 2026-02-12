'use strict';

const assert = require('assert');
const { shade } = require('../src/shader');
const { vec3 } = require('../src/math');

function makeFB(width, height, cells) {
  const size = width * height;
  const fb = {
    width,
    height,
    depthBuf: new Float32Array(size).fill(Infinity),
    normalBuf: new Float32Array(size * 3),
    hitBuf: new Uint8Array(size)
  };
  for (const c of cells) {
    const idx = c.y * width + c.x;
    fb.hitBuf[idx] = 1;
    fb.depthBuf[idx] = c.z || 0.5;
    fb.normalBuf[idx * 3]     = c.nx;
    fb.normalBuf[idx * 3 + 1] = c.ny;
    fb.normalBuf[idx * 3 + 2] = c.nz;
  }
  return fb;
}

const baseConfig = {
  lightDir: [0, 0, 1],       // pointing straight at screen
  lightColor: [200, 200, 200],
  ambientColor: [20, 20, 20],
  bgColor: [10, 10, 15],
  bgMode: 'empty'
};

// ─── Test 1: Normal pointing at light → max brightness ─────────────────────
console.log('Normal facing light → max brightness');
{
  const fb = makeFB(3, 1, [{ x: 1, y: 0, nx: 0, ny: 0, nz: 1 }]);
  const colors = shade(fb, baseConfig);
  const idx = 1 * 3;
  // diffuse = dot([0,0,1], [0,0,1]) = 1 → color = 20 + 200 = 220
  assert.strictEqual(colors[idx], 220, `R = ${colors[idx]}`);
  assert.strictEqual(colors[idx + 1], 220, `G = ${colors[idx + 1]}`);
  assert.strictEqual(colors[idx + 2], 220, `B = ${colors[idx + 2]}`);
}

// ─── Test 2: Normal pointing away → ambient only ───────────────────────────
console.log('Normal facing away → ambient only');
{
  const fb = makeFB(3, 1, [{ x: 1, y: 0, nx: 0, ny: 0, nz: -1 }]);
  const colors = shade(fb, baseConfig);
  const idx = 1 * 3;
  // diffuse = dot([0,0,-1], [0,0,1]) = -1, clamped to 0 → ambient only
  assert.strictEqual(colors[idx], 20, `R = ${colors[idx]}`);
  assert.strictEqual(colors[idx + 1], 20, `G = ${colors[idx + 1]}`);
  assert.strictEqual(colors[idx + 2], 20, `B = ${colors[idx + 2]}`);
}

// ─── Test 3: Normal perpendicular → ambient only ───────────────────────────
console.log('Normal perpendicular → ambient only');
{
  const fb = makeFB(3, 1, [{ x: 1, y: 0, nx: 1, ny: 0, nz: 0 }]);
  const colors = shade(fb, baseConfig);
  const idx = 1 * 3;
  assert.strictEqual(colors[idx], 20);
  assert.strictEqual(colors[idx + 1], 20);
  assert.strictEqual(colors[idx + 2], 20);
}

// ─── Test 4: Clamping to [0, 255] ──────────────────────────────────────────
console.log('Color clamping');
{
  const config = {
    ...baseConfig,
    lightColor: [300, 300, 300],  // would overflow
    ambientColor: [50, 50, 50]
  };
  const fb = makeFB(1, 1, [{ x: 0, y: 0, nx: 0, ny: 0, nz: 1 }]);
  const colors = shade(fb, config);
  assert.strictEqual(colors[0], 255, 'clamped R');
  assert.strictEqual(colors[1], 255, 'clamped G');
  assert.strictEqual(colors[2], 255, 'clamped B');
}

// ─── Test 5: Empty mode — unhit cells color irrelevant ─────────────────────
console.log('Empty mode: unhit cells have 0,0,0');
{
  const fb = makeFB(3, 1, [{ x: 1, y: 0, nx: 0, ny: 0, nz: 1 }]);
  const colors = shade(fb, { ...baseConfig, bgMode: 'empty' });
  // Cell 0 is unhit
  assert.strictEqual(colors[0], 0, 'unhit R');
  assert.strictEqual(colors[1], 0, 'unhit G');
  assert.strictEqual(colors[2], 0, 'unhit B');
}

// ─── Test 6: Filled mode — unhit cells get bgColor ────────────────────────
console.log('Filled mode: unhit cells get bgColor');
{
  const fb = makeFB(3, 1, [{ x: 1, y: 0, nx: 0, ny: 0, nz: 1 }]);
  const config = { ...baseConfig, bgMode: 'filled', bgColor: [10, 10, 15] };
  const colors = shade(fb, config);
  // Cell 0 is unhit
  assert.strictEqual(colors[0], 10, 'bg R');
  assert.strictEqual(colors[1], 10, 'bg G');
  assert.strictEqual(colors[2], 15, 'bg B');
  // Cell 1 is hit — should be lit
  assert(colors[3] > 10, 'hit cell brighter than bg');
}

console.log('All shader tests passed!');
