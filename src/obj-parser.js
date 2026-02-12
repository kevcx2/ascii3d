'use strict';

const { vec3 } = require('./math');

/**
 * Parse a Wavefront OBJ string into vertices, normals, and faces.
 * Supports: v, vn, f (triangles & quads), v//n, v/vt/n formats.
 * Auto-computes normals if none present. Centers and scales model to fit [-1, 1].
 */
function parseOBJ(objString) {
  const positions = [];  // array of [x, y, z]
  const normals = [];    // array of [nx, ny, nz]
  const faces = [];      // array of { v: [i0,i1,i2], n: [n0,n1,n2] }

  const lines = objString.split('\n');

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (line === '' || line[0] === '#') continue;

    const parts = line.split(/\s+/);
    const directive = parts[0];

    if (directive === 'v' && parts.length >= 4) {
      positions.push([
        parseFloat(parts[1]),
        parseFloat(parts[2]),
        parseFloat(parts[3])
      ]);
    } else if (directive === 'vn' && parts.length >= 4) {
      normals.push([
        parseFloat(parts[1]),
        parseFloat(parts[2]),
        parseFloat(parts[3])
      ]);
    } else if (directive === 'f' && parts.length >= 4) {
      const faceVerts = [];
      const faceNorms = [];

      for (let j = 1; j < parts.length; j++) {
        const indices = parts[j].split('/');
        const vi = parseInt(indices[0], 10);
        // OBJ is 1-indexed; handle negative indices
        faceVerts.push(vi > 0 ? vi - 1 : positions.length + vi);

        if (indices.length >= 3 && indices[2] !== '') {
          const ni = parseInt(indices[2], 10);
          faceNorms.push(ni > 0 ? ni - 1 : normals.length + ni);
        }
      }

      // Triangulate: fan from first vertex
      for (let j = 1; j < faceVerts.length - 1; j++) {
        const tri = {
          v: [faceVerts[0], faceVerts[j], faceVerts[j + 1]],
          n: faceNorms.length > 0
            ? [faceNorms[0], faceNorms[j], faceNorms[j + 1]]
            : [-1, -1, -1]  // sentinel: needs auto-normal
        };
        faces.push(tri);
      }
    }
    // Ignore: mtllib, usemtl, o, g, s, vt, etc.
  }

  // Auto-compute face normals if OBJ had no vn directives
  const hasNormals = normals.length > 0;
  if (!hasNormals) {
    for (let i = 0; i < faces.length; i++) {
      const f = faces[i];
      const v0 = positions[f.v[0]];
      const v1 = positions[f.v[1]];
      const v2 = positions[f.v[2]];
      const edge1 = vec3.sub(v1, v0);
      const edge2 = vec3.sub(v2, v0);
      const n = vec3.normalize(vec3.cross(edge1, edge2));
      const ni = normals.length;
      normals.push(n);
      f.n = [ni, ni, ni];
    }
  }

  // Center and scale model
  centerAndScale(positions);

  // Flatten to typed arrays
  const vertexArray = new Float32Array(positions.length * 3);
  for (let i = 0; i < positions.length; i++) {
    vertexArray[i * 3]     = positions[i][0];
    vertexArray[i * 3 + 1] = positions[i][1];
    vertexArray[i * 3 + 2] = positions[i][2];
  }

  const normalArray = new Float32Array(normals.length * 3);
  for (let i = 0; i < normals.length; i++) {
    normalArray[i * 3]     = normals[i][0];
    normalArray[i * 3 + 1] = normals[i][1];
    normalArray[i * 3 + 2] = normals[i][2];
  }

  return {
    vertices: vertexArray,
    normals: normalArray,
    faces: faces
  };
}

function centerAndScale(positions) {
  if (positions.length === 0) return;

  // Compute bounding box
  let minX = Infinity, minY = Infinity, minZ = Infinity;
  let maxX = -Infinity, maxY = -Infinity, maxZ = -Infinity;

  for (let i = 0; i < positions.length; i++) {
    const p = positions[i];
    if (p[0] < minX) minX = p[0];
    if (p[1] < minY) minY = p[1];
    if (p[2] < minZ) minZ = p[2];
    if (p[0] > maxX) maxX = p[0];
    if (p[1] > maxY) maxY = p[1];
    if (p[2] > maxZ) maxZ = p[2];
  }

  // Centroid
  const cx = (minX + maxX) / 2;
  const cy = (minY + maxY) / 2;
  const cz = (minZ + maxZ) / 2;

  // Longest axis extent
  const extent = Math.max(maxX - minX, maxY - minY, maxZ - minZ);
  const scale = extent > 0 ? 2.0 / extent : 1.0;

  // Translate to origin and scale to [-1, 1]
  for (let i = 0; i < positions.length; i++) {
    positions[i][0] = (positions[i][0] - cx) * scale;
    positions[i][1] = (positions[i][1] - cy) * scale;
    positions[i][2] = (positions[i][2] - cz) * scale;
  }
}

module.exports = { parseOBJ };
