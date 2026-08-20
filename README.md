# Excevo Dashboard

Performance analytics and reporting application for Advisors and Team Leaders.

## Sections

- Dashboard
- People
- PIPs
- Quality
- Leaderboard
- Export
- Settings

## Tech Stack

- React (Vite + TypeScript)
- Node.js + Express
- JSON-backed persistent data store
- `xlsx` for Excel import/export
- `recharts` for charts

## Quick Start

```bash
npm install
npm run build
npm start
```

Then open `http://localhost:3000`.

The API is available at `http://localhost:3000/api`.

## Import Data

Go to **Settings** and upload Excel files for People, Efficiency, Quality, or PIPs.

The expected sheet names and columns are:

- `People` sheet: `Advisor`, `Team Leader`
- `Efficiency` (or `SPH_EPH`) sheet: `Date`, `Advisor`, `Team Leader`, `EPH`, `SPH`
- `Quality` sheet: `Week` / `Week Commencing` / `Week Start`, `Advisor`, `Team Leader`, `True Score`, `Potential Score`
- `PIP` sheet: `Advisor`, `Team Leader`, `Date Added`, `Reason for PIP`, `PIP Weeks`

## Development

Run server and client in separate terminals:

```bash
npm run dev:server
# another terminal
npm run dev:client
```

The client dev server proxies API requests to `http://localhost:3000`.
