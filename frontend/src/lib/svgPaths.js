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
      const dir = direction || 'right';
      const head = 12;
      if (dir === 'free' || dir === 'free-bi') {
        const ex = x + w;
        const ey = y + h;
        const len = Math.hypot(w, h);
        if (len < 1) return '';
        const angle = Math.atan2(h, w);
        const headLen = Math.min(14, len * 0.25);
        const headW = headLen * 0.5;
        const cosA = Math.cos(angle);
        const sinA = Math.sin(angle);
        const baseX = ex - headLen * cosA;
        const baseY = ey - headLen * sinA;
        const w1X = baseX + headW * sinA;
        const w1Y = baseY - headW * cosA;
        const w2X = baseX - headW * sinA;
        const w2Y = baseY + headW * cosA;
        let path = `M ${x} ${y} L ${baseX} ${baseY} M ${w1X} ${w1Y} L ${ex} ${ey} L ${w2X} ${w2Y}`;
        if (dir === 'free-bi') {
          const sBaseX = x + headLen * cosA;
          const sBaseY = y + headLen * sinA;
          const sW1X = sBaseX + headW * sinA;
          const sW1Y = sBaseY - headW * cosA;
          const sW2X = sBaseX - headW * sinA;
          const sW2Y = sBaseY + headW * cosA;
          path += ` M ${sW1X} ${sW1Y} L ${x} ${y} L ${sW2X} ${sW2Y}`;
        }
        return path;
      }
      if (dir === 'right')
        return `M ${x} ${y} L ${x + w - head} ${y} M ${x + w - head} ${y - 6} L ${x + w} ${y} L ${x + w - head} ${y + 6}`;
      if (dir === 'left')
        return `M ${x + w} ${y} L ${x + head} ${y} M ${x + head} ${y - 6} L ${x} ${y} L ${x + head} ${y + 6}`;
      if (dir === 'up')
        return `M ${x} ${y + h} L ${x} ${y + head} M ${x - 6} ${y + head} L ${x} ${y} L ${x + 6} ${y + head}`;
      if (dir === 'down')
        return `M ${x} ${y} L ${x} ${y + h - head} M ${x - 6} ${y + h - head} L ${x} ${y + h} L ${x + 6} ${y + h - head}`;
      if (dir === 'bidirectional')
        return `M ${x + 12} ${y - 6} L ${x} ${y} L ${x + 12} ${y + 6} M ${x + w - 12} ${y - 6} L ${x + w} ${y} L ${x + w - 12} ${y + 6} M ${x} ${y} L ${x + w} ${y}`;
      return `M ${x} ${y} L ${x + w - head} ${y} M ${x + w - head} ${y - 6} L ${x + w} ${y} L ${x + w - head} ${y + 6}`;
    }

    case 'line':
      return `M ${x} ${y} L ${x + w} ${y}`;

    default:
      return '';
  }
};
