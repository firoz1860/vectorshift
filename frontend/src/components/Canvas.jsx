import { useRef, useState, useEffect, useCallback } from 'react';
import { useStore } from '../lib/store';
import { shapePath } from '../lib/svgPaths';
import { LABELED_TYPES, snapToEightWays } from '../lib/shapes';
import { fitLabel, innerTextBox, measureText, SHAPE_TEXT_PAD, LINE_RATIO } from '../lib/textLayout';
import { elementBounds, unionBounds, scaleElement, boxesIntersect } from '../lib/geometry';
import { Minus, Plus, Maximize, Scan } from 'lucide-react';

const SHAPE_TOOLS = ['rectangle','rounded','circle','cylinder','diamond','parallelogram','cloud','hexagon','arrow','text','sticky'];

function catmullRomPath(points) {
  if (!points || points.length === 0) return '';
  if (points.length < 3) return 'M ' + points.map((p) => `${p.x} ${p.y}`).join(' L ');
  let d = `M ${points[0].x} ${points[0].y}`;
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[i === 0 ? i : i - 1];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = points[i + 2 < points.length ? i + 2 : points.length - 1];
    const cp1x = p1.x + (p2.x - p0.x) / 6;
    const cp1y = p1.y + (p2.y - p0.y) / 6;
    const cp2x = p2.x - (p3.x - p1.x) / 6;
    const cp2y = p2.y - (p3.y - p1.y) / 6;
    d += ` C ${cp1x} ${cp1y} ${cp2x} ${cp2y} ${p2.x} ${p2.y}`;
  }
  return d;
}

