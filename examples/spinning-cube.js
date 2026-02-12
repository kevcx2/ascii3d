#!/usr/bin/env node
'use strict';

const path = require('path');
const { startAnimation } = require('../src/animate');

const cubeObj = path.join(__dirname, '..', 'test', 'fixtures', 'cube.obj');

startAnimation({
  obj: cubeObj,
  char: '&',
  width: 80,
  height: 30,
  bgMode: 'empty',
  camera: {
    position: [0, 0, 3],
    target: [0, 0, 0],
    fov: 60
  },
  lightDir: [0.5, 0.8, 0.6],
  lightColor: [255, 200, 150],
  ambientColor: [30, 30, 50]
}, {
  rpm: 10,
  debug: false
});
