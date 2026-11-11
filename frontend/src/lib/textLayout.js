const CHAR_RATIO = 0.56;
export const LINE_RATIO = 1.25;
const MIN_FONT = 9;
export const SHAPE_TEXT_PAD = 8;

function wrapLines(text, maxChars) {
  const lines = [];
  for (const paragraph of String(text).split('\n')) {
    const words = paragraph.split(/\s+/).filter(Boolean);
    if (words.length === 0) {
      lines.push('');
      continue;
    }
    let line = '';
    for (let word of words) {
      while (word.length > maxChars) {
        if (line) {
          lines.push(line);
          line = '';
        }
        lines.push(word.slice(0, maxChars));
        word = word.slice(maxChars);
      }
      const candidate = line ? `${line} ${word}` : word;
      if (candidate.length > maxChars && line) {
        lines.push(line);
        line = word;
      } else {
        line = candidate;
      }
    }
    lines.push(line);
  }
  return lines;
}

export function innerTextBox(el) {
  const pad = SHAPE_TEXT_PAD;
  return {
    x: el.x + pad,
    y: el.y + pad,
    w: Math.max(1, el.w - pad * 2),
    h: Math.max(1, el.h - pad * 2),
  };
}

// Wraps text to the box width and shrinks the font until it fits the box height.
export function fitLabel(text, width, height, fontSize) {
  let size = fontSize;
  for (;;) {
    const maxChars = Math.max(1, Math.floor(width / (size * CHAR_RATIO)));
    const lines = wrapLines(text, maxChars);
    const lineHeight = size * LINE_RATIO;
    if (lines.length * lineHeight <= height || size <= MIN_FONT) {
      return { lines, fontSize: size, lineHeight };
    }
    size -= 1;
  }
}
