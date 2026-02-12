#!/usr/bin/env node
'use strict';

const path = require('path');
const { startInteractive } = require('../src/controls');

const objFile = process.argv[2] || path.join(__dirname, '..', 'test', 'fixtures', 'cube.obj');

startInteractive({
  obj: path.resolve(objFile),
  char: '&',
  width: 100,
  height: 35,
  bgMode: 'empty',
  camera: {
    position: [0, 0, 3],
    target: [0, 0, 0],
    fov: 60
  },
  lightDir: [0.5, 0.8, 0.6],
  lightColor: [255, 220, 180],
  ambientColor: [30, 30, 50]
});
