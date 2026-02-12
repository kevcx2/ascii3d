'use strict';

// ─── vec3 ───────────────────────────────────────────────────────────────────

const vec3 = {
  add(a, b) {
    return [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
  },

  sub(a, b) {
    return [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
  },

  scale(v, s) {
    return [v[0] * s, v[1] * s, v[2] * s];
  },

  dot(a, b) {
    return a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
  },

  cross(a, b) {
    return [
      a[1] * b[2] - a[2] * b[1],
      a[2] * b[0] - a[0] * b[2],
      a[0] * b[1] - a[1] * b[0]
    ];
  },

  length(v) {
    return Math.sqrt(v[0] * v[0] + v[1] * v[1] + v[2] * v[2]);
  },

  normalize(v) {
    const len = vec3.length(v);
    if (len === 0) return [0, 0, 0];
    return [v[0] / len, v[1] / len, v[2] / len];
  }
};

// ─── mat4 ───────────────────────────────────────────────────────────────────
// Matrices are stored as 16-element Float64Arrays in column-major order
// (matching OpenGL convention): index = col * 4 + row

const mat4 = {
  identity() {
    const m = new Float64Array(16);
    m[0] = 1; m[5] = 1; m[10] = 1; m[15] = 1;
    return m;
  },

  multiply(a, b) {
    const out = new Float64Array(16);
    for (let col = 0; col < 4; col++) {
      for (let row = 0; row < 4; row++) {
        out[col * 4 + row] =
          a[0 * 4 + row] * b[col * 4 + 0] +
          a[1 * 4 + row] * b[col * 4 + 1] +
          a[2 * 4 + row] * b[col * 4 + 2] +
          a[3 * 4 + row] * b[col * 4 + 3];
      }
    }
    return out;
  },

  translate(x, y, z) {
    const m = mat4.identity();
    m[12] = x;
    m[13] = y;
    m[14] = z;
    return m;
  },

  rotateX(angle) {
    const m = mat4.identity();
    const c = Math.cos(angle);
    const s = Math.sin(angle);
    m[5] = c;  m[9] = -s;
    m[6] = s;  m[10] = c;
    return m;
  },

  rotateY(angle) {
    const m = mat4.identity();
    const c = Math.cos(angle);
    const s = Math.sin(angle);
    m[0] = c;   m[8] = s;
    m[2] = -s;  m[10] = c;
    return m;
  },

  rotateZ(angle) {
    const m = mat4.identity();
    const c = Math.cos(angle);
    const s = Math.sin(angle);
    m[0] = c;  m[4] = -s;
    m[1] = s;  m[5] = c;
    return m;
  },

  scale(x, y, z) {
    const m = mat4.identity();
    m[0] = x;
    m[5] = y;
    m[10] = z;
    return m;
  },

  perspective(fovDeg, aspect, near, far) {
    const fovRad = (fovDeg * Math.PI) / 180;
    const f = 1.0 / Math.tan(fovRad / 2);
    const rangeInv = 1.0 / (near - far);

    const m = new Float64Array(16);
    m[0] = f / aspect;
    m[5] = f;
    m[10] = (near + far) * rangeInv;
    m[11] = -1;
    m[14] = 2 * near * far * rangeInv;
    return m;
  },

  lookAt(eye, target, up) {
    const zAxis = vec3.normalize(vec3.sub(eye, target));
    const xAxis = vec3.normalize(vec3.cross(up, zAxis));
    const yAxis = vec3.cross(zAxis, xAxis);

    const m = new Float64Array(16);
    m[0] = xAxis[0]; m[4] = xAxis[1]; m[8]  = xAxis[2]; m[12] = -vec3.dot(xAxis, eye);
    m[1] = yAxis[0]; m[5] = yAxis[1]; m[9]  = yAxis[2]; m[13] = -vec3.dot(yAxis, eye);
    m[2] = zAxis[0]; m[6] = zAxis[1]; m[10] = zAxis[2]; m[14] = -vec3.dot(zAxis, eye);
    m[3] = 0;        m[7] = 0;        m[11] = 0;        m[15] = 1;
    return m;
  },

  transformPoint(m, p) {
    const x = p[0], y = p[1], z = p[2];
    const w = m[3] * x + m[7] * y + m[11] * z + m[15];
    return [
      (m[0] * x + m[4] * y + m[8]  * z + m[12]) / w,
      (m[1] * x + m[5] * y + m[9]  * z + m[13]) / w,
      (m[2] * x + m[6] * y + m[10] * z + m[14]) / w
    ];
  },

  // Transform direction (no translation, for normals)
  transformDirection(m, d) {
    const x = d[0], y = d[1], z = d[2];
    return vec3.normalize([
      m[0] * x + m[4] * y + m[8]  * z,
      m[1] * x + m[5] * y + m[9]  * z,
      m[2] * x + m[6] * y + m[10] * z
    ]);
  },

  // Transform point returning [x, y, z, w] without perspective divide
  transformPoint4(m, p) {
    const x = p[0], y = p[1], z = p[2];
    return [
      m[0] * x + m[4] * y + m[8]  * z + m[12],
      m[1] * x + m[5] * y + m[9]  * z + m[13],
      m[2] * x + m[6] * y + m[10] * z + m[14],
      m[3] * x + m[7] * y + m[11] * z + m[15]
    ];
  }
};

module.exports = { vec3, mat4 };
