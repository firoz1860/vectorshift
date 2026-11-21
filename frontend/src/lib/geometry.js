// Geometry helpers shared by the store and canvas: axis-aligned bounds,
// unions, translation and scaling. All values are in canvas/world coordinates
// (never screen pixels), so they stay correct under pan and zoom.

// Axis-aligned bounding box for any element, or null for types without a box
// (connections derive their geometry from the shapes they link).
export function elementBounds(el) {
  if (!el) return null;
  if (el.type === 'connection') return null;
  if (el.type === 'pen') {
    const pts = el.points || [];
    if (pts.length === 0) return null;
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;
    for (const p of pts) {
      if (p.x < minX) minX = p.x;
      if (p.y < minY) minY = p.y;
      if (p.x > maxX) maxX = p.x;
      if (p.y > maxY) maxY = p.y;
    }
    return { x: minX, y: minY, w: maxX - minX, h: maxY - minY };
  }
  if (el.type === 'arrow' || el.type === 'line') {
    return {
      x: Math.min(el.x, el.x + el.w),
      y: Math.min(el.y, el.y + el.h),
      w: Math.abs(el.w),
      h: Math.abs(el.h),
    };
  }
  return { x: el.x, y: el.y, w: el.w || 0, h: el.h || 0 };
}

// Combined bounding box of several elements (ignores boxless ones).
export function unionBounds(elements) {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  let found = false;
  for (const el of elements) {
    const b = elementBounds(el);
    if (!b) continue;
    found = true;
    if (b.x < minX) minX = b.x;
    if (b.y < minY) minY = b.y;
    if (b.x + b.w > maxX) maxX = b.x + b.w;
    if (b.y + b.h > maxY) maxY = b.y + b.h;
  }
  if (!found) return null;
  return { x: minX, y: minY, w: maxX - minX, h: maxY - minY };
}

// True when two axis-aligned boxes overlap at all.
export function boxesIntersect(a, b) {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

// True when box `inner` is fully inside box `outer`.
export function boxContains(outer, inner) {
  return (
    inner.x >= outer.x &&
    inner.y >= outer.y &&
    inner.x + inner.w <= outer.x + outer.w &&
    inner.y + inner.h <= outer.y + outer.h
  );
}

// Returns a copy of `el` moved by (dx, dy) in world coordinates. Handles every
// element type including freehand points; connections carry no own geometry.
export function translateElement(el, dx, dy) {
  if (el.type === 'connection') return el;
  if (el.type === 'pen') {
    return { ...el, points: (el.points || []).map((p) => ({ x: p.x + dx, y: p.y + dy })) };
  }
  return { ...el, x: el.x + dx, y: el.y + dy };
}

// Scales a copy of `el` around origin (ox, oy) by factors (sx, sy). Used for
// resizing a multi-object selection as one unit while preserving each object's
// relative position and proportions within the group.
export function scaleElement(el, ox, oy, sx, sy) {
  if (el.type === 'connection') return el;
  if (el.type === 'pen') {
    return {
      ...el,
      points: (el.points || []).map((p) => ({
        x: ox + (p.x - ox) * sx,
        y: oy + (p.y - oy) * sy,
      })),
    };
  }
  const nx = ox + (el.x - ox) * sx;
  const ny = oy + (el.y - oy) * sy;
  if (el.type === 'arrow' || el.type === 'line') {
    return { ...el, x: nx, y: ny, w: el.w * sx, h: el.h * sy };
  }
  return { ...el, x: nx, y: ny, w: Math.max(1, (el.w || 0) * sx), h: Math.max(1, (el.h || 0) * sy) };
}
