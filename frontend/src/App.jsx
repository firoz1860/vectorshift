import { useState, useEffect } from 'react';
import Canvas from './components/Canvas';
import Toolbar from './components/Toolbar';
import BoardPanel from './components/BoardPanel';
import TemplatesModal from './components/TemplatesModal';
import SaveDialog from './components/SaveDialog';
import { useStore } from './lib/store';
import { exportPNG } from './lib/exportPNG';
import { PanelLeftClose, PanelLeftOpen } from 'lucide-react';

function App() {
  const s = useStore();
  const [showSave, setShowSave] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const handleSave = () => setShowSave(true);

  const handleNew = () => {
    if (s.boardModified && s.elements.length > 0) {
      if (confirm('You have unsaved changes. Start a new board anyway?')) {
        s.newBoard();
      }
    } else {
      s.newBoard();
    }
  };

  const handleExport = () => exportPNG(s.elements);

  useEffect(() => {
    const handler = (e) => {
      if (document.activeElement.tagName === 'TEXTAREA' || document.activeElement.tagName === 'INPUT') return;
      const map = { v: 'select', p: 'pen', e: 'eraser', h: 'pan' };
      if (map[e.key]) { s.setTool(map[e.key]); }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  return (
    <div className="app">
      <Toolbar onSave={handleSave} onNew={handleNew} onExport={handleExport} />

      <div className="app__body">
        {sidebarOpen && (
          <div className="app__sidebar">
            <div className="sidebar-header">
              <span>Boards</span>
              <button className="sidebar-toggle" onClick={() => setSidebarOpen(false)}>
                <PanelLeftClose size={16} />
              </button>
            </div>
            <BoardPanel />
          </div>
        )}

        {!sidebarOpen && (
          <button className="sidebar-open-btn" onClick={() => setSidebarOpen(true)}>
            <PanelLeftOpen size={18} />
            <span>Boards</span>
          </button>
        )}

        <div className="app__canvas">
          <Canvas />
          {s.currentBoardTitle && (
            <div className="board-indicator">
              <span className="board-indicator__dot" />
              {s.currentBoardTitle}
              {s.boardModified && <span className="board-indicator__modified">unsaved</span>}
            </div>
          )}
        </div>
      </div>

      <TemplatesModal />
      <SaveDialog open={showSave} onClose={() => setShowSave(false)} />
    </div>
  );
}

export default App;
