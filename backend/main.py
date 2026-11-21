import os
from collections import defaultdict, deque
from pathlib import Path
from typing import Any, Dict, List, Optional

from fastapi import FastAPI, HTTPException, Response
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, ConfigDict, Field

# Works both as a package ("backend.main", Docker) and as a script ("main",
# local uvicorn / pytest run from the backend/ directory).
try:
    from backend import db
except ImportError:  # pragma: no cover - import path depends on how app is launched
    import db

app = FastAPI(title="VectorShift Pipeline API")


# ---------------------------------------------------------------- CORS
# Comma-separated list, e.g. "https://my-app.vercel.app,http://localhost:5173"
# Optional regex for Vercel preview URLs, e.g. "https://.*\.vercel\.app"
def _allowed_origins() -> List[str]:
    raw = os.getenv("ALLOWED_ORIGINS", "http://localhost:5173,http://127.0.0.1:5173")
    return [o.strip().rstrip("/") for o in raw.split(",") if o.strip()]


app.add_middleware(
    CORSMiddleware,
    allow_origins=_allowed_origins(),
    allow_origin_regex=os.getenv("ALLOWED_ORIGIN_REGEX") or None,
    allow_credentials=False,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["*"],
)

# Ensure the boards table exists before the app serves any request.
db.init_db()


# ---------------------------------------------------------------- Models
class Node(BaseModel):
    model_config = ConfigDict(extra="allow")
    id: str


class Edge(BaseModel):
    model_config = ConfigDict(extra="allow")
    source: str
    target: str


class PipelineData(BaseModel):
    nodes: List[Node]
    edges: List[Edge]


# ---------------------------------------------------------------- Logic
def is_dag(nodes: List[Node], edges: List[Edge]) -> bool:
    """Kahn's algorithm. Edges that point to unknown nodes are ignored."""
    node_ids = {n.id for n in nodes}
    adj = defaultdict(list)
    in_degree = {nid: 0 for nid in node_ids}

    for e in edges:
        if e.source in node_ids and e.target in node_ids:
            adj[e.source].append(e.target)
            in_degree[e.target] += 1

    queue = deque(n for n, d in in_degree.items() if d == 0)
    visited = 0
    while queue:
        cur = queue.popleft()
        visited += 1
        for nb in adj[cur]:
            in_degree[nb] -= 1
            if in_degree[nb] == 0:
                queue.append(nb)

    return visited == len(node_ids)


# ---------------------------------------------------------------- Routes
@app.get("/health")
def health():
    return {"status": "ok"}


@app.post("/pipelines/parse")
def parse_pipeline(pipeline: PipelineData):
    return {
        "num_nodes": len(pipeline.nodes),
        "num_edges": len(pipeline.edges),
        "is_dag": is_dag(pipeline.nodes, pipeline.edges),
    }


# ---------------------------------------------------------------- Boards
# Persistence for saved whiteboards (single-tenant, no auth). The frontend
# posts the full serialized canvas, so nothing is lost on refresh/reopen.
class BoardIn(BaseModel):
    title: str = Field(min_length=1)
    category: str = "Custom"
    thumbnail: Optional[str] = None
    canvas_data: Dict[str, Any] = Field(default_factory=dict)


@app.get("/boards")
def list_boards():
    return db.list_boards()


@app.post("/boards", status_code=201)
def create_board(board: BoardIn):
    return db.create_board(board.title, board.category, board.thumbnail, board.canvas_data)


@app.get("/boards/{board_id}")
def get_board(board_id: str):
    board = db.get_board(board_id)
    if board is None:
        raise HTTPException(status_code=404, detail="Board not found")
    return board


@app.put("/boards/{board_id}")
def update_board(board_id: str, board: BoardIn):
    updated = db.update_board(
        board_id, board.title, board.category, board.thumbnail, board.canvas_data
    )
    if updated is None:
        raise HTTPException(status_code=404, detail="Board not found")
    return updated


@app.delete("/boards/{board_id}", status_code=204)
def delete_board(board_id: str):
    if not db.delete_board(board_id):
        raise HTTPException(status_code=404, detail="Board not found")
    return Response(status_code=204)


# ---------------------------------------------------------------- Frontend
# Serve the built React app when it exists (Docker / single-service deploy).
# If it does not exist (API-only deploy, local dev) the API still starts.
FRONTEND_DIST = Path(
    os.getenv("FRONTEND_DIST", Path(__file__).resolve().parent.parent / "frontend" / "dist")
)

if (FRONTEND_DIST / "index.html").is_file():
    app.mount("/", StaticFiles(directory=str(FRONTEND_DIST), html=True), name="frontend")
else:

    @app.get("/", include_in_schema=False)
    def root():
        return {"service": "VectorShift Pipeline API", "docs": "/docs", "health": "/health"}
