'use client'

import { useState, useEffect, useCallback } from 'react'
import TimeframePicker, { type Timeframe } from './TimeframePicker'
import HostPicker, { type Host } from './HostPicker'
import RefreshPicker, { type RefreshInterval } from './RefreshPicker'
import KpiCard from './KpiCard'
import ResourceChart from './ResourceChart'
import PieChartTile from './PieChartTile'
import DataTable from './DataTable'
import { flattenTimeseries, formatBytes } from '@/lib/transform'
import type { TimeseriesPoint } from '@/lib/transform'
import {
  queryTotalHosts,
  queryHostsWithProblems,
  queryResourceTimeseries,
  queryCloudTypes,
  queryMonitoringModes,
  queryTotalTraffic,
  queryHostList,
  queryHostStates,
  queryNetworkTimeseries,
  queryEventsByType,
  queryTopHostsByResource,
} from '@/lib/queries'

// ── helpers ──────────────────────────────────────────────────────────────────

async function dql(query: string): Promise<Record<string, unknown>[]> {
  const res = await fetch('/api/query', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query }),
  })
  if (!res.ok) {
    const { error } = await res.json()
    throw new Error(error ?? `HTTP ${res.status}`)
  }
  const data = await res.json()
  return (data.records ?? []) as Record<string, unknown>[]
}

function getNumber(record: Record<string, unknown>, key: string): number | null {
  const v = record?.[key]
  if (typeof v === 'number') return v
  if (typeof v === 'string') {
    const n = Number(v)
    return isNaN(n) ? null : n
  }
  return null
}

function bytesTickFormatter(bytes: number): string {
  if (bytes >= 1e9)  return `${(bytes / 1e9).toFixed(1)}GB/s`
  if (bytes >= 1e6)  return `${(bytes / 1e6).toFixed(1)}MB/s`
  if (bytes >= 1e3)  return `${(bytes / 1e3).toFixed(1)}KB/s`
  return `${bytes.toFixed(0)}B/s`
}

function getEnvironmentLabel(url: string | undefined): string {
  if (url) {
    try {
      const hostname = new URL(url).hostname
      const tenant = hostname.split('.')[0]
      if (tenant) return tenant
    } catch {
      // Fall back when the configured URL is invalid.
    }
  }
  return 'Dynatrace'
}

// ── state ─────────────────────────────────────────────────────────────────────

interface DashboardState {
  totalHosts: number | null
  hostsWithProblems: number | null
  totalTrafficBytes: number | null
  cloudTypes: { name: string; value: number }[]
  monitoringModes: { name: string; value: number }[]
  hostStates: { name: string; value: number }[]
  eventsByType: { name: string; value: number }[]
  resourcePoints: TimeseriesPoint[]
  networkPoints: TimeseriesPoint[]
  topHosts: Record<string, unknown>[]
  error: string | null
  loading: boolean
  resourceLoading: boolean
}

const INITIAL: DashboardState = {
  totalHosts: null,
  hostsWithProblems: null,
  totalTrafficBytes: null,
  cloudTypes: [],
  monitoringModes: [],
  hostStates: [],
  eventsByType: [],
  resourcePoints: [],
  networkPoints: [],
  topHosts: [],
  error: null,
  loading: true,
  resourceLoading: false,
}

// ── component ─────────────────────────────────────────────────────────────────

