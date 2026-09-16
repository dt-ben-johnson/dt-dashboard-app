// Helpers to convert raw DQL result records into chart-friendly structures.

export interface TimeseriesPoint {
  ts: number    // epoch ms
  [metric: string]: number | null
}

/**
 * Converts a single DQL timeseries record (array-valued fields) into a flat
 * array of { ts, <metric>: value } points that Recharts can consume.
 *
 * DQL timeseries records contain:
 *   timeframe: { start: ISO, end: ISO }
 *   interval:  nanoseconds (number or string)
 *   <metric>:  number[]
 */
export function flattenTimeseries(
  record: Record<string, unknown>,
  metrics: string[],
): TimeseriesPoint[] {
  const tf = record.timeframe as { start: string; end: string }
  if (!tf) return []

  const startMs = Date.parse(tf.start)
  // interval comes back as nanoseconds
  const intervalNs =
    typeof record.interval === 'number'
      ? record.interval
      : Number(record.interval)
  const intervalMs = intervalNs / 1_000_000

  const firstMetric = metrics[0]
  const values = record[firstMetric] as (number | null)[]
  if (!values) return []

  return values.map((_, i) => {
    const point: TimeseriesPoint = { ts: startMs + i * intervalMs }
    for (const m of metrics) {
      const arr = record[m] as (number | null)[]
      point[m] = arr?.[i] ?? null
    }
    return point
  })
}

export function formatBytes(bytes: number): string {
  if (bytes >= 1e12) return `${(bytes / 1e12).toFixed(2)} TB`
  if (bytes >= 1e9)  return `${(bytes / 1e9).toFixed(2)} GB`
  if (bytes >= 1e6)  return `${(bytes / 1e6).toFixed(2)} MB`
  return `${(bytes / 1e3).toFixed(1)} KB`
}
