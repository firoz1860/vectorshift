import { useState, useEffect } from 'react';
import { useStore } from '../lib/store';
import { X, Save, Tag } from 'lucide-react';

export default function SaveDialog({ open, onClose }) {
  const s = useStore();
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('Custom');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (open) {
      setTitle(s.currentBoardTitle || '');
      setCategory('Custom');
      setError(null);
    }
  }, [open]);

  if (!open) return null;

  const handleSave = async () => {
    if (!title.trim()) { setError('Please enter a board name'); return; }
    if (s.elements.length === 0) { setError('Canvas is empty — nothing to save'); return; }
    setSaving(true);
    setError(null);
    const result = await s.saveBoard(title.trim(), category);
    setSaving(false);
    if (result.error) {
      setError('Failed to save: ' + result.error.message);
    } else {
      onClose();
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal modal--save" onClick={(e) => e.stopPropagation()}>
        <div className="modal__header">
          <div className="modal__title">
            <Save size={20} />
            <span>Save Board</span>
          </div>
          <button className="modal__close" onClick={onClose}><X size={20} /></button>
        </div>

        <div className="modal__body">
          <div className="form-group">
            <label className="form-label">Board Name</label>
            <input
              type="text"
              className="form-input"
              placeholder="e.g. URL Shortener HLD"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              autoFocus
              onKeyDown={(e) => e.key === 'Enter' && handleSave()}
            />
          </div>

          <div className="form-group">
            <label className="form-label"><Tag size={14} /> Category</label>
            <div className="category-chips">
              {['Custom', 'HLD', 'LLD', 'Practice'].map((cat) => (
                <button key={cat} className={`filter-chip ${category === cat ? 'filter-chip--active' : ''}`} onClick={() => setCategory(cat)}>{cat}</button>
              ))}
            </div>
          </div>

          {error && <div className="form-error">{error}</div>}

          <div className="modal__stats">
            <span>{s.elements.filter((e) => e.type !== 'pen' && e.type !== 'connection').length} shapes</span>
            <span>{s.elements.filter((e) => e.type === 'pen').length} drawings</span>
            <span>{s.elements.filter((e) => e.type === 'connection').length} connections</span>
          </div>
        </div>

        <div className="modal__footer">
          <button className="btn btn--ghost" onClick={onClose}>Cancel</button>
          <button className="btn btn--primary" onClick={handleSave} disabled={saving}>
            {saving ? <div className="spinner-sm" /> : <Save size={16} />}
            {saving ? 'Saving...' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  );
}