export default function Dashboard({ environmentUrl }: { environmentUrl?: string }) {
  const environmentLabel = getEnvironmentLabel(environmentUrl)
  const [tf, setTf] = useState<Timeframe>('2h')
  const [state, setState] = useState<DashboardState>(INITIAL)
  const [timestamp, setTimestamp] = useState('')
  const [hosts, setHosts] = useState<Host[]>([])
  const [selectedHostId, setSelectedHostId] = useState('')
  const [refreshInterval, setRefreshInterval] = useState<RefreshInterval>(0)

  useEffect(() => { setTimestamp(new Date().toLocaleString()) }, [])

  // Load host list once on mount
  useEffect(() => {
    dql(queryHostList())
      .then((records) => setHosts(records.map((r) => ({ id: String(r.id), name: String(r.name) }))))
      .catch(() => {})
  }, [])

  // Re-fetch host-scoped charts when host changes
  const refreshResource = useCallback(async (timeframe: Timeframe, hostId: string) => {
    setState((s) => ({ ...s, resourceLoading: true }))
    try {
      const id = hostId || undefined
      const [resources, network] = await Promise.all([
        dql(queryResourceTimeseries(timeframe, id)),
        dql(queryNetworkTimeseries(timeframe, id)),
      ])
      setState((s) => ({
        ...s,
        resourcePoints: resources[0] ? flattenTimeseries(resources[0], ['cpu', 'memory', 'disk']) : [],
        networkPoints:  network[0]   ? flattenTimeseries(network[0],   ['rx', 'tx'])              : [],
        resourceLoading: false,
      }))
    } catch (err) {
      setState((s) => ({ ...s, resourceLoading: false, error: err instanceof Error ? err.message : String(err) }))
    }
  }, [])

  // Full refresh — all tiles in parallel, grouped by dependency
  const refresh = useCallback(async (timeframe: Timeframe, hostId: string) => {
    setState((s) => ({ ...s, loading: true, error: null }))
    try {
      const [
        hostCount, problems, resources, clouds, modes, traffic,
        states, network, events, topHostsRaw,
      ] = await Promise.all([
        dql(queryTotalHosts()),
        dql(queryHostsWithProblems(timeframe)),
        dql(queryResourceTimeseries(timeframe, hostId || undefined)),
        dql(queryCloudTypes()),
        dql(queryMonitoringModes()),
        dql(queryTotalTraffic(timeframe)),
        dql(queryHostStates()),
        dql(queryNetworkTimeseries(timeframe)),
        dql(queryEventsByType(timeframe)),
        dql(queryTopHostsByResource(timeframe)),
      ])

      setState({
        totalHosts:        getNumber(hostCount[0], 'hosts'),
        hostsWithProblems: getNumber(problems[0],  'hosts'),
        totalTrafficBytes: getNumber(traffic[0],   'totalBytes'),
        cloudTypes: clouds.map((r) => ({
          name:  String(r['cloud.provider'] ?? 'Unknown'),
          value: getNumber(r, 'count') ?? 0,
        })),
        monitoringModes: modes.map((r) => ({
          name:  String(r['dt.agent.monitoring_mode'] ?? 'Unknown'),
          value: getNumber(r, 'count') ?? 0,
        })),
        hostStates: states.map((r) => ({
          name:  String(r.state ?? 'Unknown'),
          value: getNumber(r, 'count') ?? 0,
        })),
        eventsByType: events.map((r) => ({
          name:  String(r.eventType ?? 'Unknown'),
          value: getNumber(r, 'event_count') ?? 0,
        })),
        resourcePoints: resources[0] ? flattenTimeseries(resources[0], ['cpu', 'memory', 'disk']) : [],
        networkPoints:  network[0]   ? flattenTimeseries(network[0],   ['rx', 'tx'])              : [],
        topHosts: topHostsRaw,
        error: null,
        loading: false,
        resourceLoading: false,
      })
    } catch (err) {
      setState((s) => ({
        ...s,
        loading: false,
        resourceLoading: false,
        error: err instanceof Error ? err.message : String(err),
      }))
    }
  }, [])

  useEffect(() => {
    refresh(tf, selectedHostId)
  }, [tf, refresh]) // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-refresh interval
  useEffect(() => {
    if (refreshInterval === 0) return
    const id = setInterval(() => refresh(tf, selectedHostId), refreshInterval * 60_000)
    return () => clearInterval(id)
  }, [refreshInterval, tf, selectedHostId, refresh])

  const handleHostChange = useCallback((hostId: string) => {
    setSelectedHostId(hostId)
    refreshResource(tf, hostId)
  }, [tf, refreshResource])

  const {
    totalHosts, hostsWithProblems, totalTrafficBytes,
    cloudTypes, monitoringModes, hostStates, eventsByType,
    resourcePoints, networkPoints, topHosts,
    error, loading, resourceLoading,
  } = state

  const problemAccent = hostsWithProblems === null ? 'default' : hostsWithProblems > 0 ? 'red' : 'green'

  const selectedHostName = selectedHostId ? hosts.find((h) => h.id === selectedHostId)?.name ?? selectedHostId : undefined
  const resourceTitle = selectedHostName ? `CPU, Memory & Disk — ${selectedHostName}` : 'Average CPU, Memory & Disk across all hosts'
  const networkTitle  = selectedHostName ? `NIC traffic — ${selectedHostName}` : 'NIC bytes received & sent across all hosts'

  return (
    <div className="min-h-screen bg-dt-bg text-dt-text p-6 space-y-8">

      {/* ── Header ── */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-xl font-semibold text-dt-text">Infrastructure Observability</h1>
          <p className="text-dt-muted text-sm mt-0.5">
            {environmentLabel}{timestamp ? ` · ${timestamp}` : ''}
          </p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          {(loading || resourceLoading) && <span className="text-dt-muted text-xs animate-pulse">Refreshing…</span>}
          <HostPicker hosts={hosts} value={selectedHostId} onChange={handleHostChange} loading={loading} />
          <TimeframePicker value={tf} onChange={setTf} />
          <RefreshPicker value={refreshInterval} onChange={setRefreshInterval} />
        </div>
      </div>

      {/* ── Error banner ── */}
      {error && (
        <div className="bg-red-900/30 border border-dt-red rounded-lg px-4 py-3 text-dt-red text-sm">{error}</div>
      )}

      {/* ── KPI row ── */}
      <section className="space-y-3">
        <h2 className="text-dt-muted text-xs uppercase tracking-widest font-semibold">Health Overview</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">
          <KpiCard title="Total Hosts"        value={totalHosts}        loading={loading && totalHosts === null} />
          <KpiCard title="Hosts w/ Problems"  value={hostsWithProblems} accent={problemAccent} loading={loading && hostsWithProblems === null} />
          <KpiCard title="Total Traffic"      value={totalTrafficBytes !== null ? formatBytes(totalTrafficBytes) : null} subtitle="received + sent" loading={loading && totalTrafficBytes === null} />
          <KpiCard title="Cloud Providers"    value={cloudTypes.length  || null} subtitle="distinct providers" loading={loading && cloudTypes.length === 0} />
          <KpiCard title="Monitoring Modes"   value={monitoringModes.length || null} subtitle="distinct modes" loading={loading && monitoringModes.length === 0} />
          <KpiCard title="Environment"        value={environmentLabel} />
        </div>
      </section>

      {/* ── Host states + Events ── */}
      <section className="space-y-3">
        <h2 className="text-dt-muted text-xs uppercase tracking-widest font-semibold">Host Status &amp; Events</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
          <PieChartTile title="Host states"              data={hostStates}    loading={loading && hostStates.length === 0} />
          <PieChartTile title="Events by resource type"  data={eventsByType}  loading={loading && eventsByType.length === 0} />
          <PieChartTile title="Hosts by cloud provider"  data={cloudTypes}    loading={loading && cloudTypes.length === 0} />
          <PieChartTile title="Hosts by monitoring mode" data={monitoringModes} loading={loading && monitoringModes.length === 0} />
        </div>
      </section>

      {/* ── Resource usage ── */}
      <section className="space-y-3">
        <h2 className="text-dt-muted text-xs uppercase tracking-widest font-semibold">Resource Usage</h2>
        <ResourceChart
          title={resourceTitle}
          data={resourcePoints}
          series={[
            { key: 'cpu',    label: 'CPU %',    color: '#1496ff' },
            { key: 'memory', label: 'Memory %', color: '#4dab9a' },
            { key: 'disk',   label: 'Disk %',   color: '#e8a317' },
          ]}
          loading={(loading || resourceLoading) && resourcePoints.length === 0}
        />
      </section>

      {/* ── Network ── */}
      <section className="space-y-3">
        <h2 className="text-dt-muted text-xs uppercase tracking-widest font-semibold">Network Traffic</h2>
        <ResourceChart
          title={networkTitle}
          data={networkPoints}
          series={[
            { key: 'rx', label: 'Received', color: '#1496ff' },
            { key: 'tx', label: 'Sent',     color: '#9b8afb' },
          ]}
          unit=""
          domain={[0, 'auto']}
          tickFormatter={bytesTickFormatter}
          loading={loading && networkPoints.length === 0}
        />
      </section>

      {/* ── Top hosts table ── */}
      <section className="space-y-3">
        <h2 className="text-dt-muted text-xs uppercase tracking-widest font-semibold">Top Hosts by Resource Utilisation</h2>
        <DataTable
          title="Top 10 hosts sorted by CPU (latest value)"
          rows={topHosts}
          columns={[
            { key: 'Name',   label: 'Host' },
            { key: 'CPU',    label: 'CPU %' },
            { key: 'Memory', label: 'Memory %' },
            { key: 'Disk',   label: 'Disk %' },
          ]}
          loading={loading && topHosts.length === 0}
        />
      </section>

    </div>
  )
}
