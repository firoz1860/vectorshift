import { create } from 'zustand';
import { nanoid } from 'nanoid';
import { supabase, supabaseConfigured } from './supabase';
import * as api from './api';
import { createShape, createPath, createConnection, SHAPE_DEFAULTS } from './shapes';
import { elementBounds, unionBounds, translateElement } from './geometry';

const MAX_HISTORY = 50;

// Copy/paste buffer. Kept outside the reactive store so copying doesn't trigger
// re-renders or land in the undo history.
let clipboard = [];

export const useStore = create((set, get) => ({
  elements: [],
  selectedIds: [],
  editingTextId: null,

  tool: 'select',
  strokeColor: '#1e293b',
  fillColor: '#ffffff',
  strokeWidth: 2,
  fontSize: 16,
  arrowSnap: false,
  arrowBidirectional: false,

  pan: { x: 0, y: 0 },
  zoom: 1,

  boards: [],
  loadingBoards: false,
  currentBoardId: null,
  currentBoardTitle: '',
  boardModified: false,

  showTemplates: false,

  history: ['[]'],
  historyIndex: 0,

  pushHistory: () => {
    const { elements, history, historyIndex } = get();
    const newHist = history.slice(0, historyIndex + 1);
    newHist.push(JSON.stringify(elements));
    if (newHist.length > MAX_HISTORY) newHist.shift();
    set({ history: newHist, historyIndex: newHist.length - 1 });
  },

  undo: () => {
    const { history, historyIndex } = get();
    if (historyIndex <= 0) return;
    const idx = historyIndex - 1;
    set({
      elements: JSON.parse(history[idx]),
      historyIndex: idx,
      selectedIds: [],
      editingTextId: null,
      boardModified: true,
    });
  },

  redo: () => {
    const { history, historyIndex } = get();
    if (historyIndex >= history.length - 1) return;
    const idx = historyIndex + 1;
    set({
      elements: JSON.parse(history[idx]),
      historyIndex: idx,
      selectedIds: [],
      editingTextId: null,
      boardModified: true,
    });
  },

  canUndo: () => get().historyIndex > 0,
  canRedo: () => get().historyIndex < get().history.length - 1,

  setTool: (tool) => set({ tool, selectedIds: tool === 'select' ? get().selectedIds : [] }),
  setStrokeColor: (c) => set({ strokeColor: c }),
  setFillColor: (c) => set({ fillColor: c }),
  setStrokeWidth: (w) => set({ strokeWidth: w }),
  setFontSize: (s) => set({ fontSize: s }),
  setArrowSnap: (on) => set({ arrowSnap: on }),
  setArrowBidirectional: (on) => set({ arrowBidirectional: on }),

  startShape: (type, x, y) => {
    const isArrow = type === 'arrow';
    const el = createShape(type, x, y, {
      stroke: get().strokeColor,
      // For a text element, `fill` is the ink colour, so follow the stroke
      // swatch — using the shape fill (white by default) renders it invisible.
      fill: type === 'text' ? get().strokeColor : get().fillColor,
      fontSize: get().fontSize,
      w: 0,
      h: 0,
      label: '',
      ...(isArrow ? { direction: get().arrowBidirectional ? 'free-bi' : 'free' } : {}),
    });
    set((s) => ({ elements: [...s.elements, el], selectedIds: [el.id], boardModified: true }));
    return el;
  },
  // Drops a free-text element at an arbitrary canvas point and opens it for
  // editing, so text can be written anywhere without picking a tool first.
  addText: (x, y) => {
    const el = createShape('text', x, y, {
      stroke: get().strokeColor,
      fill: get().strokeColor,
      fontSize: get().fontSize,
      w: 160,
      h: Math.round((get().fontSize || 16) * 1.25),
      label: '',
    });
    set((s) => ({
      elements: [...s.elements, el],
      selectedIds: [el.id],
      editingTextId: el.id,
      tool: 'select',
      boardModified: true,
    }));
    return el;
  },
  resizeShape: (id, x, y, w, h) =>
    set((s) => ({
      elements: s.elements.map((e) => {
        if (e.id !== id) return e;
        if (e.type === 'arrow' || e.type === 'line') {
          return { ...e, x, y, w, h };
        }
        return { ...e, x, y, w: Math.abs(w), h: Math.abs(h) };
      }),
      boardModified: true,
    })),
  finishShape: (id) => {
    const el = get().elements.find((e) => e.id === id);
    if (!el) return;
    if (el.type === 'arrow' && Math.abs(el.w) < 5 && Math.abs(el.h) < 5) {
      get().deleteElement(id);
      return;
    }
    const defs = SHAPE_DEFAULTS[el.type] || {};
    const patch = {};
    if (el.type !== 'arrow' && Math.abs(el.w) < 5 && Math.abs(el.h) < 5) {
      patch.w = defs.w || 120;
      patch.h = defs.h || 80;
    }
    if (!el.label && defs.label) patch.label = defs.label;
    if (Object.keys(patch).length > 0) get().updateElement(id, patch);
    // Only the text tool jumps straight into typing; geometric shapes stay
    // uninterrupted so the tool can keep drawing. Add labels later via
    // double-click or Enter/F2.
    if (el.type === 'text') get().setEditingText(id);
    get().pushHistory();
  },
  addPath: (points) => {
    const p = createPath(points, get().strokeColor, get().strokeWidth);
    set((s) => ({ elements: [...s.elements, p], boardModified: true }));
    get().pushHistory();
    return p;
  },
  addConnection: (fromId, toId) => {
    const c = createConnection(fromId, toId);
    set((s) => ({ elements: [...s.elements, c], boardModified: true }));
    get().pushHistory();
    return c;
  },
  updateElement: (id, patch) =>
    set((s) => ({
      elements: s.elements.map((e) => (e.id === id ? { ...e, ...patch } : e)),
      boardModified: true,
    })),
  // Replaces the whole element list without touching history — used by the
  // canvas during a drag/resize gesture (the gesture is committed once on
  // pointer-up via commitEdit()).
  setElements: (elements) => set({ elements, boardModified: true }),
  deleteElement: (id) => {
    set((s) => ({
      elements: s.elements.filter((e) => e.id !== id && e.fromId !== id && e.toId !== id),
      selectedIds: s.selectedIds.filter((sid) => sid !== id),
      boardModified: true,
    }));
    get().pushHistory();
  },
  clearCanvas: () => {
    set({ elements: [], selectedIds: [], editingTextId: null, boardModified: true });
    get().pushHistory();
  },

  // ----------------------------------------------------------- Selection
  selectElement: (id) => set({ selectedIds: id ? [id] : [], editingTextId: null }),
  setSelection: (ids) => set({ selectedIds: [...new Set(ids)], editingTextId: null }),
  toggleSelection: (id) =>
    set((s) => ({
      selectedIds: s.selectedIds.includes(id)
        ? s.selectedIds.filter((x) => x !== id)
        : [...s.selectedIds, id],
      editingTextId: null,
    })),
  selectAll: () =>
    set((s) => ({
      selectedIds: s.elements.filter((e) => !e.locked).map((e) => e.id),
      editingTextId: null,
    })),
  clearSelection: () => set({ selectedIds: [], editingTextId: null }),
  // Every id that shares a group with any element in `ids` (so clicking one
  // grouped object selects the whole group).
  expandGroups: (ids) => {
    const { elements } = get();
    const groupIds = new Set(
      elements.filter((e) => ids.includes(e.id) && e.groupId).map((e) => e.groupId)
    );
    const out = new Set(ids);
    if (groupIds.size) {
      for (const e of elements) if (e.groupId && groupIds.has(e.groupId)) out.add(e.id);
    }
    return [...out];
  },
  selectedElements: () => {
    const { elements, selectedIds } = get();
    const set2 = new Set(selectedIds);
    return elements.filter((e) => set2.has(e.id));
  },

  // ----------------------------------------------------------- Transform
  // Moves the current selection by a world-space delta (no history; commit on
  // pointer-up). Locked elements stay put.
  moveSelectionBy: (dx, dy) =>
    set((s) => {
      const sel = new Set(s.selectedIds);
      return {
        elements: s.elements.map((e) =>
          sel.has(e.id) && !e.locked ? translateElement(e, dx, dy) : e
        ),
        boardModified: true,
      };
    }),
  // Arrow-key nudge: move + commit as one history entry.
  nudgeSelection: (dx, dy) => {
    get().moveSelectionBy(dx, dy);
    get().pushHistory();
  },
  deleteSelection: () => {
    set((s) => {
      const sel = new Set(s.selectedIds);
      return {
        elements: s.elements.filter(
          (e) => !sel.has(e.id) && !sel.has(e.fromId) && !sel.has(e.toId)
        ),
        selectedIds: [],
        boardModified: true,
      };
    });
    get().pushHistory();
  },
  duplicateSelection: () => {
    const { elements, selectedIds } = get();
    const sel = new Set(selectedIds);
    const clones = elements
      .filter((e) => sel.has(e.id))
      .map((e) => translateElement({ ...e, id: `el-${nanoid(8)}` }, 20, 20));
    if (clones.length === 0) return;
    set((s) => ({
      elements: [...s.elements, ...clones],
      selectedIds: clones.map((c) => c.id),
      boardModified: true,
    }));
    get().pushHistory();
  },
  copySelection: () => {
    const { elements, selectedIds } = get();
    const sel = new Set(selectedIds);
    clipboard = elements.filter((e) => sel.has(e.id)).map((e) => ({ ...e }));
  },
  paste: () => {
    if (!clipboard.length) return;
    const clones = clipboard.map((e) => translateElement({ ...e, id: `el-${nanoid(8)}` }, 24, 24));
    set((s) => ({
      elements: [...s.elements, ...clones],
      selectedIds: clones.map((c) => c.id),
      boardModified: true,
    }));
    get().pushHistory();
  },

  // --------------------------------------------------------- Z-ordering
  bringToFront: () =>
    set((s) => {
      const sel = new Set(s.selectedIds);
      const rest = s.elements.filter((e) => !sel.has(e.id));
      const picked = s.elements.filter((e) => sel.has(e.id));
      return { elements: [...rest, ...picked], boardModified: true };
    }),
  sendToBack: () =>
    set((s) => {
      const sel = new Set(s.selectedIds);
      const rest = s.elements.filter((e) => !sel.has(e.id));
      const picked = s.elements.filter((e) => sel.has(e.id));
      return { elements: [...picked, ...rest], boardModified: true };
    }),
  bringForward: () =>
    set((s) => {
      const els = [...s.elements];
      const sel = new Set(s.selectedIds);
      for (let i = els.length - 2; i >= 0; i--) {
        if (sel.has(els[i].id) && !sel.has(els[i + 1].id)) {
          [els[i], els[i + 1]] = [els[i + 1], els[i]];
        }
      }
      return { elements: els, boardModified: true };
    }),
  sendBackward: () =>
    set((s) => {
      const els = [...s.elements];
      const sel = new Set(s.selectedIds);
      for (let i = 1; i < els.length; i++) {
        if (sel.has(els[i].id) && !sel.has(els[i - 1].id)) {
          [els[i], els[i - 1]] = [els[i - 1], els[i]];
        }
      }
      return { elements: els, boardModified: true };
    }),

  // --------------------------------------------------- Align & distribute
  alignSelection: (mode) => {
    const { elements, selectedIds } = get();
    const sel = new Set(selectedIds);
    const picked = elements.filter((e) => sel.has(e.id));
    if (picked.length < 2) return;
    const bounds = unionBounds(picked);
    if (!bounds) return;
    const moved = elements.map((e) => {
      if (!sel.has(e.id)) return e;
      const b = elementBounds(e);
      if (!b) return e;
      let dx = 0;
      let dy = 0;
      if (mode === 'left') dx = bounds.x - b.x;
      else if (mode === 'right') dx = bounds.x + bounds.w - (b.x + b.w);
      else if (mode === 'hcenter') dx = bounds.x + bounds.w / 2 - (b.x + b.w / 2);
      else if (mode === 'top') dy = bounds.y - b.y;
      else if (mode === 'bottom') dy = bounds.y + bounds.h - (b.y + b.h);
      else if (mode === 'vcenter') dy = bounds.y + bounds.h / 2 - (b.y + b.h / 2);
      return dx || dy ? translateElement(e, dx, dy) : e;
    });
    set({ elements: moved, boardModified: true });
    get().pushHistory();
  },
  distributeSelection: (axis) => {
    const { elements, selectedIds } = get();
    const sel = new Set(selectedIds);
    const picked = elements.filter((e) => sel.has(e.id) && elementBounds(e));
    if (picked.length < 3) return;
    const withB = picked.map((e) => ({ e, b: elementBounds(e) }));
    const key = axis === 'horizontal' ? 'x' : 'y';
    const size = axis === 'horizontal' ? 'w' : 'h';
    withB.sort((a, b) => a.b[key] - b.b[key]);
    const first = withB[0];
    const last = withB[withB.length - 1];
    const span = last.b[key] + last.b[size] - first.b[key];
    const totalSize = withB.reduce((sum, { b }) => sum + b[size], 0);
    const gap = (span - totalSize) / (withB.length - 1);
    let cursor = first.b[key] + first.b[size] + gap;
    const deltas = new Map();
    for (let i = 1; i < withB.length - 1; i++) {
      const { e, b } = withB[i];
      const target = cursor;
      deltas.set(e.id, target - b[key]);
      cursor += b[size] + gap;
    }
    const moved = elements.map((e) => {
      const d = deltas.get(e.id);
      if (!d) return e;
      return axis === 'horizontal' ? translateElement(e, d, 0) : translateElement(e, 0, d);
    });
    set({ elements: moved, boardModified: true });
    get().pushHistory();
  },

  // --------------------------------------------------- Group / lock
  groupSelection: () => {
    const { selectedIds } = get();
    if (selectedIds.length < 2) return;
    const groupId = `grp-${nanoid(6)}`;
    const sel = new Set(selectedIds);
    set((s) => ({
      elements: s.elements.map((e) => (sel.has(e.id) ? { ...e, groupId } : e)),
      boardModified: true,
    }));
    get().pushHistory();
  },
  ungroupSelection: () => {
    const { selectedIds } = get();
    const sel = new Set(selectedIds);
    set((s) => ({
      elements: s.elements.map((e) => {
        if (!sel.has(e.id) || !e.groupId) return e;
        const { groupId, ...rest } = e;
        return rest;
      }),
      boardModified: true,
    }));
    get().pushHistory();
  },
  toggleLockSelection: () => {
    const { elements, selectedIds } = get();
    const sel = new Set(selectedIds);
    const picked = elements.filter((e) => sel.has(e.id));
    const anyUnlocked = picked.some((e) => !e.locked);
    set((s) => ({
      elements: s.elements.map((e) => (sel.has(e.id) ? { ...e, locked: anyUnlocked } : e)),
      // Deselect when locking so the handles disappear.
      selectedIds: anyUnlocked ? [] : s.selectedIds,
      boardModified: true,
    }));
    get().pushHistory();
  },

  setEditingText: (id) => set({ editingTextId: id }),
  commitEdit: () => get().pushHistory(),

  setPan: (pan) => set({ pan }),
  setZoom: (zoom) => set({ zoom }),
  resetView: () => set({ pan: { x: 0, y: 0 }, zoom: 1 }),
  // Fits all content into the given viewport (centred, with padding).
  fitToView: (viewportW, viewportH) => {
    const { elements } = get();
    const bounds = unionBounds(elements);
    if (!bounds || bounds.w === 0 || bounds.h === 0) {
      set({ pan: { x: 0, y: 0 }, zoom: 1 });
      return;
    }
    const pad = 80;
    const zoom = Math.max(
      0.1,
      Math.min(2, Math.min((viewportW - pad) / bounds.w, (viewportH - pad) / bounds.h))
    );
    set({
      zoom,
      pan: {
        x: viewportW / 2 - (bounds.x + bounds.w / 2) * zoom,
        y: viewportH / 2 - (bounds.y + bounds.h / 2) * zoom,
      },
    });
  },

  toggleTemplates: () => set((s) => ({ showTemplates: !s.showTemplates })),

  loadBoards: async () => {
    set({ loadingBoards: true });
    if (!supabaseConfigured || !supabase) {
      // Backend persistence (default when Supabase isn't configured).
      const { data, error } = await api.listBoards();
      if (error) {
        console.error('Failed to load boards:', error);
        set({ loadingBoards: false });
        return;
      }
      set({ boards: data || [], loadingBoards: false });
      return;
    }
    const { data, error } = await supabase
      .from('boards')
      .select('id, title, thumbnail, category, created_at, updated_at')
      .order('updated_at', { ascending: false });
    if (error) {
      console.error('Failed to load boards:', error);
      set({ loadingBoards: false });
      return;
    }
    set({ boards: data || [], loadingBoards: false });
  },

  saveBoard: async (title, category = 'Custom', thumbnail = null) => {
    const { elements, currentBoardId } = get();
    const payload = { title, category, canvas_data: { elements }, ...(thumbnail ? { thumbnail } : {}) };

    if (!supabaseConfigured || !supabase) {
      // Backend persistence: update the existing board, or create a new one.
      const { data, error } = currentBoardId
        ? await api.updateBoard(currentBoardId, payload)
        : await api.createBoard(payload);
      if (error) return { error };
      set((s) => ({
        boards: currentBoardId
          ? s.boards.map((b) => (b.id === data.id ? data : b))
          : [data, ...s.boards],
        currentBoardId: data.id,
        currentBoardTitle: title,
        boardModified: false,
      }));
      return { data };
    }

    if (currentBoardId) {
      const { data, error } = await supabase
        .from('boards')
        .update({ ...payload, updated_at: new Date().toISOString() })
        .eq('id', currentBoardId)
        .select('id, title, thumbnail, category, created_at, updated_at')
        .single();
      if (error) return { error };
      set((s) => ({
        boards: s.boards.map((b) => (b.id === data.id ? data : b)),
        currentBoardTitle: title,
        boardModified: false,
      }));
      return { data };
    }

    const { data, error } = await supabase
      .from('boards')
      .insert(payload)
      .select('id, title, thumbnail, category, created_at, updated_at')
      .single();
    if (error) return { error };
    set((s) => ({
      boards: [data, ...s.boards],
      currentBoardId: data.id,
      currentBoardTitle: title,
      boardModified: false,
    }));
    return { data };
  },

  loadBoard: async (id) => {
    let data;
    if (!supabaseConfigured || !supabase) {
      const res = await api.getBoard(id);
      if (res.error) return { error: res.error };
      data = res.data;
    } else {
      const res = await supabase
        .from('boards')
        .select('id, title, canvas_data, category')
        .eq('id', id)
        .single();
      if (res.error) return { error: res.error };
      data = res.data;
    }
    const els = data.canvas_data?.elements || [];
    set({
      elements: els,
      currentBoardId: data.id,
      currentBoardTitle: data.title,
      selectedIds: [],
      editingTextId: null,
      boardModified: false,
      history: [JSON.stringify(els)],
      historyIndex: 0,
    });
    return { data };
  },

  deleteBoard: async (id) => {
    const { error } = !supabaseConfigured || !supabase
      ? await api.deleteBoard(id)
      : await supabase.from('boards').delete().eq('id', id);
    if (error) return { error };
    set((s) => ({
      boards: s.boards.filter((b) => b.id !== id),
      ...(s.currentBoardId === id
        ? { currentBoardId: null, currentBoardTitle: '', elements: [], boardModified: false }
        : {}),
    }));
    return {};
  },

  newBoard: () =>
    set({
      elements: [], selectedIds: [], editingTextId: null,
      currentBoardId: null, currentBoardTitle: '', boardModified: false,
      history: ['[]'], historyIndex: 0,
    }),

  loadTemplate: (template) => {
    const els = template.elements.map((el) => ({ ...el, id: nanoid(8) }));
    set({
      elements: els,
      currentBoardId: null,
      currentBoardTitle: template.title || '',
      selectedIds: [],
      editingTextId: null,
      boardModified: true,
      history: [JSON.stringify(els)],
      historyIndex: 0,
    });
  },
}));
