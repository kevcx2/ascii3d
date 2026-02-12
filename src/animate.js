'use strict';

const fs = require('fs');
const { mat4 } = require('./math');
const { parseOBJ } = require('./obj-parser');
const { renderModel, DEFAULTS } = require('./render');

/**
 * Start an animation loop rotating the model.
 *
 * opts: render options (obj, char, width, height, etc.)
 * animOpts: { rpm, debug }
 */
function startAnimation(opts, animOpts) {
  const config = { ...DEFAULTS, ...opts };
  config.camera = { ...DEFAULTS.camera, ...opts.camera };
  const rpm = animOpts.rpm || 10;
  const debug = animOpts.debug || false;
  const targetFps = 30;
  const frameInterval = 1000 / targetFps;

  // Parse OBJ once
  let objString;
  if (config.obj && config.obj.includes('\n')) {
    objString = config.obj;
  } else if (config.obj) {
    objString = fs.readFileSync(config.obj, 'utf8');
  } else {
    throw new Error('No OBJ data provided');
  }

  const model = parseOBJ(objString);

  if (model.faces.length === 0) {
    console.error('No geometry to animate');
    process.exit(1);
  }

  // Hide cursor, use alternate screen
  process.stdout.write('\x1b[?25l');  // hide cursor
  process.stdout.write('\x1b[2J');    // clear screen

  const startTime = Date.now();

  function cleanup() {
    process.stdout.write('\x1b[?25h');  // show cursor
    process.stdout.write('\x1b[0m');    // reset colors
    process.exit(0);
  }

  // Handle clean exit
  process.on('SIGINT', cleanup);
  process.on('SIGTERM', cleanup);

  let frameCount = 0;

  function frame() {
    const frameStart = Date.now();
    const elapsed = (frameStart - startTime) / 1000; // seconds

    // Rotation angle: rpm → radians
    const angle = (elapsed * rpm * 2 * Math.PI) / 60;

    // Slight tilt for better 3D appearance
    const modelMatrix = mat4.multiply(
      mat4.rotateY(angle),
      mat4.rotateX(0.4)
    );

    config.modelMatrix = modelMatrix;
    const output = renderModel(model, config);

    process.stdout.write(output);

    frameCount++;

    if (debug) {
      const frameTime = Date.now() - frameStart;
      process.stdout.write(`\x1b[${config.height + 1};0HFrame ${frameCount} | ${frameTime}ms | ${(1000 / frameTime).toFixed(0)} fps potential`);
    }

    const frameTime = Date.now() - frameStart;
    const delay = Math.max(0, frameInterval - frameTime);
    setTimeout(frame, delay);
  }

  frame();
}

module.exports = { startAnimation };
