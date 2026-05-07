# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

**Read `AGENTS.md` for the full project specification** — development principles, technical constraints, UI/visual rules, math constraints, testing requirements, and forbidden actions. This file summarizes architecture and commands; AGENTS.md is the authoritative rulebook.

## Project

A Chinese-language 3D Cartesian vector teaching/demo app. Built with Vite, TypeScript, and Three.js. Single HTML page with a control panel (left sidebar) and a WebGL 3D viewport.

## Commands

```bash
# Local dev (conda recommended, but not required)
conda env create -f environment.yml    # first time only
conda activate cartesian-vectors
npm install
npm run dev                            # localhost:5173
npm run dev -- --host 0.0.0.0          # accessible on LAN
npm run build                          # tsc && vite build → dist/
npm run preview                        # preview the production build
```

Use `conda run -n cartesian-vectors npm run build` to run commands without activating the conda shell.

## Architecture

All application logic lives in two files:

- **`src/main.ts`** (~990 lines): The entire application — types, state, Three.js scene setup, WebGL + CSS2D rendering, fallback 2D canvas rendering, UI event binding, and all helper functions.
- **`src/styles.css`** (~550 lines): All styles, including responsive layout (panel + viewport grid), mobile breakpoints at 860px and 520px.

### Data model

- `VectorModel`: the source of truth for each vector. Stores Cartesian `x/y/z` as primary state, plus display settings (color, thickness, visibility toggles for components/angles/labels/projection box).
- `VectorRender`: runtime Three.js objects per vector (`THREE.Group` + array of `CSS2DObject` labels).
- `vectors` array + `selectedId` drive the entire app. `syncAll()` re-syncs controls, vector list, 3D scene, detail panel, and fallback canvas on every change.

### Rendering

- Primary: `THREE.WebGLRenderer` + `CSS2DRenderer` (for text labels) + `OrbitControls` (rotate/zoom/pan).
- Fallback: 2D isometric preview on a `<canvas>` via `CanvasRenderingContext2D`, shown when WebGL is unavailable.
- `animate()` runs `requestAnimationFrame` loop, updates controls, renders both WebGL and CSS2D layers.

### Key constraints

- **Chinese-first UI**, math symbols (`x/y/z`, `|v|`, `α/β/γ`, `cos(...)`) remain in Latin. Never change UI to English.
- **Frontend-only MVP** — no backend, login, database, React/Vue/UI frameworks, or marketing landing page. First screen must be the interactive app.
- **Cartesian `x/y/z` as primary state** — direction mode (Yaw/Pitch/|v|) converts to `x/y/z` immediately and is never stored long-term.
- **Zero vectors** are valid but direction, angles, and direction cosines must show "不可定义", never `NaN`.
- **CSS2D cleanup**: call `removeCss2DLabels()` to remove label DOM elements before clearing vector groups. Orphaned labels will persist in the DOM.
- **Axis colors**: X=red `#d94841`, Y=green `#26935d`, Z=blue `#2f6fca`. Axes use dashed/capsule style, main vectors use solid arrows. Component arrows use the parent vector's color with reduced opacity (0.38).
- **Minimal scope**: evaluate change boundaries before modifying code. Do not touch unrelated features, files, or system config. No refactoring or formatting churn beyond the task.
- **No destructive Git commands** (force push, hard reset, etc.) unless the user explicitly requests them.
- **Prefer conda environment** for Node/npm — do not assume or require system Node.

### CI/CD

GitHub Actions in `.github/workflows/deploy.yml`: builds with `npm ci && npm run build` and deploys `dist/` to GitHub Pages on push to `main`.
