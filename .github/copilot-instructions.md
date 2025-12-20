# Copilot / AI agent instructions — QuickBlog (client)

This file gives concise, actionable guidance for AI coding agents working on the frontend in `client/` (Vite + React).

1) Big picture
- This repository's `client/` is a Vite + React (JSX) single-page app. Entry: `client/src/main.jsx` -> renders `<App />` into `<div id="root">` in `index.html`.
- Build & dev: Vite handles dev server, HMR, and production build. See `vite.config.js` for plugin usage (`@vitejs/plugin-react`).

2) Key files & conventions to reference
- `client/package.json` — npm scripts you can run: `dev`, `build`, `preview`, `lint`.
- `client/src/main.jsx` — app bootstrap (StrictMode + createRoot). Use this when adding app-level providers (Context, Router, store).
- `client/src/App.jsx` — top-level app component (currently empty). New UI should be composed from `src/components/` (create this folder if needed).
- `client/index.html` & `client/src/index.css` — HTML host and global styles. Static public assets live in `client/public/` (e.g., `vite.svg`).
- `client/eslint.config.js` — project ESLint choices; rule note: `no-unused-vars` is enabled but ignores identifiers matching `^[A-Z_]`.

3) How to run & common workflows (developer shortcuts)
- Start dev server with: `cd client && npm install && npm run dev` — Vite serves at `http://localhost:5173` by default.
- Build for production: `cd client && npm run build`.
- Local preview of production build: `cd client && npm run preview`.
- Lint code: `cd client && npm run lint` (ESLint is configured in `eslint.config.js`).

4) Project-specific patterns and expectations
- File extensions are `.jsx` (not .js); keep JSX in `.jsx` files.
- Keep components small and colocate component styles in `src/` (project currently uses a single `index.css`).
- Entry-level composition: add global providers in `src/main.jsx` (wrap `<App />`) rather than inside `App.jsx` when the provider is truly global.
- Use React 19 APIs: `createRoot` (already used). Keep `StrictMode` wrapping for dev checks.

5) Integration points & dependencies
- No backend present in workspace. If you add API calls, default to relative environment-aware URLs and document expected env vars in the repo root. There is no `.env` yet.
- Key dependencies: `react`, `react-dom`, `vite`, `@vitejs/plugin-react` — modify `vite.config.js` if you add other Vite plugins.

6) Practical examples (copy/paste style)
- Add a new component and use it in `App.jsx`:
  - Create `client/src/components/Hello.jsx` exporting a default React component.
  - In `client/src/App.jsx`, import `./components/Hello.jsx` and render it inside `<main>`.
- Add a global provider (example): wrap `<App />` in `src/main.jsx` with `<BrowserRouter>` or a Context provider so child components can assume routing or context exists.

7) What to avoid / discovered quirks
- Don't change `type` in `package.json` from `module` without adjusting imports; the project uses ESM imports.
- ESLint ignores `dist` globally; builds live in `dist` after `npm run build`.
- `client/src/App.jsx` may be empty — it's safe to implement features there; prefer adding new `components/` instead of large monolithic `App.jsx` changes.

8) Suggested commit & PR style for AI agents
- Keep commits small and focused (one feature or refactor per PR).
- When introducing new package dependencies, update `client/package.json` and list the motivation in the PR description.

9) Useful pointers for follow-ups
- If adding tests, mention test framework choice in PR. No tests exist yet so introduce a lightweight test runner (e.g., Vitest) in a separate PR.
- If you add environment variables, add a `client/.env.example` documenting keys.

If anything here is unclear or you want more detail about runtime scripts, project layout, or preferred component patterns, tell me which area to expand and I'll update this file.