export default function Canvas() {
  const svgRef = useRef(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [currentPath, setCurrentPath] = useState(null);
  const [marquee, setMarquee] = useState(null); // {x, y, w, h} in world coords
  const coordRef = useRef(null);
  // All pointer gestures run through this mutable ref so the move/up handlers
  // never read stale React state during a drag.
  const gesture = useRef(null);
  const spaceDown = useRef(false);
  const [spaceActive, setSpaceActive] = useState(false);

  const s = useStore();

  // While a drawing/placement tool is active, existing elements must not
  // capture the pointer, so a new shape, stroke or text can begin anywhere.
  const drawingToolActive = s.tool === 'pen' || SHAPE_TOOLS.includes(s.tool);
  const selectedSet = new Set(s.selectedIds);

  // Convert screen coordinates to world/canvas coordinates. Reads live pan/zoom
  // so it is always correct, even mid-gesture.
  const toWorld = useCallback((clientX, clientY) => {
    const { pan, zoom } = useStore.getState();
    const rect = svgRef.current.getBoundingClientRect();
    return { x: (clientX - rect.left - pan.x) / zoom, y: (clientY - rect.top - pan.y) / zoom };
  }, []);

  const startPan = (clientX, clientY) => {
    const { pan } = useStore.getState();
    gesture.current = { type: 'pan', startX: clientX, startY: clientY, panX: pan.x, panY: pan.y };
  };

  const handlePointerDown = (e) => {
    const { x, y } = toWorld(e.clientX, e.clientY);

    // Panning: Hand tool, middle mouse, or Spacebar held.
    if (s.tool === 'pan' || e.button === 1 || spaceDown.current) {
      startPan(e.clientX, e.clientY);
      return;
    }

    if (s.tool === 'eraser') {
      const target = e.target.closest('[data-element-id]');
      if (target) s.deleteElement(target.getAttribute('data-element-id'));
      return;
    }

    if (s.tool === 'pen') {
      setCurrentPath({ id: `path-${Date.now()}`, type: 'pen', points: [{ x, y }], stroke: s.strokeColor, strokeWidth: s.strokeWidth });
      setIsDrawing(true);
      return;
    }

    if (SHAPE_TOOLS.includes(s.tool)) {
      const el = s.startShape(s.tool, x, y);
      gesture.current = { type: 'draw', id: el.id, startX: x, startY: y, tool: s.tool };
      return;
    }

    // Select tool, pointer on empty canvas → marquee selection.
    if (s.tool === 'select') {
      const onBackground = e.target.tagName === 'svg' || e.target.getAttribute('data-bg') === 'true';
      if (onBackground) {
        s.setEditingText(null);
        if (!e.shiftKey) s.clearSelection();
        gesture.current = { type: 'marquee', startX: x, startY: y, additive: e.shiftKey, base: e.shiftKey ? [...s.selectedIds] : [] };
        setMarquee({ x, y, w: 0, h: 0 });
      }
    }
  };

  const handlePointerMove = (e) => {
    const { x, y } = toWorld(e.clientX, e.clientY);
    if (coordRef.current) coordRef.current.textContent = `${Math.round(x)}, ${Math.round(y)}`;
    const g = gesture.current;

    if (g && g.type === 'pan') {
      s.setPan({ x: g.panX + (e.clientX - g.startX), y: g.panY + (e.clientY - g.startY) });
      return;
    }

    if (isDrawing && currentPath) {
      const lastPt = currentPath.points[currentPath.points.length - 1];
      if (Math.hypot(x - lastPt.x, y - lastPt.y) > 1.5) {
        setCurrentPath({ ...currentPath, points: [...currentPath.points, { x, y }] });
      }
      return;
    }

    if (!g) return;

    if (g.type === 'draw') {
      const w = x - g.startX;
      const h = y - g.startY;
      if (g.tool === 'arrow') {
        const [aw, ah] = s.arrowSnap ? snapToEightWays(w, h) : [w, h];
        s.resizeShape(g.id, g.startX, g.startY, aw, ah);
      } else if (g.tool === 'line') {
        s.resizeShape(g.id, g.startX, g.startY, w, 0);
      } else {
        let nx = g.startX, ny = g.startY, nw = w, nh = h;
        if (nw < 0) { nx = x; nw = -nw; }
        if (nh < 0) { ny = y; nh = -nh; }
        if (g.tool === 'circle') { const sz = Math.max(nw, nh); s.resizeShape(g.id, nx, ny, sz, sz); }
        else s.resizeShape(g.id, nx, ny, nw, nh);
      }
      return;
    }

    if (g.type === 'drag') {
      const dx = x - g.lastX;
      const dy = y - g.lastY;
      if (dx !== 0 || dy !== 0) {
        s.moveSelectionBy(dx, dy);
        g.lastX = x;
        g.lastY = y;
        g.moved = true;
      }
      return;
    }

    if (g.type === 'resize') {
      const dx = x - g.startX;
      const dy = y - g.startY;
      let nx = g.origX, ny = g.origY;
      let nw = g.origW + (g.handle.includes('r') ? dx : 0);
      let nh = g.origH + (g.handle.includes('b') ? dy : 0);
      if (g.handle.includes('l')) { nx = g.origX + dx; nw = g.origW - dx; }
      if (g.handle.includes('t')) { ny = g.origY + dy; nh = g.origH - dy; }
      if (!g.isArrowish) { if (nw < 10) nw = 10; if (nh < 10) nh = 10; }
      s.resizeShape(g.id, nx, ny, nw, nh);
      return;
    }

    if (g.type === 'groupResize') {
      const b = g.startBounds;
      // The dragged corner moves; the opposite corner stays fixed (origin).
      const ox = g.handle.includes('l') ? b.x + b.w : b.x;
      const oy = g.handle.includes('t') ? b.y + b.h : b.y;
      let newW = g.handle.includes('l') ? b.x + b.w - x : x - b.x;
      let newH = g.handle.includes('t') ? b.y + b.h - y : y - b.y;
      const minPx = 8;
      let sx = newW / b.w;
      let sy = newH / b.h;
      if (e.shiftKey) { const uni = Math.max(Math.abs(sx), Math.abs(sy)); sx = Math.sign(sx || 1) * uni; sy = Math.sign(sy || 1) * uni; }
      if (Math.abs(newW) < minPx) sx = minPx / b.w;
      if (Math.abs(newH) < minPx) sy = minPx / b.h;
      const sel = new Set(g.ids);
      const snapById = g.snapshot;
      s.setElements(
        useStore.getState().elements.map((el) =>
          sel.has(el.id) && snapById[el.id] ? scaleElement(snapById[el.id], ox, oy, sx, sy) : el
        )
      );
      return;
    }

    if (g.type === 'marquee') {
      const rx = Math.min(g.startX, x);
      const ry = Math.min(g.startY, y);
      const rw = Math.abs(x - g.startX);
      const rh = Math.abs(y - g.startY);
      setMarquee({ x: rx, y: ry, w: rw, h: rh });
      const rect = { x: rx, y: ry, w: rw, h: rh };
      const hits = s.elements
        .filter((el) => !el.locked)
        .filter((el) => { const bb = elementBounds(el); return bb && boxesIntersect(rect, bb); })
        .map((el) => el.id);
      const ids = g.additive ? [...new Set([...g.base, ...hits])] : hits;
      s.setSelection(s.expandGroups(ids));
      return;
    }
  };

  const endGesture = () => {
    const g = gesture.current;
    if (isDrawing && currentPath) {
      if (currentPath.points.length > 1) s.addPath(currentPath.points);
      setCurrentPath(null);
      setIsDrawing(false);
    }
    if (g) {
      if (g.type === 'draw') s.finishShape(g.id);
      else if (g.type === 'drag') { if (g.moved) s.commitEdit(); else if (!g.additive) s.setSelection(s.expandGroups([g.elId])); }
      else if (g.type === 'resize' || g.type === 'groupResize') s.commitEdit();
      else if (g.type === 'marquee') setMarquee(null);
      gesture.current = null;
    }
  };

  const handleShapePointerDown = (e, el) => {
    // Drawing tools pass through so a new shape can start on top of this one.
    if (s.tool !== 'select' && s.tool !== 'pan' && s.tool !== 'eraser') return;
    if (spaceDown.current) return; // let the canvas start a pan
    e.stopPropagation();
    if (s.tool === 'eraser') { s.deleteElement(el.id); return; }
    const { x, y } = toWorld(e.clientX, e.clientY);

    if (e.shiftKey) {
      // Toggle this object (and its group) in/out of the selection.
      const ids = s.expandGroups([el.id]);
      const allIn = ids.every((id) => selectedSet.has(id));
      s.setSelection(allIn ? s.selectedIds.filter((id) => !ids.includes(id)) : [...s.selectedIds, ...ids]);
      return;
    }

    // Clicking an object that is not already selected selects just it (+group).
    if (!selectedSet.has(el.id)) s.setSelection(s.expandGroups([el.id]));

    if (el.locked) return; // selectable (to unlock) but not draggable
    gesture.current = { type: 'drag', lastX: x, lastY: y, moved: false, elId: el.id, additive: false };
  };

  const handleResizeHandlePointerDown = (e, el, handle) => {
    e.stopPropagation();
    const { x, y } = toWorld(e.clientX, e.clientY);
    gesture.current = {
      type: 'resize', id: el.id, startX: x, startY: y,
      origX: el.x, origY: el.y, origW: el.w, origH: el.h, handle,
      isArrowish: el.type === 'arrow' || el.type === 'line',
    };
  };

  const handleGroupResizePointerDown = (e, handle, bounds) => {
    e.stopPropagation();
    const snapshot = {};
    for (const el of s.elements) if (selectedSet.has(el.id)) snapshot[el.id] = { ...el };
    gesture.current = { type: 'groupResize', handle, startBounds: bounds, snapshot, ids: [...s.selectedIds] };
  };

  const handleShapeDoubleClick = (e, el) => {
    e.stopPropagation();
    if (LABELED_TYPES.includes(el.type)) s.setEditingText(el.id);
  };

  const handleCanvasDoubleClick = (e) => {
    const onBackground = e.target.tagName === 'svg' || e.target.getAttribute('data-bg') === 'true';
    if (!onBackground) return;
    if (s.tool !== 'select' && s.tool !== 'pan') return;
    const { x, y } = toWorld(e.clientX, e.clientY);
    s.addText(x, y);
  };

  // Native wheel listener so preventDefault works (React's onWheel is passive).
  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return undefined;
    const onWheel = (e) => {
      e.preventDefault();
      const { zoom, pan, setPan, setZoom } = useStore.getState();
      const rect = svg.getBoundingClientRect();
      const mx = e.clientX - rect.left;
      const my = e.clientY - rect.top;
      // Ctrl/trackpad-pinch or plain wheel → zoom toward pointer; shift → horizontal pan.
      if (e.ctrlKey || !e.shiftKey) {
        const newZoom = Math.max(0.1, Math.min(5, zoom * (e.deltaY > 0 ? 0.9 : 1.1)));
        setPan({ x: mx - ((mx - pan.x) / zoom) * newZoom, y: my - ((my - pan.y) / zoom) * newZoom });
        setZoom(newZoom);
      } else {
        setPan({ x: pan.x - e.deltaY, y: pan.y });
      }
    };
    svg.addEventListener('wheel', onWheel, { passive: false });
    return () => svg.removeEventListener('wheel', onWheel);
  }, []);

  const handleKeyDown = useCallback((e) => {
    const typing = document.activeElement.tagName === 'TEXTAREA' || document.activeElement.tagName === 'INPUT';
    if (e.key === ' ' && !typing) { spaceDown.current = true; setSpaceActive(true); }
    if (typing) return;
    const mod = e.ctrlKey || e.metaKey;

    if ((e.key === 'Delete' || e.key === 'Backspace') && s.selectedIds.length) { e.preventDefault(); s.deleteSelection(); return; }
    if (e.key === 'Escape') { s.clearSelection(); s.setEditingText(null); s.setTool('select'); return; }
    if (mod && e.key.toLowerCase() === 'a') { e.preventDefault(); s.selectAll(); return; }
    if (mod && e.key.toLowerCase() === 'c') { e.preventDefault(); s.copySelection(); return; }
    if (mod && e.key.toLowerCase() === 'v') { e.preventDefault(); s.paste(); return; }
    if (mod && e.key.toLowerCase() === 'd') { e.preventDefault(); s.duplicateSelection(); return; }
    if (mod && e.key.toLowerCase() === 'g') { e.preventDefault(); if (e.shiftKey) s.ungroupSelection(); else s.groupSelection(); return; }
    if (mod && e.key.toLowerCase() === 'z' && !e.shiftKey) { e.preventDefault(); s.undo(); return; }
    if (mod && (e.key.toLowerCase() === 'y' || (e.key.toLowerCase() === 'z' && e.shiftKey))) { e.preventDefault(); s.redo(); return; }

    if ((e.key === 'Enter' || e.key === 'F2') && s.selectedIds.length === 1 && !s.editingTextId) {
      const el = s.elements.find((el) => el.id === s.selectedIds[0]);
      if (el && LABELED_TYPES.includes(el.type)) { e.preventDefault(); s.setEditingText(el.id); }
      return;
    }

    if (s.selectedIds.length && e.key.startsWith('Arrow')) {
      e.preventDefault();
      const step = e.shiftKey ? 10 : 1;
      const d = { ArrowLeft: [-step, 0], ArrowRight: [step, 0], ArrowUp: [0, -step], ArrowDown: [0, step] }[e.key];
      if (d) s.nudgeSelection(d[0], d[1]);
    }
  }, [s]);

  const handleKeyUp = useCallback((e) => {
    if (e.key === ' ') { spaceDown.current = false; setSpaceActive(false); }
  }, []);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => { window.removeEventListener('keydown', handleKeyDown); window.removeEventListener('keyup', handleKeyUp); };
  }, [handleKeyDown, handleKeyUp]);

  const cursorClass = (s.tool === 'pan' || spaceActive) ? 'cursor-grab'
    : s.tool === 'pen' ? 'cursor-crosshair'
    : s.tool === 'eraser' ? 'cursor-pointer' : 'cursor-default';

  const HANDLE = 9;
  const makeHandle = (key, hx, hy, cursor, onDown) => (
    <rect key={key} x={hx - HANDLE / 2} y={hy - HANDLE / 2} width={HANDLE} height={HANDLE}
      fill="#fff" stroke="#3b82f6" strokeWidth={1.5} rx={1.5} style={{ cursor }} onPointerDown={onDown} />
  );

  // Resize handles for a single selected element (not shown in multi-selection).
  const renderSingleHandles = (el) => {
    if (el.type === 'text' || el.type === 'pen' || el.type === 'connection') return null;
    if (el.type === 'arrow' || el.type === 'line') {
      const b = elementBounds(el);
      return [
        makeHandle('tl', b.x, b.y, 'nwse-resize', (e) => handleResizeHandlePointerDown(e, el, 'tl')),
        makeHandle('br', b.x + b.w, b.y + b.h, 'nwse-resize', (e) => handleResizeHandlePointerDown(e, el, 'br')),
      ];
    }
    const corners = [
      ['tl', el.x, el.y, 'nwse-resize'], ['tr', el.x + el.w, el.y, 'nesw-resize'],
      ['bl', el.x, el.y + el.h, 'nesw-resize'], ['br', el.x + el.w, el.y + el.h, 'nwse-resize'],
    ];
    return corners.map(([h, cx, cy, cur]) => makeHandle(h, cx, cy, cur, (e) => handleResizeHandlePointerDown(e, el, h)));
  };

  const renderShapeLabel = (el) => {
    const box = innerTextBox(el);
    const { lines, fontSize, lineHeight } = fitLabel(el.label, box.w, box.h, el.fontSize || 14);
    const centerX = box.x + box.w / 2;
    const firstBaseline = el.y + el.h / 2 - ((lines.length - 1) * lineHeight) / 2 + fontSize * 0.35;
    return (
      <>
        <clipPath id={`clip-${el.id}`}><rect x={box.x} y={box.y} width={box.w} height={box.h} /></clipPath>
        <text clipPath={`url(#clip-${el.id})`} textAnchor="middle" fill={el.stroke} fontSize={fontSize} fontFamily="Inter, sans-serif" style={{ userSelect: 'none' }}>
          {lines.map((line, i) => (<tspan key={i} x={centerX} y={firstBaseline + i * lineHeight}>{line}</tspan>))}
        </text>
      </>
    );
  };

  const renderShape = (el) => {
    const selected = selectedSet.has(el.id);
    const peStyle = { pointerEvents: drawingToolActive ? 'none' : 'auto' };

    if (el.type === 'pen') {
      return (
        <g key={el.id}>
          <path data-element-id={el.id} d={catmullRomPath(el.points)} stroke={el.stroke} strokeWidth={el.strokeWidth}
            fill="none" strokeLinecap="round" strokeLinejoin="round" style={peStyle} onPointerDown={(e) => handleShapePointerDown(e, el)} />
          {selected && (() => { const b = elementBounds(el); return b ? (
            <rect x={b.x - 4} y={b.y - 4} width={b.w + 8} height={b.h + 8} fill="none" stroke="#3b82f6" strokeWidth={1} strokeDasharray="4 3" style={{ pointerEvents: 'none' }} />
          ) : null; })()}
        </g>
      );
    }

    if (el.type === 'connection') {
      const from = s.elements.find((e) => e.id === el.fromId);
      const to = s.elements.find((e) => e.id === el.toId);
      if (!from || !to) return null;
      const x1 = from.x + (from.w || 0) / 2, y1 = from.y + (from.h || 0) / 2;
      const x2 = to.x + (to.w || 0) / 2, y2 = to.y + (to.h || 0) / 2;
      const mx = (x1 + x2) / 2;
      const d = `M ${x1} ${y1} C ${mx} ${y1}, ${mx} ${y2}, ${x2} ${y2}`;
      return (
        <g key={el.id} data-element-id={el.id} style={peStyle}>
          <path d={d} stroke={el.stroke} strokeWidth={el.strokeWidth} fill="none" markerEnd="url(#arrowhead)" onPointerDown={(e) => handleShapePointerDown(e, el)} />
          {el.label && (<text x={mx} y={(y1 + y2) / 2 - 6} textAnchor="middle" fontSize={12} fill="#64748b" style={{ userSelect: 'none' }}>{el.label}</text>)}
        </g>
      );
    }

    const isTextType = el.type === 'text';
    const path = shapePath(el.type, el.x, el.y, el.w, el.h, el.direction);
    const single = selected && s.selectedIds.length === 1;

    return (
      <g key={el.id} data-element-id={el.id} style={peStyle}
        onPointerDown={(e) => handleShapePointerDown(e, el)} onDoubleClick={(e) => handleShapeDoubleClick(e, el)}>
        {el.type !== 'text' && el.type !== 'arrow' && el.type !== 'line' && (
          <rect x={el.x - 4} y={el.y - 4} width={el.w + 8} height={el.h + 8} fill="transparent" />
        )}
        {el.type === 'arrow' && (
          <rect x={Math.min(el.x, el.x + el.w) - 8} y={Math.min(el.y, el.y + el.h) - 8} width={Math.abs(el.w) + 16} height={Math.abs(el.h) + 16} fill="transparent" />
        )}

        {isTextType ? (
          (() => {
            const fs = el.fontSize || 16;
            const m = measureText(el.label, fs);
            const boxW = Math.max(el.w || 0, m.w);
            const boxH = Math.max(el.h || 0, m.h);
            return (
              <>
                <rect x={el.x} y={el.y} width={boxW} height={boxH} fill="transparent" />
                {s.editingTextId !== el.id && (
                  <text x={el.x} fill={el.fill} fontSize={fs} fontFamily="Inter, sans-serif" style={{ userSelect: 'none', whiteSpace: 'pre' }}>
                    {m.lines.map((line, i) => (<tspan key={i} x={el.x} y={el.y + fs + i * m.lineHeight}>{line === '' ? ' ' : line}</tspan>))}
                  </text>
                )}
              </>
            );
          })()
        ) : (
          <>
            <path d={path} stroke={el.stroke} strokeWidth={el.strokeWidth} fill={el.fill} strokeLinejoin="round" strokeLinecap="round" />
            {el.label && s.editingTextId !== el.id && renderShapeLabel(el)}
          </>
        )}

        {selected && (() => {
          const b = elementBounds(el);
          if (!b) return null;
          return <rect x={b.x - 6} y={b.y - 6} width={b.w + 12} height={b.h + 12} fill="none" stroke="#3b82f6"
            strokeWidth={1.5} strokeDasharray="5 3" rx={4} style={{ pointerEvents: 'none' }} />;
        })()}
        {el.locked && (() => { const b = elementBounds(el); return b ? (
          <rect x={b.x} y={b.y} width={b.w} height={b.h} fill="none" stroke="#94a3b8" strokeWidth={1} strokeDasharray="2 2" style={{ pointerEvents: 'none' }} />
        ) : null; })()}
        {single && !el.locked && renderSingleHandles(el)}
      </g>
    );
  };

  // Combined bounding box + resize handles for a multi-object selection.
  const renderGroupSelection = () => {
    if (s.selectedIds.length < 2) return null;
    const sel = s.elements.filter((e) => selectedSet.has(e.id));
    const b = unionBounds(sel);
    if (!b) return null;
    const corners = [
      ['tl', b.x, b.y, 'nwse-resize'], ['tr', b.x + b.w, b.y, 'nesw-resize'],
      ['bl', b.x, b.y + b.h, 'nesw-resize'], ['br', b.x + b.w, b.y + b.h, 'nwse-resize'],
    ];
    return (
      <g style={{ pointerEvents: 'none' }}>
        <rect x={b.x - 6} y={b.y - 6} width={b.w + 12} height={b.h + 12} fill="none" stroke="#3b82f6" strokeWidth={1.5} rx={2} />
        <g style={{ pointerEvents: 'auto' }}>
          {corners.map(([h, cx, cy, cur]) => makeHandle(h, cx, cy, cur, (e) => handleGroupResizePointerDown(e, h, b)))}
        </g>
      </g>
    );
  };

  const renderEditingText = () => {
    if (!s.editingTextId) return null;
    const el = s.elements.find((e) => e.id === s.editingTextId);
    if (!el) return null;
    const isTextLine = el.type === 'text';
    const textFs = el.fontSize || 16;
    const tm = isTextLine ? measureText(el.label || '', textFs) : null;
    const frame = isTextLine
      ? { x: el.x, y: el.y, w: Math.max(el.w || 0, tm.w) + 20, h: tm.h + 10 }
      : { x: el.x, y: el.y, w: el.w, h: el.h };
    const inner = innerTextBox(el);
    const fit = isTextLine ? null : fitLabel(el.label || '', inner.w, inner.h, el.fontSize || 14);
    const fontSize = isTextLine ? textFs : fit.fontSize;
    const textHeight = fit ? Math.min(inner.h, fit.lines.length * fit.lineHeight + 6) : '100%';
    return (
      <foreignObject x={frame.x} y={frame.y} width={frame.w} height={frame.h}>
        <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: isTextLine ? 'flex-start' : 'center', padding: isTextLine ? 0 : SHAPE_TEXT_PAD }}>
          <textarea autoFocus value={el.label} onFocus={(e) => e.target.select()}
            onChange={(e) => {
              if (isTextLine) { const m = measureText(e.target.value, textFs); s.updateElement(el.id, { label: e.target.value, w: m.w, h: m.h }); }
              else s.updateElement(el.id, { label: e.target.value });
            }}
            onBlur={() => { s.commitEdit(); s.setEditingText(null); }}
            onKeyDown={(e) => {
              if (e.key === 'Escape') { e.preventDefault(); s.commitEdit(); s.setEditingText(null); }
              else if (!isTextLine && e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); s.commitEdit(); s.setEditingText(null); }
            }}
            style={{
              width: '100%', height: isTextLine ? '100%' : textHeight, border: '1px solid #3b82f6', borderRadius: '4px',
              padding: isTextLine ? '2px 4px' : 0, fontSize, lineHeight: LINE_RATIO, fontFamily: 'Inter, sans-serif',
              background: isTextLine ? 'rgba(255,255,255,0.85)' : (el.fill === 'transparent' || el.fill === '#1e293b' ? '#fff' : el.fill),
              color: isTextLine ? el.fill : el.stroke, outline: 'none', resize: 'none', overflow: 'hidden',
              textAlign: isTextLine ? 'left' : 'center', boxSizing: 'border-box',
            }} />
        </div>
      </foreignObject>
    );
  };

  const fitToScreen = () => {
    const rect = svgRef.current.getBoundingClientRect();
    s.fitToView(rect.width, rect.height);
  };

  return (
    <div className="canvas-container">
      <svg
        ref={svgRef}
        className={`whiteboard-svg ${cursorClass}`}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={endGesture}
        onPointerLeave={endGesture}
        onDoubleClick={handleCanvasDoubleClick}
        style={{ width: '100%', height: '100%', display: 'block', touchAction: 'none' }}
      >
        <defs>
          <marker id="arrowhead" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
            <polygon points="0 0, 10 3.5, 0 7" fill="#64748b" />
          </marker>
        </defs>

        <g data-bg="true">
          <rect data-bg="true" x={-100000} y={-100000} width={200000} height={200000} fill="transparent" />
          <pattern data-bg="true" id="dot-grid" width={20 * s.zoom} height={20 * s.zoom} patternUnits="userSpaceOnUse" patternTransform={`translate(${s.pan.x} ${s.pan.y})`}>
            <circle data-bg="true" cx={10 * s.zoom} cy={10 * s.zoom} r={1 * s.zoom} fill="#cbd5e1" />
          </pattern>
          <rect data-bg="true" x={-100000} y={-100000} width={200000} height={200000} fill="url(#dot-grid)" />
        </g>

        <g transform={`translate(${s.pan.x}, ${s.pan.y}) scale(${s.zoom})`}>
          {s.elements.map(renderShape)}
          {renderGroupSelection()}
          {currentPath && (
            <path d={catmullRomPath(currentPath.points)} stroke={currentPath.stroke} strokeWidth={currentPath.strokeWidth} fill="none" strokeLinecap="round" strokeLinejoin="round" />
          )}
          {marquee && (
            <rect x={marquee.x} y={marquee.y} width={marquee.w} height={marquee.h}
              fill="rgba(59,130,246,0.08)" stroke="#3b82f6" strokeWidth={1 / s.zoom} strokeDasharray={`${4 / s.zoom} ${3 / s.zoom}`} style={{ pointerEvents: 'none' }} />
          )}
          {renderEditingText()}
        </g>
      </svg>

      <div className="zoom-controls">
        <button className="zoom-btn" onClick={() => s.setZoom(Math.max(0.1, s.zoom * 0.8))} title="Zoom out"><Minus size={16} /></button>
        <span className="zoom-label">{Math.round(s.zoom * 100)}%</span>
        <button className="zoom-btn" onClick={() => s.setZoom(Math.min(5, s.zoom * 1.25))} title="Zoom in"><Plus size={16} /></button>
        <button className="zoom-btn" onClick={fitToScreen} title="Fit to screen"><Scan size={14} /></button>
        <button className="zoom-btn" onClick={s.resetView} title="Reset view"><Maximize size={14} /></button>
      </div>

      <div className="coord-display" ref={coordRef}>0, 0</div>
    </div>
  );
}
