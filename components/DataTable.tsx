interface Props {
  title: string
  rows: Record<string, unknown>[]
  columns: { key: string; label: string; format?: (v: unknown) => string }[]
  loading?: boolean
}

function cell(v: unknown, format?: (v: unknown) => string): string {
  if (format) return format(v)
  if (v === null || v === undefined) return '—'
  return typeof v === 'number' ? v.toFixed(1) : String(v)
}

function heatClass(v: unknown): string {
  if (typeof v !== 'number') return ''
  if (v >= 90) return 'text-dt-red font-semibold'
  if (v >= 70) return 'text-dt-amber'
  return 'text-dt-green'
}

const PCT_KEYS = new Set(['CPU', 'Memory', 'Disk'])

export default function DataTable({ title, rows, columns, loading }: Props) {
  return (
    <div className="bg-dt-card border border-dt-border rounded-xl p-5 flex flex-col gap-4">
      <p className="text-dt-muted text-xs uppercase tracking-widest font-medium">{title}</p>
      {loading ? (
        <div className="h-48 bg-dt-border rounded animate-pulse" />
      ) : rows.length === 0 ? (
        <p className="text-dt-muted text-sm py-12 text-center">No data</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr>
                {columns.map((c) => (
                  <th key={c.key} className="text-left text-dt-muted font-medium text-xs pb-2 pr-4 border-b border-dt-border">
                    {c.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, i) => (
                <tr key={i} className="border-b border-dt-border/50 hover:bg-dt-border/20 transition-colors">
                  {columns.map((c) => {
                    const v = row[c.key]
                    const isPct = PCT_KEYS.has(c.key)
                    return (
                      <td key={c.key} className={`py-2 pr-4 ${isPct ? heatClass(v) : 'text-dt-text'}`}>
                        {cell(v, c.format)}{isPct && typeof v === 'number' ? '%' : ''}
                      </td>
                    )
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
