'use strict';

/**
 * Detect terminal color capability.
 * Returns 'truecolor', '256', or 'none'.
 */
function detectColorMode() {
  const colorterm = (process.env.COLORTERM || '').toLowerCase();
  if (colorterm === 'truecolor' || colorterm === '24bit') {
    return 'truecolor';
  }
  const term = (process.env.TERM || '').toLowerCase();
  if (term.includes('truecolor') || term.includes('24bit')) {
    return 'truecolor';
  }
  // Most modern terminals support at least 256 colors
  return '256';
}

/**
 * Convert RGB to nearest 256-color palette index.
 * Uses the 6x6x6 color cube (indices 16-231).
 */
function rgb256(r, g, b) {
  const r6 = Math.round(r / 255 * 5);
  const g6 = Math.round(g / 255 * 5);
  const b6 = Math.round(b / 255 * 5);
  return 16 + 36 * r6 + 6 * g6 + b6;
}

/**
 * Convert RGB color buffer + hit buffer to an ANSI string.
 *
 * config: { char, bgMode, width, height, colorMode }
 *   colorMode: 'truecolor' | '256' | 'auto' (default: 'auto')
 */
function toANSI(colorBuf, hitBuf, config) {
  const width = config.width;
  const height = config.height;
  const char = config.char || '&';
  const bgMode = config.bgMode || 'empty';

  let colorMode = config.colorMode || 'auto';
  if (colorMode === 'auto') {
    colorMode = detectColorMode();
  }
  const useTruecolor = colorMode === 'truecolor';

  const parts = ['\x1b[H']; // cursor home

  let prevCode = -1; // tracks previous color escape to skip duplicates

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = y * width + x;
      const ci = idx * 3;

      if (hitBuf[idx] || bgMode === 'filled') {
        const r = colorBuf[ci];
        const g = colorBuf[ci + 1];
        const b = colorBuf[ci + 2];

        if (useTruecolor) {
          // Pack into single int for fast comparison
          const code = (r << 16) | (g << 8) | b;
          if (code !== prevCode) {
            parts.push(`\x1b[38;2;${r};${g};${b}m`);
            prevCode = code;
          }
        } else {
          const code = rgb256(r, g, b);
          if (code !== prevCode) {
            parts.push(`\x1b[38;5;${code}m`);
            prevCode = code;
          }
        }
        parts.push(char);
      } else {
        // Empty mode: output space
        if (prevCode !== -1) {
          parts.push('\x1b[0m');
          prevCode = -1;
        }
        parts.push(' ');
      }
    }
    parts.push('\x1b[K\n'); // clear to end of line, then newline
  }

  parts.push('\x1b[0m'); // reset at end
  return parts.join('');
}

module.exports = { toANSI, detectColorMode, rgb256 };
