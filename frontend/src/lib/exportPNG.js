const SVG_NS = 'http://www.w3.org/2000/svg';

// Wait for React to repaint (e.g. after clearing the selection).
export const nextFrame = () =>
  new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));

function getBounds(elements) {
  const xs = [];
  const ys = [];
  for (const e of elements) {
    if (e.type === 'pen') {
      (e.points || []).forEach((p) => { xs.push(p.x); ys.push(p.y); });
    } else if (typeof e.x === 'number' && typeof e.y === 'number') {
      xs.push(e.x, e.x + (e.w || 0));
      ys.push(e.y, e.y + (e.h || 0));
    }
  }
  if (xs.length === 0) return null;
  const pad = 40;
  const minX = Math.min(...xs) - pad;
  const minY = Math.min(...ys) - pad;
  return { minX, minY, width: Math.max(...xs) + pad - minX, height: Math.max(...ys) + pad - minY };
}

// Renders the whiteboard SVG to a canvas. Resolves to null if there is nothing to draw.
function renderToCanvas(elements, { scale = 2, maxWidth, maxHeight } = {}) {
  return new Promise((resolve, reject) => {
    const svg = document.querySelector('.whiteboard-svg');
    const b = getBounds(elements);
    if (!svg || !b) return resolve(null);

    const clone = svg.cloneNode(true);
    clone.querySelector('[data-bg]')?.remove();
    clone.setAttribute('xmlns', SVG_NS);
    clone.setAttribute('viewBox', `${b.minX} ${b.minY} ${b.width} ${b.height}`);
    clone.setAttribute('width', b.width);
    clone.setAttribute('height', b.height);
    clone.removeAttribute('style');
    clone.removeAttribute('class');
    clone.querySelector('g:not([data-bg])')?.removeAttribute('transform');

    const bg = document.createElementNS(SVG_NS, 'rect');
    bg.setAttribute('x', b.minX);
    bg.setAttribute('y', b.minY);
    bg.setAttribute('width', b.width);
    bg.setAttribute('height', b.height);
    bg.setAttribute('fill', '#ffffff');
    clone.insertBefore(bg, clone.firstChild);

    let s = scale;
    if (maxWidth && maxHeight) s = Math.min(maxWidth / b.width, maxHeight / b.height);
    s = Math.min(s, 8192 / Math.max(b.width, b.height)); // browser canvas size safety

    const url = URL.createObjectURL(
      new Blob([new XMLSerializer().serializeToString(clone)], { type: 'image/svg+xml;charset=utf-8' })
    );
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = Math.max(1, Math.round(b.width * s));
      canvas.height = Math.max(1, Math.round(b.height * s));
      const ctx = canvas.getContext('2d');
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      URL.revokeObjectURL(url);
      resolve(canvas);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Could not render the board image'));
    };
    img.src = url;
  });
}

export async function exportPNG(elements) {
  const canvas = await renderToCanvas(elements, { scale: 2 });
  if (!canvas) return;
  canvas.toBlob((blob) => {
    if (!blob) return;
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `whiteboard-${Date.now()}.png`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  }, 'image/png');
}

// Small JPEG data-URL for the saved-boards list. Returns null on any failure
// so saving a board never breaks because of a preview image.
export async function makeThumbnail(elements) {
  try {
    const canvas = await renderToCanvas(elements, { maxWidth: 320, maxHeight: 200 });
    return canvas ? canvas.toDataURL('image/jpeg', 0.7) : null;
  } catch {
    return null;
  }
}
