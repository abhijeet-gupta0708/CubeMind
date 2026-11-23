# CubeMind

A 3D Rubik's Cube solver with a real two-phase Kociemba solver, an interactive
cube editor, animated move playback, a scramble generator, an algorithm library
and optional webcam sticker detection.

- **Frontend:** React 19, TypeScript, Vite 8, Three.js / React Three Fiber,
  Tailwind CSS 3, Framer Motion, React Router 7.
- **Backend:** FastAPI, Pydantic, NumPy and OpenCV (headless). The solver is a
  dependency-free, pure-Python implementation of Kociemba's two-phase algorithm
  with precomputed coordinate/pruning tables.

No mock or hard-coded solutions are used: every solution comes from the API and
is replay-verified against the submitted cube before it is returned.

---

## Contents

- [Quick start](#quick-start)
- [Using the app](#using-the-app)
- [Architecture](#architecture)
- [API](#api)
- [Configuration](#configuration)
- [Tests and checks](#tests-and-checks)
- [Deployment](#deployment)
- [Limitations](#limitations)

---

## Quick start

Requirements: Node.js 20.19+ (Vite 8), Python 3.11+ and npm.

### Backend

```bash
cd backend
python -m venv .venv
# Windows: .\.venv\Scripts\activate    macOS/Linux: source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env                   # optional
python -m app.precompute               # optional: build tables ahead of time (~30 s)
uvicorn app.main:app --reload --port 8000
```

The API is at <http://127.0.0.1:8000>, interactive docs at
<http://127.0.0.1:8000/docs>. If you skip `precompute`, the first request
builds the tables in a background thread; `/health` stays responsive.

### Frontend

```bash
cd frontend
npm install
cp .env.example .env                   # leave VITE_API_URL empty for local dev
npm run dev
```

Open <http://localhost:5173>. Vite proxies `/api` to the backend on port 8000.
If your API runs elsewhere, set `VITE_DEV_API_PROXY` or `VITE_API_URL`.

### Production build (local)

```bash
cd frontend && npm run build && npm run preview
cd backend && uvicorn app.main:app --host 0.0.0.0 --port 8000
```

With `VITE_API_URL` empty in a production build, API calls use same-origin
`/api` paths, so the built client and API can be served from one origin.

---

## Using the app

| Area | What it does |
| --- | --- |
| **Solver** | Interactive 3D cube, face turn buttons and keyboard shortcuts, scramble generator, editor, solve button, move-by-move playback, progress and success animation, timer, undo/redo history. |
| **Learn** | Notation reference, beginner method walkthroughs and small animated demo cubes (independent of your main cube). |
| **Algorithms** | Searchable/filterable algorithm library with animated demos for OLL/PLL and common triggers. |
| **About** | Architecture, API reference, privacy notes and deployment tips. |

### Cube notation

Outer layers `U D L R F B`, slices `M E S`, whole-cube rotations `x y z`.
Suffix `'` turns counter-clockwise (as seen looking at that face) and `2`
turns 180°. Example: `R U R' U' F2`.

Every turn updates the cube state immediately; animation is purely visual.
Undo/redo, the editor and the API always operate on the same state.

### Facelet string format

Cubes are sent to the API as 54 characters in `U,R,F,D,L,B` order, each face
read left-to-right, top-to-bottom as seen face-on. Solved is:

```
UUUUUUUUURRRRRRRRRFFFFFFFFFDDDDDDDDDLLLLLLLLLBBBBBBBBB
```

Centres determine face colours. Whole-cube rotations are normalised by the
server before solving; returned moves are positional, relative to the cube as
submitted.

---

## Architecture

```
CubeMind/
├── frontend/
│   ├── src/lib/cube/       # cubie model, facelet extraction, moves, notation
│   ├── src/workspace/      # reducer/provider shared by all pages
│   ├── src/components/     # 3D canvas, net editor, scanner, panels, UI kit
│   ├── src/pages/          # Solver, Learn, Algorithms, About
│   └── src/styles.css      # design system + responsive/a11y rules
└── backend/
    ├── app/api.py          # routes and HTTP error mapping
    ├── app/models.py       # Pydantic request/response schemas
    ├── app/cube/           # facelets, cubie parser, coordinates, tables, solver
    ├── app/services/       # OpenCV face detection
    └── tests/              # API and engine tests
```

The frontend keeps 26 cubies with exact integer rotation matrices, derives
facelets on demand and normalises local state before API calls. The backend is
authoritative: it validates cubie parity/orientation, solves, and replays the
solution to confirm it reaches the solved state.

---

## API

All routes are available at the root and under `/api`. Errors use:

```json
{ "error": { "message": "...", "code": "...", "details": null } }
```

### `GET /health`

```json
{
  "status": "ok",
  "service": "cubemind-api",
  "version": "1.0.0",
  "solver": "kociemba-two-phase",
  "tablesCached": true,
  "tablesLoaded": true,
  "scanning": true
}
```

### `POST /validate`

```bash
curl -s localhost:8000/api/validate \
  -H 'content-type: application/json' \
  -d '{"cube":"UUUUUUUUURRRRRRRRRFFFFFFFFFDDDDDDDDDLLLLLLLLLBBBBBBBBB"}'
```

Returns `valid`, `errors`, `counts`, `normalizedCube` and `normalized`.

### `POST /solve`

```bash
curl -s localhost:8000/api/solve \
  -H 'content-type: application/json' \
  -d '{"cube":"<54 facelets>"}'
```

```json
{
  "solution": ["R", "U", "R'", "U'"],
  "moveCount": 4,
  "notation": "R U R' U'",
  "verified": true,
  "normalized": false,
  "elapsedMs": 12.4,
  "nodes": 1832
}
```

`422 invalid_cube` means the sticker counts, cubie orientation or parity make
the cube unsolvable. `503 solver_timeout` means the search budget was exhausted.

### `POST /scramble`

```bash
curl -s localhost:8000/api/scramble \
  -H 'content-type: application/json' -d '{"length":20}'
```

Returns `moves`, `notation` and `length` (1–100). Difficulty presets in the UI
map to lengths 12 / 20 / 30.

### `POST /scan/detect` (optional)

Requires OpenCV. Send `{"image":"data:image/jpeg;base64,...","face":"U"}`.
Returns nine `stickers` (with `null` for unreadable), per-sticker
`confidences`, `warnings`, `quadDetected` and `averageColor`. Detection is a
best-effort colour heuristic — always review stickers in the correction grid
before applying them. `503 scanning_unavailable` is returned when OpenCV is
missing; the UI disables upload and shows a clear notice.

---

## Configuration

Backend (`.env` in `backend/`, see `backend/.env.example`):

| Variable | Default | Purpose |
| --- | --- | --- |
| `CORS_ORIGINS` | localhost:5173/4173 | Comma-separated browser origins; `*` allows all. |
| `SOLVER_TIME_LIMIT` | `20` | Two-phase search time budget in seconds. |
| `SOLVER_NODE_LIMIT` | `4000000` | Search node budget. |
| `KOCIEMBA_TABLES_PATH` | `backend/.cache/kociemba_tables.pkl` | Cache location; use a persistent path in production. |
| `MAX_IMAGE_BYTES` | `8388608` | Max decoded scan image size. |
| `LOG_LEVEL` | `info` | Python log level. |

Frontend (`frontend/.env`, see `frontend/.env.example`):

| Variable | Purpose |
| --- | --- |
| `VITE_API_URL` | API origin, e.g. `https://cubemind-api.onrender.com`. Empty = same-origin `/api` (dev proxy locally). |
| `VITE_DEV_API_PROXY` | Dev-only proxy target override. |

---

## Tests and checks

```bash
cd backend
PYTHONPATH=. .venv/Scripts/python -m pytest -q   # 28 tests (Windows)
python -m app.precompute --force                  # rebuild solver tables

cd ../frontend
npm run typecheck
npm test                 # Vitest: cube engine, parsers, parity with backend fixtures
npm run build
```

Frontend facelet fixtures are generated from the Python engine, so the two
implementations are checked against each other rather than against each other's
assumptions.

---

## Deployment

### Frontend — Vercel

1. Import the repository and set **Root Directory** to `frontend`.
2. Framework preset: **Vite** (`npm run build`, output `dist`).
3. Add environment variable `VITE_API_URL=https://<your-api-host>`.
4. `frontend/vercel.json` includes the SPA rewrite so deep links work.

### Backend — Render

`render.yaml` in the project root defines a Python web service rooted at
`backend`:

- Build: `pip install -r requirements.txt`
- Start: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
- Health check: `/health`

Set `CORS_ORIGINS` to your Vercel origin (exact scheme + host, no trailing
slash). Keep `KOCIEMBA_TABLES_PATH=/tmp/kociemba_tables.pkl` for a per-instance
cache, or attach a persistent disk and point the variable at a path on it to
avoid the one-time ~30 s table build after each deploy. For a self-hosted
server, run `python -m app.precompute` before starting uvicorn.

### Single-origin alternative

Serve `frontend/dist` as static files from the same host as the API and leave
`VITE_API_URL` unset. FastAPI's `/api` routes and the SPA can then share an
origin, avoiding CORS entirely.

---

## Limitations

- Camera scanning reads sticker colours from a roughly square, well-lit face.
  It is not a full cube-state reconstruction system: you must enter all six
  faces, and misread stickers can make a cube unsolvable. The correction grid
  exists for this reason.
- The two-phase solver optimises for move count within a bounded search; it is
  not guaranteed to find a globally optimal solution. The default budget
  solves typical scrambles in about a second.
- `zoom`/cube rotations are visual conveniences; the solver normalises whole
  cube rotations internally.
- No accounts, persistence or telemetry. Everything runs in the browser and
  in the API process.
#   C u b e M i n d  
 