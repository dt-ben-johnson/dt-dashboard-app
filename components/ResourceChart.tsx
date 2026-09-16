'use client'

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'
import type { TimeseriesPoint } from '@/lib/transform'

export interface Series {
  key: string
  label: string
  color: string
}

interface Props {
  title: string
  data: TimeseriesPoint[]
  series: Series[]
  unit?: string
  domain?: [number | 'auto', number | 'auto']
  tickFormatter?: (v: number) => string
  loading?: boolean
  height?: number
}

function formatTick(ms: number) {
  return new Date(ms).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

function CustomTooltip({
  active,
  payload,
  label,
  unit,
  tickFormatter,
}: {
  active?: boolean
  payload?: { name: string; value: number; color: string }[]
  label?: number
  unit?: string
  tickFormatter?: (v: number) => string
}) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-dt-surface border border-dt-border rounded px-3 py-2 text-xs shadow-lg">
      <p className="text-dt-muted mb-1">{label ? new Date(label).toLocaleString() : ''}</p>
      {payload.map((p) => {
        const display = tickFormatter ? tickFormatter(p.value) : `${p.value != null ? p.value.toFixed(1) : '—'}${unit ?? ''}`
        return (
          <p key={p.name} style={{ color: p.color }}>
            {p.name}: <span className="font-semibold">{display}</span>
          </p>
        )
      })}
    </div>
  )
}

export default function ResourceChart({
  title,
  data,
  series,
  unit = '%',
  domain = [0, 100],
  tickFormatter,
  loading,
  height = 200,
}: Props) {
  const yTickFmt = tickFormatter ?? ((v: number) => `${v}`)

  return (
    <div className="bg-dt-card border border-dt-border rounded-xl p-5 flex flex-col gap-4">
      <p className="text-dt-muted text-xs uppercase tracking-widest font-medium">{title}</p>
      {loading ? (
        <div className="bg-dt-border rounded animate-pulse" style={{ height }} />
      ) : (
        <ResponsiveContainer width="100%" height={height}>
          <LineChart data={data} margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#2e2e42" />
            <XAxis
              dataKey="ts"
              tickFormatter={formatTick}
              tick={{ fill: '#8a8aaa', fontSize: 11 }}
              axisLine={false}
              tickLine={false}
              minTickGap={60}
            />
            <YAxis
              unit={tickFormatter ? undefined : unit}
              domain={domain}
              tickFormatter={yTickFmt}
              tick={{ fill: '#8a8aaa', fontSize: 11 }}
              axisLine={false}
              tickLine={false}
              width={52}
            />
            <Tooltip content={<CustomTooltip unit={unit} tickFormatter={tickFormatter} />} />
            <Legend wrapperStyle={{ fontSize: 11, color: '#8a8aaa', paddingTop: 8 }} />
            {series.map((s) => (
              <Line
                key={s.key}
                type="monotone"
                dataKey={s.key}
                name={s.label}
                stroke={s.color}
                dot={false}
                strokeWidth={2}
                connectNulls
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      )}
    </div>
  )
}
