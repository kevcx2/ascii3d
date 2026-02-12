'use strict';

const assert = require('assert');
const { vec3, mat4 } = require('../src/math');

const EPS = 1e-6;

function approxEqual(a, b, msg) {
  assert(Math.abs(a - b) < EPS, `${msg}: expected ${b}, got ${a}`);
}

function approxVec3(a, b, msg) {
  approxEqual(a[0], b[0], `${msg} [x]`);
  approxEqual(a[1], b[1], `${msg} [y]`);
  approxEqual(a[2], b[2], `${msg} [z]`);
}

function approxMat4(a, b, msg) {
  for (let i = 0; i < 16; i++) {
    approxEqual(a[i], b[i], `${msg} [${i}]`);
  }
}

// ─── vec3 tests ─────────────────────────────────────────────────────────────

console.log('vec3.add');
approxVec3(vec3.add([1, 2, 3], [4, 5, 6]), [5, 7, 9], 'add');

console.log('vec3.sub');
approxVec3(vec3.sub([5, 7, 9], [4, 5, 6]), [1, 2, 3], 'sub');

console.log('vec3.scale');
approxVec3(vec3.scale([1, 2, 3], 2), [2, 4, 6], 'scale');

console.log('vec3.dot');
approxEqual(vec3.dot([1, 0, 0], [0, 1, 0]), 0, 'dot perpendicular');
approxEqual(vec3.dot([1, 2, 3], [4, 5, 6]), 32, 'dot general');

console.log('vec3.cross');
approxVec3(vec3.cross([1, 0, 0], [0, 1, 0]), [0, 0, 1], 'cross x×y=z');
approxVec3(vec3.cross([0, 1, 0], [0, 0, 1]), [1, 0, 0], 'cross y×z=x');
approxVec3(vec3.cross([0, 0, 1], [1, 0, 0]), [0, 1, 0], 'cross z×x=y');

console.log('vec3.length');
approxEqual(vec3.length([3, 4, 0]), 5, 'length 3-4-5');

console.log('vec3.normalize');
approxVec3(vec3.normalize([3, 4, 0]), [0.6, 0.8, 0], 'normalize 3-4-0');
approxVec3(vec3.normalize([0, 0, 0]), [0, 0, 0], 'normalize zero');

// ─── mat4 tests ─────────────────────────────────────────────────────────────

console.log('mat4.identity multiply');
{
  const id = mat4.identity();
  const m = mat4.translate(1, 2, 3);
  approxMat4(mat4.multiply(id, m), m, 'identity * m = m');
  approxMat4(mat4.multiply(m, id), m, 'm * identity = m');
}

console.log('mat4.transformPoint with identity');
{
  const id = mat4.identity();
  const p = [7, -3, 2.5];
  approxVec3(mat4.transformPoint(id, p), p, 'identity transform');
}

console.log('mat4.perspective + lookAt: origin projects to screen center');
{
  const eye = [0, 0, 5];
  const target = [0, 0, 0];
  const up = [0, 1, 0];
  const view = mat4.lookAt(eye, target, up);
  const proj = mat4.perspective(60, 1, 0.1, 100);
  const mvp = mat4.multiply(proj, view);

  const ndc = mat4.transformPoint(mvp, [0, 0, 0]);
  approxEqual(ndc[0], 0, 'origin projects to NDC x=0');
  approxEqual(ndc[1], 0, 'origin projects to NDC y=0');
}

console.log('mat4.translate');
{
  const m = mat4.translate(10, 20, 30);
  approxVec3(mat4.transformPoint(m, [0, 0, 0]), [10, 20, 30], 'translate origin');
  approxVec3(mat4.transformPoint(m, [1, 2, 3]), [11, 22, 33], 'translate point');
}

console.log('mat4.rotateY 90 degrees');
{
  const m = mat4.rotateY(Math.PI / 2);
  const p = mat4.transformPoint(m, [1, 0, 0]);
  approxVec3(p, [0, 0, -1], 'rotateY 90 on x-axis');
}

console.log('mat4.transformDirection (no translation)');
{
  const m = mat4.translate(100, 200, 300);
  const d = mat4.transformDirection(m, [1, 0, 0]);
  approxVec3(d, [1, 0, 0], 'direction unaffected by translation');
}

console.log('mat4.transformPoint4');
{
  const proj = mat4.perspective(60, 1, 0.1, 100);
  const view = mat4.lookAt([0, 0, 5], [0, 0, 0], [0, 1, 0]);
  const mvp = mat4.multiply(proj, view);
  const clip = mat4.transformPoint4(mvp, [0, 0, 0]);
  // w should be positive for a point in front of camera
  assert(clip[3] > 0, 'w > 0 for point in front of camera');
}

console.log('depth ordering');
{
  const proj = mat4.perspective(60, 1, 0.1, 100);
  const view = mat4.lookAt([0, 0, 5], [0, 0, 0], [0, 1, 0]);
  const mvp = mat4.multiply(proj, view);

  const nearP = mat4.transformPoint(mvp, [0, 0, 1]);  // closer to camera
  const farP = mat4.transformPoint(mvp, [0, 0, -1]);  // farther from camera
  assert(nearP[2] < farP[2], 'closer point has smaller z in NDC');
}

console.log('All math tests passed!');
