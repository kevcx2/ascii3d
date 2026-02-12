'use strict';

const fs = require('fs');
const { mat4 } = require('./math');
const { parseOBJ } = require('./obj-parser');
const { transformModel } = require('./pipeline');
const { createFramebuffer, clearFramebuffer, rasterize } = require('./rasterizer');
const { shade } = require('./shader');
const { toANSI } = require('./output-ansi');
const { toHTML } = require('./output-html');

const DEFAULTS = {
  char: '&',
  width: 120,
  height: 40,
  bgMode: 'empty',
  bgColor: [20, 20, 20],
  lightDir: [0.5, 0.8, 0.6],
  lightColor: [255, 255, 255],
  ambientColor: [40, 40, 40],
  colorMode: 'auto',
  output: 'ansi',
  camera: {
    position: [0, 0, 3],
    target: [0, 0, 0],
    fov: 60,
    near: 0.1,
    far: 100
  }
};

/**
 * Render a single frame.
 *
 * opts.obj — file path or OBJ string
 * opts.modelMatrix — optional pre-built model matrix (Float64Array[16])
 * Returns the output string (ANSI or HTML).
 */
function render(opts) {
  const config = { ...DEFAULTS, ...opts };
  config.camera = { ...DEFAULTS.camera, ...opts.camera };

  // Parse OBJ
  let objString;
  if (config.obj && config.obj.includes('\n')) {
    objString = config.obj;
  } else if (config.obj) {
    objString = fs.readFileSync(config.obj, 'utf8');
  } else {
    throw new Error('No OBJ data provided (use obj: path or obj: string)');
  }

  const model = parseOBJ(objString);

  if (model.faces.length === 0) {
    // No geometry — return blank frame
    const fb = createFramebuffer(config.width, config.height);
    const colorBuf = shade(fb, config);
    if (config.output === 'html') {
      return toHTML(colorBuf, fb.hitBuf, config);
    }
    return toANSI(colorBuf, fb.hitBuf, config);
  }

  return renderModel(model, config);
}

/**
 * Render a pre-parsed model. Useful for animation (avoids re-parsing).
 */
function renderModel(model, config) {
  const modelMatrix = config.modelMatrix || mat4.identity();

  // Transform vertices
  const triangles = transformModel(model, config, modelMatrix);

  // Rasterize
  const fb = createFramebuffer(config.width, config.height);
  rasterize(fb, triangles);

  // Shade
  const colorBuf = shade(fb, config);

  // Output
  if (config.output === 'html') {
    return toHTML(colorBuf, fb.hitBuf, config);
  }
  return toANSI(colorBuf, fb.hitBuf, config);
}

module.exports = { render, renderModel, parseOBJ, DEFAULTS };
