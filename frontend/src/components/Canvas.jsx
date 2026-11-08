import { useRef, useState, useEffect, useCallback } from 'react';
import { useStore } from '../lib/store';
import { shapePath } from '../lib/svgPaths';
import { Minus, Plus, Maximize } from 'lucide-react';

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
  const [dragState, setDragState] = useState(null);
  const [panState, setPanState] = useState(null);
  const [drawState, setDrawState] = useState(null);
  const [resizeState, setResizeState] = useState(null);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

  const s = useStore();

  const toCanvasCoords = useCallback((clientX, clientY) => {
    const rect = svgRef.current.getBoundingClientRect();
    const x = (clientX - rect.left - s.pan.x) / s.zoom;
    const y = (clientY - rect.top - s.pan.y) / s.zoom;
    return { x, y };
  }, [s.pan, s.zoom]);

  const handlePointerDown = (e) => {
    const { x, y } = toCanvasCoords(e.clientX, e.clientY);

    if (s.tool === 'pan' || e.button === 1) {
      setPanState({ startX: e.clientX, startY: e.clientY, panX: s.pan.x, panY: s.pan.y });
      return;
    }

    if (s.tool === 'eraser') {
      const target = e.target.closest('[data-element-id]');
      if (target) s.deleteElement(target.getAttribute('data-element-id'));
      return;
    }

    if (s.tool === 'pen') {
      setCurrentPath({
        id: `path-${Date.now()}`,
        type: 'pen',
        points: [{ x, y }],
        stroke: s.strokeColor,
        strokeWidth: s.strokeWidth,
      });
      setIsDrawing(true);
      return;
    }

    if (SHAPE_TOOLS.includes(s.tool)) {
      const el = s.startShape(s.tool, x, y);
      setDrawState({ id: el.id, startX: x, startY: y, tool: s.tool });
      return;
    }

    if (s.tool === 'select') {
      if (e.target.tagName === 'svg' || e.target.getAttribute('data-bg') === 'true') {
        s.selectElement(null);
        s.setEditingText(null);
      }
    }
  };

  const handlePointerMove = (e) => {
    const { x, y } = toCanvasCoords(e.clientX, e.clientY);
    setMousePos({ x, y });

    if (panState) {
      s.setPan({
        x: panState.panX + (e.clientX - panState.startX),
        y: panState.panY + (e.clientY - panState.startY),
      });
      return;
    }

    if (isDrawing && currentPath) {
      const lastPt = currentPath.points[currentPath.points.length - 1];
      const dist = Math.hypot(x - lastPt.x, y - lastPt.y);
      if (dist > 1.5) {
        setCurrentPath({ ...currentPath, points: [...currentPath.points, { x, y }] });
      }
      return;
    }

    if (drawState) {
      const w = x - drawState.startX;
      const h = y - drawState.startY;
      if (drawState.tool === 'arrow') {
        s.resizeShape(drawState.id, drawState.startX, drawState.startY, w, h);
      } else if (drawState.tool === 'line') {
        s.resizeShape(drawState.id, drawState.startX, drawState.startY, w, 0);
      } else {
        let nx = drawState.startX;
        let ny = drawState.startY;
        let nw = w;
        let nh = h;
        if (nw < 0) { nx = x; nw = -nw; }
        if (nh < 0) { ny = y; nh = -nh; }
        if (drawState.tool === 'circle') {
          const size = Math.max(nw, nh);
          s.resizeShape(drawState.id, nx, ny, size, size);
        } else {
          s.resizeShape(drawState.id, nx, ny, nw, nh);
        }
      }
      return;
    }

    if (resizeState) {
      const dx = x - resizeState.startX;
      const dy = y - resizeState.startY;
      let nx = resizeState.origX;
      let ny = resizeState.origY;
      let nw = resizeState.origW + (resizeState.handle.includes('r') ? dx : 0);
      let nh = resizeState.origH + (resizeState.handle.includes('b') ? dy : 0);
      if (resizeState.handle.includes('l')) {
        nx = resizeState.origX + dx;
        nw = resizeState.origW - dx;
      }
      if (resizeState.handle.includes('t')) {
        ny = resizeState.origY + dy;
        nh = resizeState.origH - dy;
      }
      const targetEl = s.elements.find((e) => e.id === resizeState.id);
      const isArrowish = targetEl && (targetEl.type === 'arrow' || targetEl.type === 'line');
      if (!isArrowish) {
        if (nw < 10) nw = 10;
        if (nh < 10) nh = 10;
      }
      s.resizeShape(resizeState.id, nx, ny, nw, nh);
      return;
    }

    if (dragState) {
      const dx = x - dragState.startX;
      const dy = y - dragState.startY;
      s.updateElement(dragState.id, {
        x: dragState.origX + dx,
        y: dragState.origY + dy,
      });
      return;
    }
  };

  const handlePointerUp = () => {
    if (isDrawing && currentPath) {
      if (currentPath.points.length > 1) {
        s.addPath(currentPath.points);
      }
      setCurrentPath(null);
      setIsDrawing(false);
    }
    if (panState) setPanState(null);
    if (drawState) {
      s.finishShape(drawState.id);
      setDrawState(null);
      s.setTool('select');
    }
    if (dragState) {
      s.commitEdit();
      setDragState(null);
    }
    if (resizeState) {
      s.commitEdit();
      setResizeState(null);
    }
  };

  const handleShapePointerDown = (e, el) => {
    e.stopPropagation();
    if (s.tool === 'eraser') {
      s.deleteElement(el.id);
      return;
    }
    if (s.tool === 'select' || s.tool === 'pan') {
      const { x, y } = toCanvasCoords(e.clientX, e.clientY);
      s.selectElement(el.id);
      if (el.type !== 'pen' && el.type !== 'connection') {
        setDragState({ id: el.id, startX: x, startY: y, origX: el.x, origY: el.y });
      }
    }
  };

  const handleResizeHandlePointerDown = (e, el, handle) => {
    e.stopPropagation();
    const { x, y } = toCanvasCoords(e.clientX, e.clientY);
    setResizeState({
      id: el.id,
      startX: x,
      startY: y,
      origX: el.x,
      origY: el.y,
      origW: el.w,
      origH: el.h,
      handle,
    });
  };

  const handleShapeDoubleClick = (e, el) => {
    e.stopPropagation();
    const editable = ['text','sticky','rectangle','rounded','circle','cylinder','diamond','parallelogram','cloud','hexagon'];
    if (editable.includes(el.type)) {
      s.setEditingText(el.id);
    }
  };

  // Native listener with { passive: false }: React's onWheel is passive, so
  // preventDefault() there is ignored and the page scrolls while zooming.
  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return undefined;
    const onWheel = (e) => {
      e.preventDefault();
      const { zoom, pan, setPan, setZoom } = useStore.getState();
      const newZoom = Math.max(0.25, Math.min(4, zoom * (e.deltaY > 0 ? 0.9 : 1.1)));
      const rect = svg.getBoundingClientRect();
      const mx = e.clientX - rect.left;
      const my = e.clientY - rect.top;
      setPan({
        x: mx - ((mx - pan.x) / zoom) * newZoom,
        y: my - ((my - pan.y) / zoom) * newZoom,
      });
      setZoom(newZoom);
    };
    svg.addEventListener('wheel', onWheel, { passive: false });
    return () => svg.removeEventListener('wheel', onWheel);
  }, []);

  const handleKeyDown = useCallback((e) => {
    if (document.activeElement.tagName === 'TEXTAREA' || document.activeElement.tagName === 'INPUT') return;
    if ((e.key === 'Delete' || e.key === 'Backspace') && s.selectedId) {
      s.deleteElement(s.selectedId);
    }
    if (e.key === 'Escape') {
      s.selectElement(null);
      s.setEditingText(null);
      s.setTool('select');
    }
    if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
      e.preventDefault();
      s.undo();
    }
    if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) {
      e.preventDefault();
      s.redo();
    }
  }, [s]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  const cursorClass = {
    select: 'cursor-default',
    pen: 'cursor-crosshair',
    eraser: 'cursor-pointer',
    pan: 'cursor-grab',
  };

  const renderResizeHandles = (el) => {
    if (s.selectedId !== el.id) return null;
    if (el.type === 'text' || el.type === 'pen' || el.type === 'connection') return null;
    if (el.type === 'arrow' || el.type === 'line') {
      const minX = Math.min(el.x, el.x + el.w);
      const minY = Math.min(el.y, el.y + el.h);
      const absW = Math.abs(el.w);
      const absH = Math.abs(el.h);
      const handles = [
        { handle: 'tl', x: minX - 6, y: minY - 6, cursor: 'nwse-resize' },
        { handle: 'br', x: minX + absW - 4, y: minY + absH - 4, cursor: 'nwse-resize' },
      ];
      return handles.map((h) => (
        <rect
          key={h.handle}
          x={h.x}
          y={h.y}
          width={10}
          height={10}
          fill="#3b82f6"
          stroke="#fff"
          strokeWidth={1.5}
          style={{ cursor: h.cursor }}
          onPointerDown={(e) => handleResizeHandlePointerDown(e, el, h.handle)}
        />
      ));
    }
    const handles = [
      { handle: 'tl', x: el.x - 6, y: el.y - 6, cursor: 'nwse-resize' },
      { handle: 'tr', x: el.x + el.w - 4, y: el.y - 6, cursor: 'nesw-resize' },
      { handle: 'bl', x: el.x - 6, y: el.y + el.h - 4, cursor: 'nesw-resize' },
      { handle: 'br', x: el.x + el.w - 4, y: el.y + el.h - 4, cursor: 'nwse-resize' },
    ];
    return handles.map((h) => (
      <rect
        key={h.handle}
        x={h.x}
        y={h.y}
        width={10}
        height={10}
        fill="#3b82f6"
        stroke="#fff"
        strokeWidth={1.5}
        style={{ cursor: h.cursor }}
        onPointerDown={(e) => handleResizeHandlePointerDown(e, el, h.handle)}
      />
    ));
  };

  const renderShape = (el) => {
    if (el.type === 'pen') {
      return (
        <path
          key={el.id}
          data-element-id={el.id}
          d={catmullRomPath(el.points)}
          stroke={el.stroke}
          strokeWidth={el.strokeWidth}
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
          onPointerDown={(e) => handleShapePointerDown(e, el)}
          style={s.selectedId === el.id ? { filter: 'drop-shadow(0 0 4px rgba(59,130,246,.5))' } : {}}
        />
      );
    }

    if (el.type === 'connection') {
      const from = s.elements.find((e) => e.id === el.fromId);
      const to = s.elements.find((e) => e.id === el.toId);
      if (!from || !to) return null;
      const x1 = from.x + (from.w || 0) / 2;
      const y1 = from.y + (from.h || 0) / 2;
      const x2 = to.x + (to.w || 0) / 2;
      const y2 = to.y + (to.h || 0) / 2;
      const mx = (x1 + x2) / 2;
      const d = `M ${x1} ${y1} C ${mx} ${y1}, ${mx} ${y2}, ${x2} ${y2}`;
      return (
        <g key={el.id} data-element-id={el.id}>
          <path d={d} stroke={el.stroke} strokeWidth={el.strokeWidth} fill="none" markerEnd="url(#arrowhead)" onPointerDown={(e) => handleShapePointerDown(e, el)} />
          {el.label && (
            <text x={mx} y={(y1 + y2) / 2 - 6} textAnchor="middle" fontSize={12} fill="#64748b" style={{ userSelect: 'none' }}>{el.label}</text>
          )}
        </g>
      );
    }

    const isTextType = el.type === 'text';
    const path = shapePath(el.type, el.x, el.y, el.w, el.h, el.direction);

    return (
      <g
        key={el.id}
        data-element-id={el.id}
        onPointerDown={(e) => handleShapePointerDown(e, el)}
        onDoubleClick={(e) => handleShapeDoubleClick(e, el)}
        style={s.selectedId === el.id ? { filter: 'drop-shadow(0 0 3px rgba(59,130,246,.3))' } : {}}
      >
        {el.type !== 'text' && el.type !== 'arrow' && el.type !== 'line' && (
          <rect x={el.x - 4} y={el.y - 4} width={el.w + 8} height={el.h + 8} fill="transparent" />
        )}
        {el.type === 'arrow' && (
          <rect x={Math.min(el.x, el.x + el.w) - 8} y={Math.min(el.y, el.y + el.h) - 8} width={Math.abs(el.w) + 16} height={Math.abs(el.h) + 16} fill="transparent" />
        )}

        {isTextType ? (
          <text x={el.x} y={el.y + el.fontSize} fill={el.fill} fontSize={el.fontSize} fontFamily="Inter, sans-serif" style={{ userSelect: 'none' }}>
            {el.label}
          </text>
        ) : (
          <>
            <path d={path} stroke={el.stroke} strokeWidth={el.strokeWidth} fill={el.fill} strokeLinejoin="round" strokeLinecap="round" />
            {el.label && (
              <text x={el.x + el.w / 2} y={el.y + el.h / 2 + (el.fontSize || 14) / 3} textAnchor="middle" fill={el.stroke} fontSize={el.fontSize || 14} fontFamily="Inter, sans-serif" style={{ userSelect: 'none' }}>
                {el.label}
              </text>
            )}
          </>
        )}

        {s.selectedId === el.id && el.type !== 'text' && el.type !== 'arrow' && el.type !== 'line' && (
          <rect x={el.x - 6} y={el.y - 6} width={el.w + 12} height={el.h + 12} fill="none" stroke="#3b82f6" strokeWidth={1.5} strokeDasharray="5 3" rx={4} style={{ pointerEvents: 'none' }} />
        )}
        {s.selectedId === el.id && (el.type === 'arrow' || el.type === 'line') && (
          <rect x={Math.min(el.x, el.x + el.w) - 6} y={Math.min(el.y, el.y + el.h) - 6} width={Math.abs(el.w) + 12} height={Math.abs(el.h) + 12} fill="none" stroke="#3b82f6" strokeWidth={1.5} strokeDasharray="5 3" rx={4} style={{ pointerEvents: 'none' }} />
        )}
        {renderResizeHandles(el)}
      </g>
    );
  };

  const renderEditingText = () => {
    if (!s.editingTextId) return null;
    const el = s.elements.find((e) => e.id === s.editingTextId);
    if (!el) return null;
    return (
      <foreignObject x={el.x} y={el.y} width={Math.max(el.w || 120, 100)} height={Math.max(el.h || 24, (el.fontSize || 14) + 8)}>
        <textarea
          autoFocus
          value={el.label}
          onChange={(e) => s.updateElement(el.id, { label: e.target.value })}
          onBlur={() => { s.commitEdit(); s.setEditingText(null); }}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); s.commitEdit(); s.setEditingText(null); }
          }}
          style={{
            width: '100%', height: '100%', border: '1px solid #3b82f6', borderRadius: '4px',
            padding: '4px', fontSize: el.fontSize || 14, fontFamily: 'Inter, sans-serif',
            background: el.fill === 'transparent' || el.fill === '#1e293b' ? '#fff' : el.fill,
            color: el.type === 'text' ? '#1e293b' : el.stroke, outline: 'none', resize: 'none',
            textAlign: el.type === 'text' ? 'left' : 'center',
          }}
        />
      </foreignObject>
    );
  };

  return (
    <div className="canvas-container">
      <svg
        ref={svgRef}
        className={`whiteboard-svg ${cursorClass[s.tool] || 'cursor-default'}`}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerUp}
        style={{ width: '100%', height: '100%', display: 'block', touchAction: 'none' }}
      >
        <defs>
          <marker id="arrowhead" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
            <polygon points="0 0, 10 3.5, 0 7" fill="#64748b" />
          </marker>
        </defs>

        <g data-bg="true">
          <rect data-bg="true" x={-10000} y={-10000} width={20000} height={20000} fill="transparent" />
          <pattern data-bg="true" id="dot-grid" width={20 * s.zoom} height={20 * s.zoom} patternUnits="userSpaceOnUse">
            <circle data-bg="true" cx={10 * s.zoom} cy={10 * s.zoom} r={1 * s.zoom} fill="#cbd5e1" />
          </pattern>
          <rect data-bg="true" x={-10000} y={-10000} width={20000} height={20000} fill="url(#dot-grid)" />
        </g>

        <g transform={`translate(${s.pan.x}, ${s.pan.y}) scale(${s.zoom})`}>
          {s.elements.map(renderShape)}
          {currentPath && (
            <path d={catmullRomPath(currentPath.points)} stroke={currentPath.stroke} strokeWidth={currentPath.strokeWidth} fill="none" strokeLinecap="round" strokeLinejoin="round" />
          )}
          {renderEditingText()}
        </g>
      </svg>

      <div className="zoom-controls">
        <button className="zoom-btn" onClick={() => s.setZoom(Math.max(0.25, s.zoom * 0.8))} title="Zoom out"><Minus size={16} /></button>
        <span className="zoom-label">{Math.round(s.zoom * 100)}%</span>
        <button className="zoom-btn" onClick={() => s.setZoom(Math.min(4, s.zoom * 1.25))} title="Zoom in"><Plus size={16} /></button>
        <button className="zoom-btn" onClick={s.resetView} title="Reset view"><Maximize size={14} /></button>
      </div>

      <div className="coord-display">{Math.round(mousePos.x)}, {Math.round(mousePos.y)}</div>
    </div>
  );
}
