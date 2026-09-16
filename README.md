# Infrastructure Observability Dashboard

External web dashboard that fetches live infrastructure data from a Dynatrace environment and renders it as a standalone page — no Dynatrace login required for viewers once deployed.

Built with **Next.js 15**, **Recharts 3**, and **Tailwind CSS**. Authentication uses a Dynatrace platform token stored server-side; credentials are never exposed to the browser.

---

## Prerequisites

- Node.js 18+
- A Dynatrace platform token with scope `storage:metrics:read`, `storage:events:read`, `storage:smartscape:read`, `storage:buckets:read`

---

## Setup

```bash
# 1. Install dependencies
npm install

# 2. Configure environment
cp .env.local.example .env.local
# Edit .env.local and fill in DT_ENV_URL and DT_TOKEN

# 3. Start dev server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

---

## Environment variables

| Variable | Required | Description |
|---|---|---|
| `DT_ENV_URL` | Yes | Dynatrace environment base URL, e.g. `https://my-env.apps.dynatrace.com` |
| `DT_TOKEN` | Yes | Platform token with `storage:metrics:read`, `storage:events:read`, `storage:smartscape:read`, `storage:buckets:read` scopes |

---

## Dashboard tiles

| Tile | Type | DQL source |
|---|---|---|
| Total Hosts | Single value | `smartscapeNodes HOST` |
| Hosts with Active Problems | Single value | `fetch events` (DAVIS_EVENT, ACTIVE) |
| Total Network Traffic | Single value | `timeseries sum(bytes_rx + bytes_tx)` |
| Cloud Provider count | Single value | `smartscapeNodes HOST` grouped |
| Monitoring Modes count | Single value | `smartscapeNodes HOST` grouped |
| CPU & Memory over time | Line chart | `timeseries avg(dt.host.cpu/memory.usage)` |
| Hosts by Cloud Provider | Donut chart | `smartscapeNodes HOST` grouped |
| Hosts by Monitoring Mode | Donut chart | `smartscapeNodes HOST` grouped |

The timeframe picker (2h / 6h / 24h / 7d) re-fetches all tiles when changed. `smartscapeNodes` tiles always reflect current topology.

---

## Architecture

```
app/
  api/query/route.ts   # Server-side DQL proxy — token never leaves the server
  layout.tsx
  page.tsx
components/
  Dashboard.tsx        # Fetches all tiles in parallel, owns timeframe state
  KpiCard.tsx
  ResourceChart.tsx    # Line chart wrapper (Recharts)
  PieChartTile.tsx     # Donut chart wrapper (Recharts)
  TimeframePicker.tsx
lib/
  dql.ts               # executeDql() with automatic polling
  queries.ts           # DQL query strings, one function per tile
  transform.ts         # Timeseries record → chart-point helpers
```

### DQL Execution API

The app uses the Dynatrace Grail DQL API directly:

```
POST /platform/storage/query/v1/query:execute
GET  /platform/storage/query/v1/query:poll?request-token=<token>
```

Queries that complete quickly return `state: "SUCCEEDED"` immediately. Longer queries return `state: "RUNNING"` with a `requestToken`; `lib/dql.ts` polls every 600 ms until they finish.

---

## Adding a tile

1. Add a query function to `lib/queries.ts`
2. Add it to the `Promise.all` in `components/Dashboard.tsx`
3. Map the result records to a component — `KpiCard`, `ResourceChart`, or `PieChartTile`

---

## Production build

```bash
npm run build
npm start
```

The app is a standard Next.js deployment — works on Vercel, Docker, or any Node host. Keep `.env.local` (or equivalent environment variables) configured on the host; never commit the token.
