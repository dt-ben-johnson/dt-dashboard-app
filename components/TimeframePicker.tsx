'use client'

export type Timeframe = '2h' | '6h' | '24h' | '7d'

const OPTIONS: { label: string; value: Timeframe }[] = [
  { label: 'Last 2h',  value: '2h'  },
  { label: 'Last 6h',  value: '6h'  },
  { label: 'Last 24h', value: '24h' },
  { label: 'Last 7d',  value: '7d'  },
]

interface Props {
  value: Timeframe
  onChange: (tf: Timeframe) => void
}

export default function TimeframePicker({ value, onChange }: Props) {
  return (
    <div className="flex gap-1">
      {OPTIONS.map((o) => (
        <button
          key={o.value}
          onClick={() => onChange(o.value)}
          className={`px-3 py-1.5 rounded text-sm font-medium transition-colors ${
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
