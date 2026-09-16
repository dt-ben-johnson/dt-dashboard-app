'use client'

export interface Host {
  id: string
  name: string
}

interface Props {
  hosts: Host[]
  value: string   // host id, or '' for all
  onChange: (id: string) => void
  loading?: boolean
}

export default function HostPicker({ hosts, value, onChange, loading }: Props) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      disabled={loading || hosts.length === 0}
      className="bg-dt-card border border-dt-border text-dt-text text-sm rounded px-3 py-1.5
                 focus:outline-none focus:ring-1 focus:ring-dt-blue disabled:opacity-50
                 max-w-xs truncate"
    >
      <option value="">All Hosts</option>
      {hosts.map((h) => (
        <option key={h.id} value={h.id}>
          {h.name}
        </option>
      ))}
    </select>
  )
}
