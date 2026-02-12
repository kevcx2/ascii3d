'use strict';

const { vec3, mat4 } = require('./math');

const CHAR_ASPECT = 0.5; // terminal chars are ~2x tall as wide

/**
 * Build the MVP matrix from config and model matrix.
 */
function buildMVP(config, modelMatrix) {
  const cam = config.camera;
  const aspect = (config.width / config.height) * CHAR_ASPECT;

  const view = mat4.lookAt(cam.position, cam.target, [0, 1, 0]);
  const proj = mat4.perspective(cam.fov, aspect, cam.near || 0.1, cam.far || 100);

  const mv = mat4.multiply(view, modelMatrix);
  return mat4.multiply(proj, mv);
}

/**
 * Transform a single vertex from model space to screen coordinates.
 * Returns { sx, sy, sz, clipped } where sx,sy are screen-space ints,
 * sz is clip-space depth for z-buffer, and clipped is true if behind near plane.
 */
function projectVertex(mvp, vertex, width, height) {
  const clip = mat4.transformPoint4(mvp, vertex);

  // Behind camera (w <= 0)
  if (clip[3] <= 0) {
    return { sx: 0, sy: 0, sz: 0, clipped: true };
  }

  // Perspective divide → NDC [-1, 1]
  const ndcX = clip[0] / clip[3];
  const ndcY = clip[1] / clip[3];
  const ndcZ = clip[2] / clip[3];

  // Viewport transform: NDC → screen
  const sx = ((ndcX + 1) * 0.5) * width;
  const sy = ((1 - ndcY) * 0.5) * height; // flip Y: NDC +Y is up, screen +Y is down

  return { sx, sy, sz: ndcZ, clipped: false };
}

/**
 * Transform an entire parsed OBJ model through the pipeline.
 * Returns array of screen-space triangles ready for rasterization.
 *
 * Each triangle: { v: [{sx,sy,sz}, ...], n: [[nx,ny,nz], ...] }
 */
function transformModel(model, config, modelMatrix) {
  const mvp = buildMVP(config, modelMatrix);
  const width = config.width;
  const height = config.height;

  // Get the normal matrix (model matrix only, for world-space normals)
  const normalMatrix = modelMatrix;

  const triangles = [];

  for (let i = 0; i < model.faces.length; i++) {
    const face = model.faces[i];

    // Project 3 vertices
    const screenVerts = [];
    let anyClipped = false;

    for (let j = 0; j < 3; j++) {
      const vi = face.v[j];
      const vertex = [
        model.vertices[vi * 3],
        model.vertices[vi * 3 + 1],
        model.vertices[vi * 3 + 2]
      ];

      const sv = projectVertex(mvp, vertex, width, height);
      if (sv.clipped) { anyClipped = true; break; }
      screenVerts.push(sv);
    }

    if (anyClipped) continue;

    // Transform normals to world space
    const worldNormals = [];
    for (let j = 0; j < 3; j++) {
      const ni = face.n[j];
      const normal = [
        model.normals[ni * 3],
        model.normals[ni * 3 + 1],
        model.normals[ni * 3 + 2]
      ];
      worldNormals.push(mat4.transformDirection(normalMatrix, normal));
    }

    triangles.push({
      v: screenVerts,
      n: worldNormals
    });
  }

  return triangles;
}

module.exports = { buildMVP, projectVertex, transformModel, CHAR_ASPECT };
