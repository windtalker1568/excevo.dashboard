---
name: excevo-dashboard-testing
description: How to build, run, and end-to-end test the Excevo React/Vite + Express dashboard app.
---

# Excevo Dashboard — Testing Guide

## Overview

The Excevo dashboard is a React (Vite + TypeScript) SPA served by an Express backend.
Data is stored in `server/data/db.json`.

## Devin Secrets Needed

None.

## One-time / per-session setup

1. `npm install` in the repo root.
   - `postinstall` runs `cd server && npm install && cd ../client && npm install`.
2. `npm run build` builds the client to `client/dist`.
3. `npm start` starts the Express server on `http://localhost:3000` and serves the built SPA.
   - If port 3000 is already in use, find and kill the existing Node process before restarting.
4. `cd server && node seed.js` populates sample data:
   - 20 advisors, 4 team leaders, 10 weeks of quality, Mon-Fri daily efficiency, 3 PIPs.

## Important notes

- The browser will show a "Download multiple files" permission prompt during the first Excel export. Allow downloads before running further export tests.
- Browser interactions are easier if the window is maximized (`wmctrl` on Linux; maximize manually on Windows).
- The file inputs on the Settings page are easier to drive by focusing the `<input type="file">` and pressing `Space` to open the OS file dialog, then typing the full file path and pressing `Return`.
- Date `type="date"` inputs can be flaky with scaled mouse coordinates. Use the native `HTMLInputElement.prototype.value` descriptor in the browser console and dispatch `input`/`change` events, then click `Apply Filters` via JS.

## Common workarounds

- If a sidebar link click does not register, use `window.location.assign('/<route>')` in the browser console.
- If `npm` scripts fail in PowerShell because of `&&`, run commands separately or use `cmd /c "cd server && node seed.js"`.

## Known fragility / bugs to watch for

- None currently.
