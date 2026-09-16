'use client'

import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts'

const PALETTE = ['#1496ff', '#4dab9a', '#e8a317', '#f55656', '#9b8afb', '#38bdf8', '#fb923c']

interface Slice {
  name: string
  value: number
}

interface Props {
  title: string
  data: Slice[]
  loading?: boolean
}

function CustomTooltip({ active, payload }: { active?: boolean; payload?: { name: string; value: number }[] }) {
  if (!active || !payload?.length) return null
  const total = payload[0].value
  return (
    <div className="bg-dt-surface border border-dt-border rounded px-3 py-2 text-xs shadow-lg">
      <p className="text-dt-text font-semibold">{payload[0].name}</p>
      <p className="text-dt-muted">{total} hosts</p>
    </div>
  )
}

export default function PieChartTile({ title, data, loading }: Props) {
  return (
    <div className="bg-dt-card border border-dt-border rounded-xl p-5 flex flex-col gap-4">
      <p className="text-dt-muted text-xs uppercase tracking-widest font-medium">{title}</p>
      {loading ? (
        <div className="h-48 bg-dt-border rounded animate-pulse" />
      ) : data.length === 0 ? (
        <p className="text-dt-muted text-sm py-16 text-center">No data</p>
      ) : (
        <ResponsiveContainer width="100%" height={200}>
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={50}
              outerRadius={80}
              dataKey="value"
              stroke="none"
            >
              {data.map((_, i) => (
                <Cell key={i} fill={PALETTE[i % PALETTE.length]} />
              ))}
            </Pie>
            <Tooltip content={<CustomTooltip />} />
            <Legend
              wrapperStyle={{ fontSize: 11, color: '#8a8aaa' }}
              formatter={(value) => <span style={{ color: '#e0e0f0' }}>{value}</span>}
            />
          </PieChart>
        </ResponsiveContainer>
      )}
    </div>
  )
}
