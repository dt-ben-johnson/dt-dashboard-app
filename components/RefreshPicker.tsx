'use client'

export type RefreshInterval = 0 | 1 | 5 | 15  // minutes; 0 = off

const OPTIONS: { label: string; value: RefreshInterval }[] = [
  { label: 'Off',   value: 0  },
  { label: '1m',    value: 1  },
  { label: '5m',    value: 5  },
  { label: '15m',   value: 15 },
]

interface Props {
  value: RefreshInterval
  onChange: (v: RefreshInterval) => void
}

export default function RefreshPicker({ value, onChange }: Props) {
  return (
    <div className="flex items-center gap-1.5">
      <span className="text-dt-muted text-xs">Auto</span>
      {OPTIONS.map((o) => (
        <button
          key={o.value}
          onClick={() => onChange(o.value)}
          className={`px-2.5 py-1.5 rounded text-sm font-medium transition-colors ${
            value === o.value
              ? 'bg-dt-blue text-white'
              : 'bg-dt-card text-dt-muted hover:text-dt-text hover:bg-dt-border'
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}
