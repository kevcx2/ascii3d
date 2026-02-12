'use strict';

const fs = require('fs');
const { vec3, mat4 } = require('./math');
const { parseOBJ } = require('./obj-parser');
const { renderModel, DEFAULTS } = require('./render');

/**
 * Start an interactive viewer with keyboard controls.
 *
 * Key bindings:
 *   ← / → : Orbit horizontal
 *   ↑ / ↓ : Orbit vertical
 *   + / - : Zoom in/out
 *   r     : Reset camera
 *   b     : Toggle filled/empty background
 *   q/Esc : Quit
 */
function startInteractive(opts) {
  const config = { ...DEFAULTS, ...opts };
  config.camera = { ...DEFAULTS.camera, ...opts.camera };

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
    console.error('No geometry to display');
    process.exit(1);
  }

  // Orbit state
  let orbitH = 0.6;    // horizontal angle (radians) — start at 3/4 view
  let orbitV = 0.4;    // vertical angle (radians)
  let zoom = vec3.length(config.camera.position);
  const orbitStep = 0.1;
  const zoomStep = 0.3;

  const initialOrbitH = orbitH;
  const initialOrbitV = orbitV;
  const initialZoom = zoom;

  function updateCamera() {
    config.camera.position = [
      zoom * Math.sin(orbitH) * Math.cos(orbitV),
      zoom * Math.sin(orbitV),
      zoom * Math.cos(orbitH) * Math.cos(orbitV)
    ];
  }

  let redrawPending = false;

  function scheduleRedraw() {
    if (!redrawPending) {
      redrawPending = true;
      setImmediate(redraw);
    }
  }

  function redraw() {
    redrawPending = false;
    updateCamera();
    config.lightDir = vec3.normalize(config.camera.position);
    const output = renderModel(model, config);
    process.stdout.write(output);
    // Status line
    process.stdout.write(
      `\x1b[${config.height + 1};0H\x1b[K` +
      `  Orbit: H=${(orbitH * 180 / Math.PI).toFixed(0)}° V=${(orbitV * 180 / Math.PI).toFixed(0)}° ` +
      `Zoom: ${zoom.toFixed(1)} | BG: ${config.bgMode} ` +
      `| ←→↑↓ orbit  +/- zoom  b bg  r reset  q quit`
    );
  }

  // Setup terminal
  process.stdout.write('\x1b[?25l');  // hide cursor
  process.stdout.write('\x1b[2J');    // clear screen
  process.stdin.setRawMode(true);
  process.stdin.resume();
  process.stdin.setEncoding('utf8');

  function cleanup() {
    process.stdout.write('\x1b[?25h');  // show cursor
    process.stdout.write('\x1b[0m');    // reset colors
    process.stdin.setRawMode(false);
    process.exit(0);
  }

  process.on('SIGINT', cleanup);
  process.on('SIGTERM', cleanup);

  process.stdin.on('data', (key) => {
    // Escape sequences for arrow keys
    if (key === '\x1b[D') {        // left arrow
      orbitH -= orbitStep;
      scheduleRedraw();
    } else if (key === '\x1b[C') { // right arrow
      orbitH += orbitStep;
      scheduleRedraw();
    } else if (key === '\x1b[A') { // up arrow
      orbitV = Math.min(Math.PI / 2 - 0.01, orbitV + orbitStep);
      scheduleRedraw();
    } else if (key === '\x1b[B') { // down arrow
      orbitV = Math.max(-Math.PI / 2 + 0.01, orbitV - orbitStep);
      scheduleRedraw();
    } else if (key === '+' || key === '=') {
      zoom = Math.max(0.5, zoom - zoomStep);
      scheduleRedraw();
    } else if (key === '-' || key === '_') {
      zoom = Math.min(20, zoom + zoomStep);
      scheduleRedraw();
    } else if (key === 'r') {
      orbitH = initialOrbitH;
      orbitV = initialOrbitV;
      zoom = initialZoom;
      scheduleRedraw();
    } else if (key === 'b') {
      config.bgMode = config.bgMode === 'empty' ? 'filled' : 'empty';
      scheduleRedraw();
    } else if (key === 'q' || key === '\x1b') {
      cleanup();
    } else if (key === '\x03') { // Ctrl+C
      cleanup();
    }
  });

  // Initial draw
  updateCamera();
  redraw();
}

module.exports = { startInteractive };
