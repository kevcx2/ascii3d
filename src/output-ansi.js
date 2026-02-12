'use strict';

/**
 * Convert RGB color buffer + hit buffer to an ANSI truecolor string.
 *
 * config: { char, bgMode, width, height }
 */
function toANSI(colorBuf, hitBuf, config) {
  const width = config.width;
  const height = config.height;
  const char = config.char || '&';
  const bgMode = config.bgMode || 'empty';

  const parts = ['\x1b[H']; // cursor home

  let prevR = -1, prevG = -1, prevB = -1;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = y * width + x;
      const ci = idx * 3;

      if (hitBuf[idx] || bgMode === 'filled') {
        const r = colorBuf[ci];
        const g = colorBuf[ci + 1];
        const b = colorBuf[ci + 2];

        // Run-length optimization: skip escape if same color as previous
        if (r !== prevR || g !== prevG || b !== prevB) {
          parts.push(`\x1b[38;2;${r};${g};${b}m`);
          prevR = r;
          prevG = g;
          prevB = b;
        }
        parts.push(char);
      } else {
        // Empty mode: output space
        if (prevR !== -1) {
          parts.push('\x1b[0m');
          prevR = -1; prevG = -1; prevB = -1;
        }
        parts.push(' ');
      }
    }
    parts.push('\n');
  }

  parts.push('\x1b[0m'); // reset at end
  return parts.join('');
}

module.exports = { toANSI };
