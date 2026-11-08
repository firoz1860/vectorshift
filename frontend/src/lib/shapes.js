import { nanoid } from 'nanoid';

export const genId = () => `el-${nanoid(8)}`;

export const STROKE_COLORS = [
  '#1e293b', '#3b82f6', '#10b981', '#f59e0b',
  '#ef4444', '#8b5cf6', '#0ea5e9', '#64748b',
];

export const FILL_COLORS = [
  '#ffffff', '#dbeafe', '#dcfce7', '#fef3c7',
  '#fee2e2', '#ede9fe', '#e0f2fe', '#f1f5f9',
];

export const FONT_SIZES = [12, 14, 16, 20, 24, 32];

export const SHAPE_DEFAULTS = {
  rectangle: { w: 180, h: 80, label: 'Service' },
  rounded: { w: 180, h: 80, label: 'Component' },
  circle: { w: 80, h: 80, label: '' },
  cylinder: { w: 120, h: 100, label: 'Database' },
  diamond: { w: 140, h: 100, label: 'Decision' },
  parallelogram: { w: 180, h: 70, label: 'Data' },
  cloud: { w: 160, h: 90, label: 'Cloud' },
  hexagon: { w: 160, h: 80, label: 'Process' },
  arrow: { w: 120, h: 0, label: '' },
  line: { w: 120, h: 0, label: '' },
  text: { w: 120, h: 24, label: 'Text' },
  sticky: { w: 140, h: 120, label: '' },
};

export const createShape = (type, x, y, overrides = {}) => {
  const base = {
    id: genId(),
    type,
    x,
    y,
    stroke: '#1e293b',
    strokeWidth: 2,
    fill: type === 'text' ? 'transparent' : '#ffffff',
    label: '',
    fontSize: 14,
  };

  return {
    ...base,
    ...(SHAPE_DEFAULTS[type] || {}),
    ...(type === 'text' ? { fill: '#1e293b' } : {}),
    ...(type === 'sticky' ? { fill: '#fef9c3', stroke: '#facc15' } : {}),
    ...overrides,
  };
};

export const createPath = (points, color, width) => ({
  id: genId(),
  type: 'pen',
  points,
  stroke: color,
  strokeWidth: width,
});

export const createConnection = (fromId, toId) => ({
  id: genId(),
  type: 'connection',
  fromId,
  toId,
  stroke: '#64748b',
  strokeWidth: 2,
  label: '',
});
