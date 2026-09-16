````markdown
# CodeAtlas Backend

Backend MVP for CodeAtlas — analyzes Python repositories and builds a code dependency graph.

## Tech Stack

- Python
- FastAPI
- NetworkX
- Python AST
- Uvicorn

## Structure

```text
backend/
├── main.py
├── parser.py
├── graph.py
├── requirements.txt
├── test_parser.py
└── test_graph.py
````

## Setup

```bash
git clone https://github.com/Lakshya-18-web/CodeAtlas.git
cd CodeAtlas
git checkout aditya-backend
cd backend
```

Create virtual environment:

### Windows

```bash
python -m venv venv
venv\Scripts\activate
```

### macOS/Linux

```bash
python3 -m venv venv
source venv/bin/activate
```

Install dependencies:

```bash
pip install -r requirements.txt
```

## Run

```bash
python -m uvicorn main:app --reload
```

Backend:

```text
http://127.0.0.1:8000
```

API Docs:

```text
http://127.0.0.1:8000/docs
```

## APIs

| Method | Endpoint                    | Purpose              |
| ------ | --------------------------- | -------------------- |
| GET    | `/`                         | Health check         |
| POST   | `/api/analyze`              | Upload & analyze ZIP |
| GET    | `/api/graph`                | Get dependency graph |
| GET    | `/api/graph/node/{node_id}` | Get function details |
| GET    | `/api/risk`                 | Get risk scores      |

## Testing

```bash
python test_parser.py
python test_graph.py
```

## Current Flow

```text
Python ZIP
   ↓
AST Parser
   ↓
NetworkX Graph
   ↓
FastAPI
   ↓
Frontend
```

## Notes

* Graph is currently stored in memory.
* No database/authentication yet.
* Risk scoring is currently basic/mock and will be replaced by ML.
* RAG/Gemini integration will be added later.

```
```
