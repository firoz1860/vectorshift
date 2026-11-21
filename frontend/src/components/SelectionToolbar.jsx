import { useStore } from '../lib/store';
import {
  AlignStartVertical, AlignCenterVertical, AlignEndVertical,
  AlignStartHorizontal, AlignCenterHorizontal, AlignEndHorizontal,
  AlignHorizontalDistributeCenter, AlignVerticalDistributeCenter,
  BringToFront, SendToBack, ChevronUp, ChevronDown,
  Group, Ungroup, Lock, LockOpen, Copy, Trash2,
} from 'lucide-react';

// Floating contextual toolbar shown whenever one or more objects are selected.
// Alignment and distribution require 2+ / 3+ objects respectively.
export default function SelectionToolbar() {
  const s = useStore();
  const count = s.selectedIds.length;
  if (count === 0) return null;

  const multi = count >= 2;
  const canDistribute = count >= 3;
  const selected = s.elements.filter((e) => s.selectedIds.includes(e.id));
  const anyLocked = selected.some((e) => e.locked);
  const anyGrouped = selected.some((e) => e.groupId);

  const Btn = ({ onClick, title, disabled, children }) => (
    <button className="sel-btn" onClick={onClick} title={title} disabled={disabled}>{children}</button>
  );
  const Sep = () => <div className="sel-sep" />;

  return (
    <div className="selection-toolbar" onPointerDown={(e) => e.stopPropagation()}>
      <span className="sel-count">{count} selected</span>
      <Sep />

      {multi && (
        <>
          <Btn onClick={() => s.alignSelection('left')} title="Align left"><AlignStartVertical size={16} /></Btn>
          <Btn onClick={() => s.alignSelection('hcenter')} title="Align horizontal center"><AlignCenterVertical size={16} /></Btn>
          <Btn onClick={() => s.alignSelection('right')} title="Align right"><AlignEndVertical size={16} /></Btn>
          <Btn onClick={() => s.alignSelection('top')} title="Align top"><AlignStartHorizontal size={16} /></Btn>
          <Btn onClick={() => s.alignSelection('vcenter')} title="Align vertical center"><AlignCenterHorizontal size={16} /></Btn>
          <Btn onClick={() => s.alignSelection('bottom')} title="Align bottom"><AlignEndHorizontal size={16} /></Btn>
          <Btn onClick={() => s.distributeSelection('horizontal')} title="Distribute horizontally" disabled={!canDistribute}><AlignHorizontalDistributeCenter size={16} /></Btn>
          <Btn onClick={() => s.distributeSelection('vertical')} title="Distribute vertically" disabled={!canDistribute}><AlignVerticalDistributeCenter size={16} /></Btn>
          <Sep />
        </>
      )}

      <Btn onClick={s.bringToFront} title="Bring to front"><BringToFront size={16} /></Btn>
      <Btn onClick={s.bringForward} title="Bring forward"><ChevronUp size={16} /></Btn>
      <Btn onClick={s.sendBackward} title="Send backward"><ChevronDown size={16} /></Btn>
      <Btn onClick={s.sendToBack} title="Send to back"><SendToBack size={16} /></Btn>
      <Sep />

      {multi && !anyGrouped && <Btn onClick={s.groupSelection} title="Group (Ctrl+G)"><Group size={16} /></Btn>}
      {anyGrouped && <Btn onClick={s.ungroupSelection} title="Ungroup (Ctrl+Shift+G)"><Ungroup size={16} /></Btn>}
      <Btn onClick={s.toggleLockSelection} title={anyLocked ? 'Unlock' : 'Lock'}>{anyLocked ? <LockOpen size={16} /> : <Lock size={16} />}</Btn>
      <Btn onClick={s.duplicateSelection} title="Duplicate (Ctrl+D)"><Copy size={16} /></Btn>
      <Btn onClick={s.deleteSelection} title="Delete (Del)"><Trash2 size={16} /></Btn>
    </div>
  );
}
