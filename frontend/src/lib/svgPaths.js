export const shapePath = (type, x, y, w, h, direction) => {
  switch (type) {
    case 'rectangle':
      return `M ${x} ${y} L ${x + w} ${y} L ${x + w} ${y + h} L ${x} ${y + h} Z`;

    case 'rounded': {
      const r = 16;
      return `M ${x + r} ${y} L ${x + w - r} ${y} Q ${x + w} ${y} ${x + w} ${y + r} L ${x + w} ${y + h - r} Q ${x + w} ${y + h} ${x + w - r} ${y + h} L ${x + r} ${y + h} Q ${x} ${y + h} ${x} ${y + h - r} L ${x} ${y + r} Q ${x} ${y} ${x + r} ${y} Z`;
    }

    case 'circle':
      return `M ${x + w / 2} ${y} A ${w / 2} ${h / 2} 0 1 0 ${x + w / 2} ${y + h} A ${w / 2} ${h / 2} 0 1 0 ${x + w / 2} ${y} Z`;

    case 'cylinder': {
      const ry = 12;
      return `M ${x} ${y + ry} A ${w / 2} ${ry} 0 0 0 ${x + w} ${y + ry} A ${w / 2} ${ry} 0 0 0 ${x} ${y + ry} M ${x} ${y + ry} L ${x} ${y + h - ry} A ${w / 2} ${ry} 0 0 0 ${x + w} ${y + h - ry} L ${x + w} ${y + ry} M ${x + w} ${y + ry} A ${w / 2} ${ry} 0 0 1 ${x + w} ${y + h - ry}`;
    }

    case 'diamond':
      return `M ${x + w / 2} ${y} L ${x + w} ${y + h / 2} L ${x + w / 2} ${y + h} L ${x} ${y + h / 2} Z`;

    case 'parallelogram': {
      const skew = 20;
      return `M ${x + skew} ${y} L ${x + w} ${y} L ${x + w - skew} ${y + h} L ${x} ${y + h} Z`;
    }

    case 'cloud': {
      const cx = x + w / 2;
      const cy = y + h / 2;
      return `M ${cx - w * 0.3} ${cy + h * 0.25} C ${cx - w * 0.4} ${cy + h * 0.1} ${cx - w * 0.35} ${cy - h * 0.2} ${cx - w * 0.15} ${cy - h * 0.2} C ${cx - w * 0.1} ${cy - h * 0.4} ${cx + w * 0.15} ${cy - h * 0.4} ${cx + w * 0.2} ${cy - h * 0.2} C ${cx + w * 0.4} ${cy - h * 0.25} ${cx + w * 0.4} ${cy + h * 0.1} ${cx + w * 0.3} ${cy + h * 0.25} C ${cx + w * 0.15} ${cy + h * 0.35} ${cx - w * 0.15} ${cy + h * 0.35} ${cx - w * 0.3} ${cy + h * 0.25} Z`;
    }

    case 'hexagon': {
      const s = w * 0.2;
      return `M ${x + s} ${y} L ${x + w - s} ${y} L ${x + w} ${y + h / 2} L ${x + w - s} ${y + h} L ${x + s} ${y + h} L ${x} ${y + h / 2} Z`;
    }

    case 'arrow': {
      const ex = x + w;
      const ey = y + h;
      const len = Math.hypot(w, h);
      if (len < 1) return '';
      const cosA = w / len;
      const sinA = h / len;
      const headLen = Math.min(14, len * 0.25);
      const headW = headLen * 0.5;
      const baseX = ex - headLen * cosA;
      const baseY = ey - headLen * sinA;
      let path = `M ${x} ${y} L ${baseX} ${baseY} M ${baseX + headW * sinA} ${baseY - headW * cosA} L ${ex} ${ey} L ${baseX - headW * sinA} ${baseY + headW * cosA}`;
      if (direction === 'free-bi') {
        const sBaseX = x + headLen * cosA;
        const sBaseY = y + headLen * sinA;
        path += ` M ${sBaseX + headW * sinA} ${sBaseY - headW * cosA} L ${x} ${y} L ${sBaseX - headW * sinA} ${sBaseY + headW * cosA}`;
      }
      return path;
    }

    case 'sticky':
      return `M ${x} ${y} L ${x + w} ${y} L ${x + w} ${y + h} L ${x} ${y + h} Z`;

    case 'line':
      return `M ${x} ${y} L ${x + w} ${y}`;

    default:
      return '';
  }
};
