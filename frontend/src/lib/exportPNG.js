export function exportPNG(elements) {
  const svg = document.querySelector('.whiteboard-svg');
  if (!svg || elements.length === 0) return;

  const clone = svg.cloneNode(true);
  const bg = clone.querySelector('[data-bg]');
  if (bg) bg.remove();

  const xs = elements.filter((e) => e.x !== undefined).map((e) => e.x);
  const ys = elements.filter((e) => e.y !== undefined).map((e) => e.y);
  const ws = elements.filter((e) => e.w !== undefined).map((e) => e.x + e.w);
  const hs = elements.filter((e) => e.h !== undefined).map((e) => e.y + e.h);
  const penPts = elements.filter((e) => e.type === 'pen').flatMap((e) => e.points || []);
  penPts.forEach((p) => { xs.push(p.x); ys.push(p.y); ws.push(p.x); hs.push(p.y); });

  const minX = Math.min(...xs) - 40;
  const minY = Math.min(...ys) - 40;
  const maxX = Math.max(...ws) + 40;
  const maxY = Math.max(...hs) + 40;
  const width = maxX - minX;
  const height = maxY - minY;

  clone.setAttribute('viewBox', `${minX} ${minY} ${width} ${height}`);
  clone.setAttribute('width', width);
  clone.setAttribute('height', height);

  const g = clone.querySelector('g:not([data-bg])');
  if (g) g.removeAttribute('transform');

  const bgRect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
  bgRect.setAttribute('x', minX);
  bgRect.setAttribute('y', minY);
  bgRect.setAttribute('width', width);
  bgRect.setAttribute('height', height);
  bgRect.setAttribute('fill', '#ffffff');
  clone.insertBefore(bgRect, clone.firstChild);

  const svgString = new XMLSerializer().serializeToString(clone);
  const blob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
  const url = URL.createObjectURL(blob);

  const img = new Image();
  img.onload = () => {
    const canvas = document.createElement('canvas');
    const scale = 2;
    canvas.width = width * scale;
    canvas.height = height * scale;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.scale(scale, scale);
    ctx.drawImage(img, 0, 0);
    URL.revokeObjectURL(url);

    canvas.toBlob((pngBlob) => {
      const pngUrl = URL.createObjectURL(pngBlob);
      const a = document.createElement('a');
      a.href = pngUrl;
      a.download = `whiteboard-${Date.now()}.png`;
      a.click();
      URL.revokeObjectURL(pngUrl);
    }, 'image/png');
  };
  img.src = url;
}
