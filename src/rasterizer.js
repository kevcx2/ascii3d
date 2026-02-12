'use strict';

const { vec3 } = require('./math');

/**
 * Create an empty framebuffer.
 */
function createFramebuffer(width, height) {
  return {
    width,
    height,
    depthBuf: new Float32Array(width * height).fill(Infinity),
    normalBuf: new Float32Array(width * height * 3),
    hitBuf: new Uint8Array(width * height)
  };
}

/**
 * Clear the framebuffer for a new frame.
 */
function clearFramebuffer(fb) {
  fb.depthBuf.fill(Infinity);
  fb.normalBuf.fill(0);
  fb.hitBuf.fill(0);
}

/**
 * Compute the edge function: (b - a) × (p - a) in 2D
 */
function edge(ax, ay, bx, by, px, py) {
  return (bx - ax) * (py - ay) - (by - ay) * (px - ax);
}

/**
 * Rasterize a single screen-space triangle into the framebuffer.
 * tri: { v: [{sx, sy, sz}, ...], n: [[nx,ny,nz], ...] }
 */
function rasterizeTriangle(fb, tri) {
  const v0 = tri.v[0], v1 = tri.v[1], v2 = tri.v[2];
  const n0 = tri.n[0], n1 = tri.n[1], n2 = tri.n[2];

  // Compute bounding box, clamped to grid
  const minX = Math.max(0, Math.floor(Math.min(v0.sx, v1.sx, v2.sx)));
  const maxX = Math.min(fb.width - 1, Math.ceil(Math.max(v0.sx, v1.sx, v2.sx)));
  const minY = Math.max(0, Math.floor(Math.min(v0.sy, v1.sy, v2.sy)));
  const maxY = Math.min(fb.height - 1, Math.ceil(Math.max(v0.sy, v1.sy, v2.sy)));

  if (minX > maxX || minY > maxY) return;

  // Triangle area (2x) via edge function
  const area = edge(v0.sx, v0.sy, v1.sx, v1.sy, v2.sx, v2.sy);

  // Degenerate triangle
  if (Math.abs(area) < 1e-10) return;

  const invArea = 1.0 / area;

  for (let y = minY; y <= maxY; y++) {
    for (let x = minX; x <= maxX; x++) {
      // Sample at pixel center
      const px = x + 0.5;
      const py = y + 0.5;

      const w0 = edge(v1.sx, v1.sy, v2.sx, v2.sy, px, py) * invArea;
      const w1 = edge(v2.sx, v2.sy, v0.sx, v0.sy, px, py) * invArea;
      const w2 = 1.0 - w0 - w1;

      // Inside triangle check — barycentric coords are non-negative
      // for interior points regardless of winding (edge/area normalizes sign)
      if (w0 < 0 || w1 < 0 || w2 < 0) continue;

      // Interpolate depth
      const z = w0 * v0.sz + w1 * v1.sz + w2 * v2.sz;

      const idx = y * fb.width + x;

      // Depth test
      if (z < fb.depthBuf[idx]) {
        fb.depthBuf[idx] = z;
        fb.hitBuf[idx] = 1;

        // Interpolate and normalize normal
        const nx = w0 * n0[0] + w1 * n1[0] + w2 * n2[0];
        const ny = w0 * n0[1] + w1 * n1[1] + w2 * n2[1];
        const nz = w0 * n0[2] + w1 * n1[2] + w2 * n2[2];
        const len = Math.sqrt(nx * nx + ny * ny + nz * nz);
        const nIdx = idx * 3;
        if (len > 0) {
          fb.normalBuf[nIdx]     = nx / len;
          fb.normalBuf[nIdx + 1] = ny / len;
          fb.normalBuf[nIdx + 2] = nz / len;
        } else {
          fb.normalBuf[nIdx]     = 0;
          fb.normalBuf[nIdx + 1] = 0;
          fb.normalBuf[nIdx + 2] = 1;
        }
      }
    }
  }
}

/**
 * Rasterize all triangles into the framebuffer.
 */
function rasterize(fb, triangles) {
  for (let i = 0; i < triangles.length; i++) {
    rasterizeTriangle(fb, triangles[i]);
  }
}

module.exports = { createFramebuffer, clearFramebuffer, rasterize, rasterizeTriangle };
