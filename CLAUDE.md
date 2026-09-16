# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Context

Next.js 15 web app that fetches live data from a Dynatrace environment via the DQL Execution API and renders it as an external infrastructure observability dashboard.

Auth uses a **Dynatrace platform token** (not OAuth). The token and env URL live in `.env.local` (never committed). Use `.env.local.example` as the template.

## Development

```bash
npm run dev     # start dev server on http://localhost:3000
npm run build   # production build
npx tsc --noEmit  # type-check only
```

No test suite yet. TypeScript strict mode is on — always run `tsc --noEmit` after edits.

## Architecture

```
app/api/query/route.ts   ← server-side DQL proxy; all auth stays here
lib/dql.ts               ← executeDql() — POST + poll until SUCCEEDED
lib/queries.ts           ← all DQL query strings (one function per tile)
lib/transform.ts         ← timeseries record → TimeseriesPoint[]
components/Dashboard.tsx ← client component; fetches all tiles in parallel via /api/query
components/KpiCard.tsx   ← single-value tile with loading skeleton
components/ResourceChart.tsx  ← Recharts LineChart for timeseries metrics
components/PieChartTile.tsx   ← Recharts donut for categorical breakdowns
components/TimeframePicker.tsx ← 2h/6h/24h/7d toggle; triggers full re-fetch
```

**Data flow:** `Dashboard.tsx` → `POST /api/query` (one request per tile) → `lib/dql.ts` polls Dynatrace until `state === "SUCCEEDED"` → returns `records[]` → transform helpers shape data for Recharts.

## DQL conventions

- Timeframe is a DQL duration literal (`"2h"`, `"7d"`) passed as a string parameter; injected as `from: now()-${tf}` in `timeseries` queries, and `from: now()-${tf}` in `fetch` commands.
- `smartscapeNodes HOST` queries have no time filter — they reflect current topology state.
- The DQL Execution API endpoint: `POST /platform/storage/query/v1/query:execute`. Poll with `GET /platform/storage/query/v1/query:poll?request-token=…` until `state !== "RUNNING"`.
- Required token scope: `storage:query:execute`.

## Adding a new tile

1. Add a query function to `lib/queries.ts`.
2. Add the `dql(query)` call to the `Promise.all` in `components/Dashboard.tsx`.
3. Map the result record fields to a component prop shape.
4. Render a `KpiCard`, `ResourceChart`, or `PieChartTile` (or add a new chart type).

## Relevant Skills

- `/dt-dql-essentials` — before writing any new DQL query
- `/dt-app-dashboards` — if cross-referencing the native Dynatrace dashboard format
- `/dtctl` — run ad-hoc DQL against the environment to prototype queries before adding them
