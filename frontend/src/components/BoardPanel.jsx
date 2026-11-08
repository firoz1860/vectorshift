import { useEffect, useState } from 'react';
import { useStore } from '../lib/store';
import { FolderOpen, Trash2, Clock, Plus, Search } from 'lucide-react';

export default function BoardPanel() {
  const s = useStore();
  const [search, setSearch] = useState('');
  const [confirmDelete, setConfirmDelete] = useState(null);

  useEffect(() => {
    s.loadBoards();
  }, []);

  const filtered = s.boards.filter((b) =>
    b.title.toLowerCase().includes(search.toLowerCase()) ||
    (b.category || '').toLowerCase().includes(search.toLowerCase())
  );

  const handleLoad = async (board) => {
    await s.loadBoard(board.id);
  };

  const handleDelete = async (id) => {
    await s.deleteBoard(id);
    setConfirmDelete(null);
  };

  const formatDate = (d) => {
    if (!d) return '';
    const date = new Date(d);
    const now = new Date();
    const diff = now - date;
    if (diff < 60000) return 'just now';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
    return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  };

  return (
    <div className="board-panel">
      <div className="board-panel__header">
        <h3 className="board-panel__title">Saved Boards</h3>
        <button className="board-panel__new" onClick={s.newBoard} title="New blank board">
          <Plus size={16} />
        </button>
      </div>

      <div className="board-panel__search">
        <Search size={14} className="board-panel__search-icon" />
        <input
          type="text"
          placeholder="Search boards..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="board-panel__search-input"
        />
      </div>

      <div className="board-panel__list">
        {s.loadingBoards && (
          <div className="board-panel__empty">
            <div className="spinner-sm" />
            <p>Loading...</p>
          </div>
        )}

        {!s.loadingBoards && filtered.length === 0 && (
          <div className="board-panel__empty">
            <FolderOpen size={32} className="board-panel__empty-icon" />
            <p>No saved boards yet</p>
            <span>Click Save to store your work</span>
          </div>
        )}

        {filtered.map((board) => (
          <div
            key={board.id}
            className={`board-card ${s.currentBoardId === board.id ? 'board-card--active' : ''}`}
            onClick={() => handleLoad(board)}
          >
            <div className="board-card__thumb">
              {board.thumbnail ? (
                <img src={board.thumbnail} alt={board.title} />
              ) : (
                <div className="board-card__thumb-placeholder" />
              )}
            </div>
            <div className="board-card__info">
              <div className="board-card__name">{board.title}</div>
              <div className="board-card__meta">
                {board.category && <span className="board-card__cat">{board.category}</span>}
                <span className="board-card__time">
                  <Clock size={10} /> {formatDate(board.updated_at)}
                </span>
              </div>
            </div>
            {confirmDelete === board.id ? (
              <div className="board-card__confirm">
                <button className="confirm-btn confirm-btn--yes" onClick={(e) => { e.stopPropagation(); handleDelete(board.id); }}>Delete</button>
                <button className="confirm-btn confirm-btn--no" onClick={(e) => { e.stopPropagation(); setConfirmDelete(null); }}>Cancel</button>
              </div>
            ) : (
              <button className="board-card__delete" onClick={(e) => { e.stopPropagation(); setConfirmDelete(board.id); }} title="Delete board">
                <Trash2 size={14} />
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
