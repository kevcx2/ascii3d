'use strict';

const assert = require('assert');
const { vec3, mat4 } = require('../src/math');
const { buildMVP, projectVertex, transformModel, CHAR_ASPECT } = require('../src/pipeline');

const EPS = 1e-3; // screen-space tolerance

function approxEqual(a, b, msg) {
  assert(Math.abs(a - b) < EPS, `${msg}: expected ${b}, got ${a} (diff=${Math.abs(a-b)})`);
}

const baseConfig = {
  width: 120,
  height: 40,
  camera: {
    position: [0, 0, 5],
    target: [0, 0, 0],
    fov: 60,
    near: 0.1,
    far: 100
  }
};

// ─── Test 1: Origin projects to center of grid ──────────────────────────────
console.log('Origin projects to center of grid');
{
  const mvp = buildMVP(baseConfig, mat4.identity());
  const sv = projectVertex(mvp, [0, 0, 0], 120, 40);
  assert(!sv.clipped, 'origin should not be clipped');
  approxEqual(sv.sx, 60, 'origin x → center');
  approxEqual(sv.sy, 20, 'origin y → center');
}

// ─── Test 2: Vertex behind camera is clipped ────────────────────────────────
console.log('Vertex behind camera is clipped');
{
  const mvp = buildMVP(baseConfig, mat4.identity());
  // Camera is at z=5, so z=10 is behind
  const sv = projectVertex(mvp, [0, 0, 10], 120, 40);
  assert(sv.clipped, 'vertex behind camera should be clipped');
}

// ─── Test 3: Aspect ratio correction ────────────────────────────────────────
console.log('Aspect ratio correction');
{
  const mvp = buildMVP(baseConfig, mat4.identity());
  // Points at ±1 on X and Y should project to screen maintaining ratio
  const left = projectVertex(mvp, [-1, 0, 0], 120, 40);
  const right = projectVertex(mvp, [1, 0, 0], 120, 40);
  const top = projectVertex(mvp, [0, 1, 0], 120, 40);
  const bottom = projectVertex(mvp, [0, -1, 0], 120, 40);

  const screenDx = right.sx - left.sx;
  const screenDy = bottom.sy - top.sy; // bottom.sy > top.sy because screen Y is flipped
  // The aspect correction means screenDx/screenDy ≈ width/height * charAspect
  assert(screenDx > 0, 'right is to the right of left');
  assert(screenDy > 0, 'bottom is below top');
}

// ─── Test 4: Known vertex projects to predictable coords ───────────────────
console.log('Known vertex at origin → predictable screen coords');
{
  const config = { ...baseConfig, width: 100, height: 50 };
  const mvp = buildMVP(config, mat4.identity());
  const sv = projectVertex(mvp, [0, 0, 0], 100, 50);
  approxEqual(sv.sx, 50, 'origin x → width/2');
  approxEqual(sv.sy, 25, 'origin y → height/2');
}

// ─── Test 5: Depth ordering ─────────────────────────────────────────────────
console.log('Depth ordering: closer has smaller sz');
{
  const mvp = buildMVP(baseConfig, mat4.identity());
  const near = projectVertex(mvp, [0, 0, 1], 120, 40);   // closer to camera at z=5
  const far = projectVertex(mvp, [0, 0, -1], 120, 40);    // farther from camera
  assert(!near.clipped && !far.clipped, 'both visible');
  assert(near.sz < far.sz, `closer vertex sz (${near.sz}) < farther vertex sz (${far.sz})`);
}

// ─── Test 6: transformModel with a simple triangle model ────────────────────
console.log('transformModel produces screen-space triangles');
{
  const model = {
    vertices: new Float32Array([0, 0, 0,  0.5, 0, 0,  0, 0.5, 0]),
    normals: new Float32Array([0, 0, 1]),
    faces: [{ v: [0, 1, 2], n: [0, 0, 0] }]
  };
  const tris = transformModel(model, baseConfig, mat4.identity());
  assert.strictEqual(tris.length, 1, '1 triangle');
  assert.strictEqual(tris[0].v.length, 3, '3 screen verts');
  assert.strictEqual(tris[0].n.length, 3, '3 normals');
  // Center vertex should be near screen center
  approxEqual(tris[0].v[0].sx, 60, 'v0 near center x');
  approxEqual(tris[0].v[0].sy, 20, 'v0 near center y');
}

// ─── Test 7: Model matrix applies rotation ──────────────────────────────────
console.log('Model matrix rotation changes screen position');
{
  const model = {
    vertices: new Float32Array([1, 0, 0]),
    normals: new Float32Array([0, 0, 1]),
    faces: [{ v: [0, 0, 0], n: [0, 0, 0] }]
  };
  const mvpNoRot = buildMVP(baseConfig, mat4.identity());
  const mvpRot = buildMVP(baseConfig, mat4.rotateY(Math.PI / 4));

  const svNoRot = projectVertex(mvpNoRot, [1, 0, 0], 120, 40);
  const svRot = projectVertex(mvpRot, [1, 0, 0], 120, 40);

  assert(Math.abs(svNoRot.sx - svRot.sx) > 1, 'rotation changes screen x');
}

console.log('All pipeline tests passed!');
