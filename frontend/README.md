# Interview Whiteboard — LLD / HLD Diagram Tool

A visual whiteboard for drawing system design diagrams (LLD / HLD) with drag-to-draw shapes, free-direction arrows, smooth pen drawing, and Supabase-backed board saving.

## Features

- **Drag-to-draw shapes** — click and drag to create rectangles, circles, cylinders, diamonds, clouds, hexagons, sticky notes, and more at any size
- **Free-direction arrows** — drag in any direction to draw arrows pointing exactly where you want, with optional bidirectional mode
- **Smooth pen drawing** — Catmull-Rom spline interpolation produces fluid, natural freehand strokes
- **Resize handles** — select any shape and drag corner handles to resize
- **Pan & zoom** — scroll to zoom, pan tool or middle-mouse to move the canvas
- **Touch support** — pointer events work on tablets and touchscreens
- **Templates** — pre-built LLD/HLD diagrams (URL Shortener, Parking Lot, Chat System, Elevator, Cache)
- **Save boards** — persist diagrams to Supabase with thumbnails and categories
- **Export PNG** — download your diagram as a high-resolution image
- **Undo/redo** — full history with keyboard shortcuts

## Tech Stack

| Technology | Purpose |
|-----------|---------|
| React 18 | UI framework |
| Zustand | State management |
| Supabase | Board persistence (Postgres) |
| Vite | Build tool / dev server |
| Lucide Icons | Toolbar icons |

## Getting Started

```bash
npm install
npm run dev
```

Open http://localhost:5173

### Build for production

```bash
npm run build
```

Output is in `dist/`.

## Environment Variables

```
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

## Keyboard Shortcuts

| Key | Action |
|-----|--------|
| V | Select tool |
| P | Pen tool |
| E | Eraser tool |
| H | Pan tool |
| Ctrl+Z | Undo |
| Ctrl+Y / Ctrl+Shift+Z | Redo |
| Delete / Backspace | Delete selected |
| Escape | Deselect / cancel |

## Deployment

This project builds to static files in `dist/` and can be deployed to any static host (Bolt Hosting, Netlify, Vercel, GitHub Pages).

### Bolt Hosting

Click **Publish** in the top-right corner of Bolt to deploy instantly.

### GitHub + CI/CD

1. Connect your GitHub account via the GitHub icon in Bolt
2. Push commits to your repository
3. Set up your preferred CI/CD (Netlify, Vercel, GitHub Actions) to build and deploy from the `dist/` output

## License

MIT
