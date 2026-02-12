'use strict';

/**
 * Convert RGB color buffer + hit buffer to an HTML string.
 *
 * config: { char, bgMode, width, height }
 */
function toHTML(colorBuf, hitBuf, config) {
  const width = config.width;
  const height = config.height;
  const char = config.char || '&';
  const htmlChar = escapeHTML(char);
  const bgMode = config.bgMode || 'empty';

  const parts = [
    '<pre style="font-family:monospace;line-height:1;background:#000;display:inline-block;padding:4px;">'
  ];

  let prevR = -1, prevG = -1, prevB = -1;
  let spanOpen = false;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = y * width + x;
      const ci = idx * 3;

      if (hitBuf[idx] || bgMode === 'filled') {
        const r = colorBuf[ci];
        const g = colorBuf[ci + 1];
        const b = colorBuf[ci + 2];

        if (r !== prevR || g !== prevG || b !== prevB) {
          if (spanOpen) parts.push('</span>');
          parts.push(`<span style="color:rgb(${r},${g},${b})">`);
          spanOpen = true;
          prevR = r; prevG = g; prevB = b;
        }
        parts.push(htmlChar);
      } else {
        if (spanOpen) {
          parts.push('</span>');
          spanOpen = false;
          prevR = -1; prevG = -1; prevB = -1;
        }
        parts.push(' ');
      }
    }
    if (spanOpen) {
      parts.push('</span>');
      spanOpen = false;
      prevR = -1; prevG = -1; prevB = -1;
    }
    parts.push('\n');
  }

  parts.push('</pre>');
  return parts.join('');
}

function escapeHTML(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

module.exports = { toHTML };
