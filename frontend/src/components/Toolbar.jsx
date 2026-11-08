import { useStore } from '../lib/store';
import { STROKE_COLORS, FILL_COLORS, FONT_SIZES } from '../lib/shapes';
import {
  MousePointer2, Pen, Eraser, Hand, Type, StickyNote,
  Square, SquareDashed, Circle, Database, Diamond,
  Cloud, Hexagon, ArrowRight, Slash,
  Trash2, Save, FilePlus, Layers, Download,
  Undo2, Redo2, ArrowUp, ArrowDown, ArrowLeft, ArrowRightLeft,
} from 'lucide-react';

const TOOLS = [
  { tool: 'select', icon: MousePointer2, label: 'Select (V)' },
  { tool: 'pen', icon: Pen, label: 'Pen (P)' },
  { tool: 'eraser', icon: Eraser, label: 'Eraser (E)' },
  { tool: 'pan', icon: Hand, label: 'Pan (H)' },
];

const SHAPES = [
  { tool: 'rectangle', icon: Square, label: 'Service Box' },
  { tool: 'rounded', icon: SquareDashed, label: 'Rounded' },
  { tool: 'circle', icon: Circle, label: 'Circle' },
  { tool: 'cylinder', icon: Database, label: 'Database' },
  { tool: 'diamond', icon: Diamond, label: 'Decision' },
  { tool: 'parallelogram', icon: Slash, label: 'Data' },
  { tool: 'cloud', icon: Cloud, label: 'Cloud' },
  { tool: 'hexagon', icon: Hexagon, label: 'Process' },
  { tool: 'arrow', icon: ArrowRight, label: 'Arrow' },
  { tool: 'text', icon: Type, label: 'Text' },
  { tool: 'sticky', icon: StickyNote, label: 'Sticky Note' },
];

const ARROW_DIRS = [
  { dir: 'free', icon: ArrowRight, label: 'Free drag (any direction)' },
  { dir: 'right', icon: ArrowRight, label: 'Right' },
  { dir: 'left', icon: ArrowLeft, label: 'Left' },
  { dir: 'up', icon: ArrowUp, label: 'Up' },
  { dir: 'down', icon: ArrowDown, label: 'Down' },
  { dir: 'bidirectional', icon: ArrowRightLeft, label: 'Both' },
];

export default function Toolbar({ onSave, onNew, onExport }) {
  const s = useStore();

  return (
    <div className="toolbar">
      <div className="toolbar__brand">
        <div className="toolbar__logo">
          <Pen size={16} />
        </div>
        <span className="toolbar__title">Whiteboard</span>
        <span className="toolbar__subtitle">LLD / HLD</span>
      </div>

      <div className="toolbar__divider" />

      <div className="toolbar__group">
        <button className="tool-btn" onClick={() => s.undo()} disabled={!s.canUndo()} title="Undo (Ctrl+Z)">
          <Undo2 size={18} />
        </button>
        <button className="tool-btn" onClick={() => s.redo()} disabled={!s.canRedo()} title="Redo (Ctrl+Y)">
          <Redo2 size={18} />
        </button>
      </div>

      <div className="toolbar__divider" />

      <div className="toolbar__group">
        {TOOLS.map(({ tool, icon: Icon, label }) => (
          <button
            key={tool}
            className={`tool-btn ${s.tool === tool ? 'tool-btn--active' : ''}`}
            onClick={() => s.setTool(tool)}
            title={label}
          >
            <Icon size={18} />
          </button>
        ))}
      </div>

      <div className="toolbar__divider" />

      <div className="toolbar__group toolbar__shapes">
        {SHAPES.map(({ tool, icon: Icon, label }) => (
          <button
            key={tool}
            className={`tool-btn ${s.tool === tool ? 'tool-btn--active' : ''}`}
            onClick={() => s.setTool(tool)}
            title={label}
          >
            <Icon size={18} />
          </button>
        ))}
      </div>

      {s.tool === 'arrow' && (
        <>
          <div className="toolbar__divider" />
          <div className="toolbar__group">
            {ARROW_DIRS.map(({ dir, icon: Icon, label }) => (
              <button
                key={dir}
                className={`tool-btn ${s.arrowDirection === dir ? 'tool-btn--active' : ''}`}
                onClick={() => s.setArrowDirection(dir)}
                title={label}
              >
                <Icon size={16} />
              </button>
            ))}
          </div>
        </>
      )}

      <div className="toolbar__divider" />

      <div className="toolbar__colors">
        <div className="color-group">
          <span className="color-label">Stroke</span>
          <div className="color-swatches">
            {STROKE_COLORS.map((c) => (
              <button
                key={c}
                className={`color-swatch ${s.strokeColor === c ? 'color-swatch--active' : ''}`}
                style={{ background: c }}
                onClick={() => s.setStrokeColor(c)}
                title={c}
              />
            ))}
            <input
              type="color"
              className="color-picker"
              value={s.strokeColor}
              onChange={(e) => s.setStrokeColor(e.target.value)}
            />
          </div>
        </div>
        <div className="color-group">
          <span className="color-label">Fill</span>
          <div className="color-swatches">
            {FILL_COLORS.map((c) => (
              <button
                key={c}
                className={`color-swatch ${s.fillColor === c ? 'color-swatch--active' : ''}`}
                style={{ background: c }}
                onClick={() => s.setFillColor(c)}
                title={c}
              />
            ))}
            <input
              type="color"
              className="color-picker"
              value={s.fillColor}
              onChange={(e) => s.setFillColor(e.target.value)}
            />
          </div>
        </div>
      </div>

      <div className="toolbar__divider" />

      <div className="toolbar__stroke">
        <span className="color-label">Size</span>
        <div className="stroke-row">
          {[1, 2, 3, 5, 8].map((w) => (
            <button
              key={w}
              className={`stroke-btn ${s.strokeWidth === w ? 'stroke-btn--active' : ''}`}
              onClick={() => s.setStrokeWidth(w)}
              title={`${w}px`}
            >
              <div className="stroke-dot" style={{ width: w + 2, height: w + 2 }} />
            </button>
          ))}
        </div>
      </div>

      <div className="toolbar__divider" />

      <div className="toolbar__font">
        <span className="color-label">Font</span>
        <select
          className="font-select"
          value={s.fontSize}
          onChange={(e) => s.setFontSize(Number(e.target.value))}
        >
          {FONT_SIZES.map((f) => (
            <option key={f} value={f}>{f}</option>
          ))}
        </select>
      </div>

      <div className="toolbar__spacer" />

      <div className="toolbar__actions">
        <button className="action-btn" onClick={() => s.toggleTemplates()} title="Templates">
          <Layers size={18} />
          <span>Templates</span>
        </button>
        <button className="action-btn action-btn--ghost" onClick={onExport} title="Export PNG">
          <Download size={18} />
        </button>
        <button className="action-btn action-btn--ghost" onClick={() => s.clearCanvas()} title="Clear all">
          <Trash2 size={18} />
        </button>
        <button className="action-btn action-btn--ghost" onClick={onNew} title="New board">
          <FilePlus size={18} />
        </button>
        <button className="action-btn action-btn--primary" onClick={onSave} title="Save board">
          <Save size={18} />
          <span>Save</span>
          {s.boardModified && <span className="modified-dot" />}
        </button>
      </div>
    </div>
  );
}
