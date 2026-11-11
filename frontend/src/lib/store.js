import { create } from 'zustand';
import { nanoid } from 'nanoid';
import { supabase, supabaseConfigured } from './supabase';
import { createShape, createPath, createConnection, SHAPE_DEFAULTS, LABELED_TYPES } from './shapes';

const MAX_HISTORY = 50;

export const useStore = create((set, get) => ({
  elements: [],
  selectedId: null,
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
      selectedId: null,
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
      selectedId: null,
      editingTextId: null,
      boardModified: true,
    });
  },

  canUndo: () => get().historyIndex > 0,
  canRedo: () => get().historyIndex < get().history.length - 1,

  setTool: (tool) => set({ tool, selectedId: tool === 'select' ? get().selectedId : null }),
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
      fill: get().fillColor,
      fontSize: get().fontSize,
      w: 0,
      h: 0,
      label: '',
      ...(isArrow ? { direction: get().arrowBidirectional ? 'free-bi' : 'free' } : {}),
    });
    set((s) => ({ elements: [...s.elements, el], selectedId: el.id, boardModified: true }));
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
    if (LABELED_TYPES.includes(el.type)) get().setEditingText(id);
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
  deleteElement: (id) => {
    set((s) => ({
      elements: s.elements.filter((e) => e.id !== id && e.fromId !== id && e.toId !== id),
      selectedId: s.selectedId === id ? null : s.selectedId,
      boardModified: true,
    }));
    get().pushHistory();
  },
  clearCanvas: () => {
    set({ elements: [], selectedId: null, editingTextId: null, boardModified: true });
    get().pushHistory();
  },
  selectElement: (id) => set({ selectedId: id, editingTextId: null }),
  setEditingText: (id) => set({ editingTextId: id }),
  commitEdit: () => get().pushHistory(),

  setPan: (pan) => set({ pan }),
  setZoom: (zoom) => set({ zoom }),
  resetView: () => set({ pan: { x: 0, y: 0 }, zoom: 1 }),

  toggleTemplates: () => set((s) => ({ showTemplates: !s.showTemplates })),

  loadBoards: async () => {
    if (!supabaseConfigured || !supabase) {
      set({ boards: [], loadingBoards: false });
      return;
    }
    set({ loadingBoards: true });
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
    if (!supabaseConfigured || !supabase) {
      return { error: new Error('Board saving is not configured for this deployment.') };
    }
    const { elements, currentBoardId } = get();
    const payload = { title, category, canvas_data: { elements }, ...(thumbnail ? { thumbnail } : {}) };

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
    if (!supabaseConfigured || !supabase) {
      return { error: new Error('Board loading is not configured for this deployment.') };
    }
    const { data, error } = await supabase
      .from('boards')
      .select('id, title, canvas_data, category')
      .eq('id', id)
      .single();
    if (error) return { error };
    const els = data.canvas_data?.elements || [];
    set({
      elements: els,
      currentBoardId: data.id,
      currentBoardTitle: data.title,
      selectedId: null,
      editingTextId: null,
      boardModified: false,
      history: [JSON.stringify(els)],
      historyIndex: 0,
    });
    return { data };
  },

  deleteBoard: async (id) => {
    if (!supabaseConfigured || !supabase) {
      return { error: new Error('Board deletion is not configured for this deployment.') };
    }
    const { error } = await supabase.from('boards').delete().eq('id', id);
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
      elements: [], selectedId: null, editingTextId: null,
      currentBoardId: null, currentBoardTitle: '', boardModified: false,
      history: ['[]'], historyIndex: 0,
    }),

  loadTemplate: (template) => {
    const els = template.elements.map((el) => ({ ...el, id: nanoid(8) }));
    set({
      elements: els,
      currentBoardId: null,
      currentBoardTitle: template.title || '',
      selectedId: null,
      editingTextId: null,
      boardModified: true,
      history: [JSON.stringify(els)],
      historyIndex: 0,
    });
  },
}));
