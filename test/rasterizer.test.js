'use strict';

const assert = require('assert');
const { createFramebuffer, clearFramebuffer, rasterize, rasterizeTriangle } = require('../src/rasterizer');

// ─── Test 1: Single triangle fills expected cells ──────────────────────────
console.log('Single triangle in center of 20x10 grid');
{
  const fb = createFramebuffer(20, 10);
  const tri = {
    v: [
      { sx: 10, sy: 2, sz: 0.5 },
      { sx: 5, sy: 8, sz: 0.5 },
      { sx: 15, sy: 8, sz: 0.5 }
    ],
    n: [[0, 0, 1], [0, 0, 1], [0, 0, 1]]
  };
  rasterizeTriangle(fb, tri);

  let hitCount = 0;
  for (let i = 0; i < fb.hitBuf.length; i++) {
    if (fb.hitBuf[i]) hitCount++;
  }
  assert(hitCount > 0, `triangle should fill some cells, got ${hitCount}`);
  assert(hitCount < 200, `triangle should not fill entire grid, got ${hitCount}`);
  // Expected area ≈ 0.5 * 10 * 6 = 30 cells, allow ±10
  assert(hitCount > 15 && hitCount < 50, `expected ~30 filled cells, got ${hitCount}`);
}

// ─── Test 2: Two overlapping triangles at different depths ──────────────────
console.log('Z-buffer: closer triangle wins');
{
  const fb = createFramebuffer(20, 10);

  // Far triangle (z=0.8)
  const farTri = {
    v: [
      { sx: 5, sy: 2, sz: 0.8 },
      { sx: 15, sy: 2, sz: 0.8 },
      { sx: 10, sy: 8, sz: 0.8 }
    ],
    n: [[1, 0, 0], [1, 0, 0], [1, 0, 0]]
  };

  // Near triangle (z=0.3) — overlapping
  const nearTri = {
    v: [
      { sx: 5, sy: 2, sz: 0.3 },
      { sx: 15, sy: 2, sz: 0.3 },
      { sx: 10, sy: 8, sz: 0.3 }
    ],
    n: [[0, 1, 0], [0, 1, 0], [0, 1, 0]]
  };

  rasterizeTriangle(fb, farTri);
  rasterizeTriangle(fb, nearTri);

  // Check cells in the overlap area — should have near triangle's depth and normal
  for (let i = 0; i < fb.hitBuf.length; i++) {
    if (fb.hitBuf[i]) {
      assert(Math.abs(fb.depthBuf[i] - 0.3) < 0.01,
        `cell ${i}: depth should be 0.3 (near), got ${fb.depthBuf[i]}`);
      // Normal should be [0,1,0] from near triangle
      assert(Math.abs(fb.normalBuf[i * 3 + 1] - 1) < 0.01,
        `cell ${i}: normal y should be 1 (near tri)`);
    }
  }
}

// ─── Test 3: Triangle fully outside grid ────────────────────────────────────
console.log('Triangle fully outside grid → no cells written');
{
  const fb = createFramebuffer(20, 10);
  const tri = {
    v: [
      { sx: -10, sy: -10, sz: 0.5 },
      { sx: -5, sy: -10, sz: 0.5 },
      { sx: -10, sy: -5, sz: 0.5 }
    ],
    n: [[0, 0, 1], [0, 0, 1], [0, 0, 1]]
  };
  rasterizeTriangle(fb, tri);

  let hitCount = 0;
  for (let i = 0; i < fb.hitBuf.length; i++) {
    if (fb.hitBuf[i]) hitCount++;
  }
  assert.strictEqual(hitCount, 0, 'no cells should be hit');
}

// ─── Test 4: Triangle partially outside grid ────────────────────────────────
console.log('Triangle partially outside grid → only in-bounds cells');
{
  const fb = createFramebuffer(20, 10);
  const tri = {
    v: [
      { sx: -5, sy: 5, sz: 0.5 },
      { sx: 5, sy: 0, sz: 0.5 },
      { sx: 5, sy: 10, sz: 0.5 }
    ],
    n: [[0, 0, 1], [0, 0, 1], [0, 0, 1]]
  };
  rasterizeTriangle(fb, tri);

  // Should have some hits but no out-of-bounds access (no crash = pass)
  let hitCount = 0;
  for (let i = 0; i < fb.hitBuf.length; i++) {
    if (fb.hitBuf[i]) hitCount++;
  }
  assert(hitCount > 0, 'partial triangle should have some hits');
}

// ─── Test 5: Degenerate triangle (zero area) ───────────────────────────────
console.log('Degenerate triangle → no cells, no crash');
{
  const fb = createFramebuffer(20, 10);
  const tri = {
    v: [
      { sx: 5, sy: 5, sz: 0.5 },
      { sx: 10, sy: 5, sz: 0.5 },
      { sx: 15, sy: 5, sz: 0.5 }  // collinear
    ],
    n: [[0, 0, 1], [0, 0, 1], [0, 0, 1]]
  };
  rasterizeTriangle(fb, tri);

  let hitCount = 0;
  for (let i = 0; i < fb.hitBuf.length; i++) {
    if (fb.hitBuf[i]) hitCount++;
  }
  assert.strictEqual(hitCount, 0, 'degenerate triangle has no area');
}

// ─── Test 6: Clear and re-rasterize ─────────────────────────────────────────
console.log('Clear framebuffer and re-rasterize');
{
  const fb = createFramebuffer(20, 10);
  const tri = {
    v: [
      { sx: 5, sy: 2, sz: 0.5 },
      { sx: 15, sy: 2, sz: 0.5 },
      { sx: 10, sy: 8, sz: 0.5 }
    ],
    n: [[0, 0, 1], [0, 0, 1], [0, 0, 1]]
  };
  rasterizeTriangle(fb, tri);
  let count1 = 0;
  for (let i = 0; i < fb.hitBuf.length; i++) if (fb.hitBuf[i]) count1++;
  assert(count1 > 0, 'should have hits');

  clearFramebuffer(fb);
  let count2 = 0;
  for (let i = 0; i < fb.hitBuf.length; i++) if (fb.hitBuf[i]) count2++;
  assert.strictEqual(count2, 0, 'cleared: no hits');

  // All depths should be Infinity
  for (let i = 0; i < fb.depthBuf.length; i++) {
    assert.strictEqual(fb.depthBuf[i], Infinity, 'depth reset to Infinity');
  }
}

// ─── Test 7: rasterize() with multiple triangles ────────────────────────────
console.log('rasterize() with array of triangles');
{
  const fb = createFramebuffer(20, 10);
  const tris = [
    {
      v: [{ sx: 2, sy: 2, sz: 0.5 }, { sx: 8, sy: 2, sz: 0.5 }, { sx: 5, sy: 8, sz: 0.5 }],
      n: [[0, 0, 1], [0, 0, 1], [0, 0, 1]]
    },
    {
      v: [{ sx: 12, sy: 2, sz: 0.5 }, { sx: 18, sy: 2, sz: 0.5 }, { sx: 15, sy: 8, sz: 0.5 }],
      n: [[0, 0, 1], [0, 0, 1], [0, 0, 1]]
    }
  ];
  rasterize(fb, tris);

  let hitCount = 0;
  for (let i = 0; i < fb.hitBuf.length; i++) {
    if (fb.hitBuf[i]) hitCount++;
  }
  assert(hitCount > 10, `expected multiple filled cells from 2 triangles, got ${hitCount}`);
}

console.log('All rasterizer tests passed!');
