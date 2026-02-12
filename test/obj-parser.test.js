'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { parseOBJ } = require('../src/obj-parser');

const EPS = 1e-6;

function approxEqual(a, b, msg) {
  assert(Math.abs(a - b) < EPS, `${msg}: expected ${b}, got ${a}`);
}

// ─── Test 1: Single triangle ────────────────────────────────────────────────
console.log('Parse single triangle');
{
  const obj = `
v 0 0 0
v 1 0 0
v 0 1 0
f 1 2 3
`;
  const result = parseOBJ(obj);
  assert.strictEqual(result.faces.length, 1, '1 face');
  assert.strictEqual(result.vertices.length / 3, 3, '3 vertices');
  assert.deepStrictEqual(result.faces[0].v, [0, 1, 2], 'correct vertex indices');
}

// ─── Test 2: Quad → 2 triangles ─────────────────────────────────────────────
console.log('Parse quad → 2 triangles');
{
  const obj = `
v 0 0 0
v 1 0 0
v 1 1 0
v 0 1 0
f 1 2 3 4
`;
  const result = parseOBJ(obj);
  assert.strictEqual(result.faces.length, 2, 'quad produces 2 triangles');
  assert.deepStrictEqual(result.faces[0].v, [0, 1, 2], 'first tri');
  assert.deepStrictEqual(result.faces[1].v, [0, 2, 3], 'second tri');
}

// ─── Test 3: v//n format ────────────────────────────────────────────────────
console.log('Parse v//n format');
{
  const obj = `
v 0 0 0
v 1 0 0
v 0 1 0
vn 0 0 1
f 1//1 2//1 3//1
`;
  const result = parseOBJ(obj);
  assert.strictEqual(result.faces.length, 1, '1 face');
  assert.deepStrictEqual(result.faces[0].n, [0, 0, 0], 'normal indices correct');
  // Check normal values
  approxEqual(result.normals[0], 0, 'nx');
  approxEqual(result.normals[1], 0, 'ny');
  approxEqual(result.normals[2], 1, 'nz');
}

// ─── Test 4: v/vt/vn format ────────────────────────────────────────────────
console.log('Parse v/vt/vn format');
{
  const obj = `
v 0 0 0
v 1 0 0
v 0 1 0
vt 0 0
vt 1 0
vt 0 1
vn 0 0 1
f 1/1/1 2/2/1 3/3/1
`;
  const result = parseOBJ(obj);
  assert.strictEqual(result.faces.length, 1, '1 face');
  assert.deepStrictEqual(result.faces[0].n, [0, 0, 0], 'normal indices correct');
}

// ─── Test 5: Cube file (8 verts, 6 quads = 12 tris) ────────────────────────
console.log('Parse cube.obj');
{
  const cubeOBJ = fs.readFileSync(path.join(__dirname, 'fixtures', 'cube.obj'), 'utf8');
  const result = parseOBJ(cubeOBJ);
  assert.strictEqual(result.vertices.length / 3, 8, '8 vertices');
  assert.strictEqual(result.faces.length, 12, '12 triangles (6 quads)');
}

// ─── Test 6: Auto-normals ───────────────────────────────────────────────────
console.log('Auto-normal computation');
{
  const obj = `
v 0 0 0
v 1 0 0
v 0 1 0
f 1 2 3
`;
  const result = parseOBJ(obj);
  // Cross of (1,0,0)-(0,0,0) and (0,1,0)-(0,0,0) = (1,0,0) × (0,1,0) = (0,0,1)
  const ni = result.faces[0].n[0];
  approxEqual(result.normals[ni * 3 + 0], 0, 'auto normal x');
  approxEqual(result.normals[ni * 3 + 1], 0, 'auto normal y');
  approxEqual(result.normals[ni * 3 + 2], 1, 'auto normal z');
}

// ─── Test 7: Centering ─────────────────────────────────────────────────────
console.log('Centering: bounding box center near origin');
{
  const obj = `
v 10 20 30
v 12 20 30
v 10 22 30
f 1 2 3
`;
  const result = parseOBJ(obj);
  // Bounding box center should be at origin after centering
  let minX = Infinity, minY = Infinity, minZ = Infinity;
  let maxX = -Infinity, maxY = -Infinity, maxZ = -Infinity;
  const n = result.vertices.length / 3;
  for (let i = 0; i < n; i++) {
    const x = result.vertices[i * 3];
    const y = result.vertices[i * 3 + 1];
    const z = result.vertices[i * 3 + 2];
    if (x < minX) minX = x; if (x > maxX) maxX = x;
    if (y < minY) minY = y; if (y > maxY) maxY = y;
    if (z < minZ) minZ = z; if (z > maxZ) maxZ = z;
  }
  const cx = (minX + maxX) / 2;
  const cy = (minY + maxY) / 2;
  const cz = (minZ + maxZ) / 2;
  assert(Math.abs(cx) < EPS, `bbox center x near 0: ${cx}`);
  assert(Math.abs(cy) < EPS, `bbox center y near 0: ${cy}`);
  assert(Math.abs(cz) < EPS, `bbox center z near 0: ${cz}`);
}

// ─── Test 8: Scaling ────────────────────────────────────────────────────────
console.log('Scaling: no vertex exceeds magnitude 1.0');
{
  const obj = `
v -100 -200 -300
v 100 200 300
v 0 0 0
f 1 2 3
`;
  const result = parseOBJ(obj);
  const n = result.vertices.length / 3;
  for (let i = 0; i < n; i++) {
    const x = Math.abs(result.vertices[i * 3]);
    const y = Math.abs(result.vertices[i * 3 + 1]);
    const z = Math.abs(result.vertices[i * 3 + 2]);
    assert(x <= 1.0 + EPS, `vertex ${i} x=${x} exceeds 1.0`);
    assert(y <= 1.0 + EPS, `vertex ${i} y=${y} exceeds 1.0`);
    assert(z <= 1.0 + EPS, `vertex ${i} z=${z} exceeds 1.0`);
  }
}

// ─── Test 9: Comments and ignored directives ────────────────────────────────
console.log('Comments and ignored directives');
{
  const obj = `
# This is a comment
o MyObject
g Group1
s 1
mtllib material.mtl
usemtl Material1
v 0 0 0
v 1 0 0
v 0 1 0
f 1 2 3
`;
  const result = parseOBJ(obj);
  assert.strictEqual(result.faces.length, 1, '1 face despite extra directives');
  assert.strictEqual(result.vertices.length / 3, 3, '3 vertices');
}

// ─── Test 10: Empty / no faces ──────────────────────────────────────────────
console.log('Empty OBJ');
{
  const result = parseOBJ('');
  assert.strictEqual(result.faces.length, 0, 'no faces');
  assert.strictEqual(result.vertices.length, 0, 'no vertices');
}

console.log('OBJ with vertices but no faces');
{
  const result = parseOBJ('v 1 2 3\nv 4 5 6\n');
  assert.strictEqual(result.faces.length, 0, 'no faces');
  assert.strictEqual(result.vertices.length / 3, 2, '2 vertices');
}

console.log('All OBJ parser tests passed!');
