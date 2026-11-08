import { useState } from 'react';
import { useStore } from '../lib/store';
import { TEMPLATES, TEMPLATE_CATEGORIES } from '../lib/templates';
import { shapePath } from '../lib/svgPaths';
import { X, Sparkles, FileText } from 'lucide-react';

export default function TemplatesModal() {
  const s = useStore();
  const [category, setCategory] = useState('All');

  if (!s.showTemplates) return null;

  const filtered = category === 'All' ? TEMPLATES : TEMPLATES.filter((t) => t.category === category);

  const handleSelect = (template) => {
    s.loadTemplate(template);
    s.toggleTemplates();
  };

  return (
    <div className="modal-overlay" onClick={s.toggleTemplates}>
      <div className="modal modal--templates" onClick={(e) => e.stopPropagation()}>
        <div className="modal__header">
          <div className="modal__title">
            <Sparkles size={20} />
            <span>Templates</span>
          </div>
          <button className="modal__close" onClick={s.toggleTemplates}><X size={20} /></button>
        </div>

        <div className="modal__body">
          <div className="template-filters">
            {TEMPLATE_CATEGORIES.map((cat) => (
              <button key={cat} className={`filter-chip ${category === cat ? 'filter-chip--active' : ''}`} onClick={() => setCategory(cat)}>{cat}</button>
            ))}
          </div>

          <div className="template-grid">
            {filtered.map((tpl) => (
              <div key={tpl.title} className="template-card" onClick={() => handleSelect(tpl)}>
                <div className="template-card__preview">
                  {tpl.elements.length > 0 ? (
                    <TemplatePreview template={tpl} />
                  ) : (
                    <div className="template-card__blank">
                      <FileText size={28} />
                      <span>Empty</span>
                    </div>
                  )}
                </div>
                <div className="template-card__info">
                  <div className="template-card__title">{tpl.title}</div>
                  <div className="template-card__desc">{tpl.description}</div>
                  <span className="template-card__badge">{tpl.category}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function TemplatePreview({ template }) {
  const minX = Math.min(...template.elements.map((e) => e.x));
  const minY = Math.min(...template.elements.map((e) => e.y));
  const maxX = Math.max(...template.elements.map((e) => e.x + (e.w || 100)));
  const maxY = Math.max(...template.elements.map((e) => e.y + (e.h || 30)));
  const w = maxX - minX + 40;
  const h = maxY - minY + 40;

  return (
    <svg viewBox={`${minX - 20} ${minY - 20} ${w} ${h}`} className="template-svg">
      {template.elements.map((el) => {
        if (el.type === 'text') {
          return (
            <text key={el.id} x={el.x} y={el.y + (el.fontSize || 14)} fill={el.fill} fontSize={(el.fontSize || 14) * 0.5} fontFamily="Inter, sans-serif">{el.label}</text>
          );
        }
        if (el.type === 'pen' || el.type === 'connection') return null;
        const path = shapePath(el.type, el.x, el.y, el.w || 80, el.h || 40, el.direction);
        return (
          <g key={el.id}>
            <path d={path} fill={el.fill || '#f1f5f9'} stroke={el.stroke || '#64748b'} strokeWidth={1} strokeLinejoin="round" strokeLinecap="round" />
            {el.label && (
              <text x={el.x + (el.w || 80) / 2} y={el.y + (el.h || 40) / 2 + 3} textAnchor="middle" fill={el.stroke || '#1e293b'} fontSize={6} fontFamily="Inter, sans-serif">{el.label}</text>
            )}
          </g>
        );
      })}
    </svg>
  );
}
