interface Props {
  title: string
  value: string | number | null
  subtitle?: string
  accent?: 'default' | 'green' | 'amber' | 'red'
  loading?: boolean
}

const ACCENT: Record<string, string> = {
  default: 'text-dt-text',
  green:   'text-dt-green',
  amber:   'text-dt-amber',
  red:     'text-dt-red',
}

export default function KpiCard({ title, value, subtitle, accent = 'default', loading }: Props) {
  return (
    <div className="bg-dt-card border border-dt-border rounded-xl p-5 flex flex-col gap-2">
      <p className="text-dt-muted text-xs uppercase tracking-widest font-medium">{title}</p>
      {loading ? (
        <div className="h-10 w-24 bg-dt-border rounded animate-pulse" />
      ) : (
        <p className={`font-bold break-words ${typeof value === 'string' && value.length > 8 ? 'text-xl' : 'text-4xl tabular-nums'} ${ACCENT[accent]}`}>
          {value ?? '—'}
        </p>
      )}
      {subtitle && <p className="text-dt-muted text-xs">{subtitle}</p>}
    </div>
  )
}
