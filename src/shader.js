'use strict';

const { vec3 } = require('./math');

/**
 * Shade the framebuffer, producing an RGB color buffer.
 *
 * config: { lightDir, lightColor, ambientColor, bgColor, bgMode }
 * Returns Uint8Array(width * height * 3) — flat RGB.
 */
function shade(fb, config) {
  const width = fb.width;
  const height = fb.height;
  const size = width * height;
  const colorBuf = new Uint8Array(size * 3);

  const lightDir = vec3.normalize(config.lightDir || [0.5, 0.8, -0.6]);
  const lightColor = config.lightColor || [255, 200, 150];
  const ambientColor = config.ambientColor || [30, 30, 50];
  const bgColor = config.bgColor || [20, 20, 30];
  const bgMode = config.bgMode || 'empty';

  for (let i = 0; i < size; i++) {
    const ci = i * 3;

    if (fb.hitBuf[i]) {
      // Lit cell: compute diffuse shading
      const ni = i * 3;
      const nx = fb.normalBuf[ni];
      const ny = fb.normalBuf[ni + 1];
      const nz = fb.normalBuf[ni + 2];

      const diffuse = Math.max(0, nx * lightDir[0] + ny * lightDir[1] + nz * lightDir[2]);

      colorBuf[ci]     = clamp(ambientColor[0] + diffuse * lightColor[0]);
      colorBuf[ci + 1] = clamp(ambientColor[1] + diffuse * lightColor[1]);
      colorBuf[ci + 2] = clamp(ambientColor[2] + diffuse * lightColor[2]);
    } else if (bgMode === 'filled') {
      colorBuf[ci]     = bgColor[0];
      colorBuf[ci + 1] = bgColor[1];
      colorBuf[ci + 2] = bgColor[2];
    }
    // else: empty mode, color stays 0,0,0 (irrelevant — will be space)
  }

  return colorBuf;
}

function clamp(v) {
  return Math.min(255, Math.max(0, Math.round(v)));
}

module.exports = { shade };
