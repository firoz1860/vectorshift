<div align="center">

<img src="https://img.shields.io/badge/VectorShift-Pipeline%20API-6366f1?style=for-the-badge&logo=fastapi&logoColor=white" alt="VectorShift Backend" />

# ⚙️ VectorShift — Backend

**FastAPI backend that parses pipelines and detects Directed Acyclic Graphs (DAGs)**

[![FastAPI](https://img.shields.io/badge/FastAPI-0.115.12-009688?style=flat-square&logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com/)
[![Python](https://img.shields.io/badge/Python-3.11-3776AB?style=flat-square&logo=python&logoColor=white)](https://python.org/)
[![Pydantic](https://img.shields.io/badge/Pydantic-2.11.3-E92063?style=flat-square&logo=pydantic&logoColor=white)](https://docs.pydantic.dev/)
[![Render](https://img.shields.io/badge/Deployed%20on-Render-46E3B7?style=flat-square&logo=render&logoColor=black)](https://render.com/)
[![License](https://img.shields.io/badge/License-MIT-green?style=flat-square)](LICENSE)

[🌐 Live API](https://vectorshift-backend-3nxl.onrender.com) · [📖 Swagger Docs](https://vectorshift-backend.onrender.com/docs) · [🐛 Report Bug](https://github.com/firoz1860/vectorshift-backend/issues)

</div>

---

## 📸 Screenshots

<div align="center">

### Swagger UI — Interactive API Docs
![Swagger UI](https://placehold.co/900x450/1a1a2e/009688?text=FastAPI+Swagger+UI+—+%2Fdocs)

### POST /pipelines/parse — Request
![API Request](https://placehold.co/900x300/1a1a2e/ffffff?text=POST+%2Fpipelines%2Fparse+—+Request+Body+%7B+nodes%5B%5D%2C+edges%5B%5D+%7D)

### POST /pipelines/parse — Response
![API Response](https://placehold.co/900x200/1a1a2e/46E3B7?text=%7B+num_nodes%3A+3%2C+num_edges%3A+2%2C+is_dag%3A+true+%7D)

</div>

---

## 📁 Project Structure

```
backend/
├── main.py              # FastAPI app — endpoints, CORS, DAG algorithm
├── requirements.txt     # Python dependencies
└── runtime.txt          # Python version pin for Render (python-3.11.0)
```

---

## ✨ Features

- ✅ **Pipeline parsing** — counts nodes and edges from submitted pipeline JSON
- ✅ **DAG detection** — uses Kahn's topological sort algorithm (O(V+E))
- ✅ **CORS configured** — accepts requests from localhost and Vercel
- ✅ **Pydantic validation** — auto-validates request body, returns 422 on bad input
- ✅ **Swagger UI** — interactive API docs at `/docs`
- ✅ **ReDoc** — alternative docs at `/redoc`

---

## 🔬 DAG Detection Algorithm

The backend uses **Kahn's Algorithm** (BFS-based topological sort) to check if the pipeline is a Directed Acyclic Graph:

```
1. Build adjacency list and in-degree map from edges
2. Add all zero-in-degree nodes to a queue
3. Process queue — for each node, reduce neighbour in-degrees
4. If visited count == total nodes → no cycle → is a DAG ✅
5. If any node remains unvisited → cycle exists → not a DAG ❌
```

```python
# Example: 3 nodes, 2 edges, no cycle
Input:  nodes=[A, B, C]  edges=[A→B, B→C]
Output: { num_nodes: 3, num_edges: 2, is_dag: true }

# Example: cycle detected
Input:  nodes=[A, B]  edges=[A→B, B→A]
Output: { num_nodes: 2, num_edges: 2, is_dag: false }
```

---

## 🚀 Getting Started

### Prerequisites

```
Python >= 3.11
pip >= 23
```

### Installation & Run

```powershell
# 1. Clone the repo
git clone https://github.com/firoz1860/vectorshift-backend.git
cd vectorshift-backend

# 2. (Optional) Create virtual environment
python -m venv venv
venv\Scripts\activate        # Windows
# source venv/bin/activate   # Mac/Linux

# 3. Install dependencies
pip install -r requirements.txt

# 4. Start the server
uvicorn main:app --reload
```

Server runs at: [http://localhost:8000](http://localhost:8000)
Swagger docs at: [http://localhost:8000/docs](http://localhost:8000/docs)

---

## 📡 API Reference

### `GET /`
Health check endpoint.

**Response:**
```json
{ "Ping": "Pong" }
```

---

### `POST /pipelines/parse`
Parses a pipeline and returns node count, edge count, and DAG status.

**Request Body:**
```json
{
  "nodes": [
    { "id": "customInput-1", "type": "customInput", "position": { "x": 100, "y": 100 }, "data": {} },
    { "id": "llm-1",         "type": "llm",         "position": { "x": 300, "y": 100 }, "data": {} },
    { "id": "customOutput-1","type": "customOutput", "position": { "x": 500, "y": 100 }, "data": {} }
  ],
  "edges": [
    { "id": "e1", "source": "customInput-1", "target": "llm-1" },
    { "id": "e2", "source": "llm-1",         "target": "customOutput-1" }
  ]
}
```

**Response `200 OK`:**
```json
{
  "num_nodes": 3,
  "num_edges": 2,
  "is_dag": true
}
```

**Response `422 Unprocessable Entity`** (invalid body):
```json
{
  "detail": [
    {
      "loc": ["body", "nodes"],
      "msg": "field required",
      "type": "value_error.missing"
    }
  ]
}
```

---

## 🧪 Testing the API

### Using Swagger UI (easiest)
Open [http://localhost:8000/docs](http://localhost:8000/docs) → click `POST /pipelines/parse` → **Try it out**

### Using PowerShell (curl)
```powershell
# Health check
Invoke-RestMethod -Uri http://localhost:8000/ -Method GET

# Parse pipeline
$body = @{
  nodes = @(
    @{ id = "a"; type = "customInput" },
    @{ id = "b"; type = "llm" },
    @{ id = "c"; type = "customOutput" }
  )
  edges = @(
    @{ source = "a"; target = "b" },
    @{ source = "b"; target = "c" }
  )
} | ConvertTo-Json -Depth 5

Invoke-RestMethod `
  -Uri http://localhost:8000/pipelines/parse `
  -Method POST `
  -ContentType "application/json" `
  -Body $body
```

### Using Python requests
```python
import requests

payload = {
    "nodes": [{"id": "a"}, {"id": "b"}, {"id": "c"}],
    "edges": [{"source": "a", "target": "b"}, {"source": "b", "target": "c"}]
}
r = requests.post("http://localhost:8000/pipelines/parse", json=payload)
print(r.json())
# {'num_nodes': 3, 'num_edges': 2, 'is_dag': True}
```

---

## 📦 Dependencies

| Package | Version | Purpose |
|---------|---------|---------|
| `fastapi` | 0.115.12 | Web framework |
| `uvicorn[standard]` | 0.34.0 | ASGI server |
| `pydantic` | 2.11.3 | Request/response validation |
| `python-multipart` | 0.0.20 | Form data support |

---

## ☁️ Deployment (Render)

### Step-by-step

1. Push code to GitHub
2. Go to [render.com](https://render.com) → **New Web Service**
3. Connect your GitHub repo
4. Set these values:

| Field | Value |
|-------|-------|
| Root Directory | `backend` |
| Runtime | `Python 3` |
| Build Command | `pip install -r requirements.txt` |
| Start Command | `uvicorn main:app --host 0.0.0.0 --port 10000` |
| Instance Type | Free |

5. Add environment variable in **Settings → Environment**:

| Key | Value |
|-----|-------|
| `PYTHON_VERSION` | `3.11.0` |

6. Click **Deploy**

> ⚠️ **Note:** Render free tier spins down after 15 min of inactivity. First request after sleep takes ~30 seconds to wake up.

---

## 🐛 Troubleshooting

| Error | Cause | Fix |
|-------|-------|-----|
| `pydantic-core` Rust compile error | Python 3.14 + pydantic 2.x needs pre-built wheels | Set `PYTHON_VERSION=3.11.0` in Render dashboard |
| `runtime.txt` ignored | Render requires dashboard env var, not file | Add `PYTHON_VERSION` in Render → Settings → Environment |
| `unable to infer type` on startup | pydantic 1.x broken on Python 3.12+ | Use `pydantic==2.11.3` which has cp314 wheels |
| CORS error in browser | Frontend origin not in `allow_origins` | Add your Vercel URL to the CORS list in `main.py` |
| 422 on `/pipelines/parse` | Request body missing `nodes` or `edges` | Check payload matches the Pydantic schema |

---

## 📄 License

MIT © [VectorShift](https://github.com/firoz1860)
