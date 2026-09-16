const ENV_URL = process.env.DT_ENV_URL?.replace(/\/$/, '')
const TOKEN = process.env.DT_TOKEN

if (!ENV_URL || !TOKEN) {
  throw new Error('DT_ENV_URL and DT_TOKEN must be set in .env.local')
}

interface DqlResult {
  records: Record<string, unknown>[]
  types: unknown[]
  metadata: Record<string, unknown>
}

export async function executeDql(query: string): Promise<DqlResult> {
  const url = `${ENV_URL}/platform/storage/query/v1/query:execute`
  const body = {
    query,
    requestTimeoutMilliseconds: 60000,
    fetchTimeoutSeconds: 60,
    defaultScanLimitGbytes: 500,
    enableSampling: false,
  }

  console.log('\n--- DQL Query ---')
  console.log(query)
  console.log('\n--- Grail API Call ---')
  console.log(`POST ${url}`)
  console.log('Headers:', {
    Authorization: `Api-Token ${TOKEN?.slice(0, 8)}…`,
    'Content-Type': 'application/json',
  })
  console.log('Body:', JSON.stringify(body, null, 2))
  console.log('---')

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Api-Token ${TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
    // Don't cache — dashboard data should always be fresh
    cache: 'no-store',
  })

  console.log('\n--- Grail API Response ---')
  console.log('Status:', res.status, res.statusText)

  if (!res.ok) {
    const text = await res.text()
    console.log('Error response:', text)
    throw new Error(`DQL execute failed (${res.status}): ${text}`)
  }

  let data = await res.json()
  console.log('Execute response:', {
    state: data.state,
    requestToken: data.requestToken ? `${String(data.requestToken).slice(0, 8)}…` : undefined,
  })

  // Poll until the query finishes
  while (data.state === 'RUNNING') {
    await new Promise((r) => setTimeout(r, 600))
    const poll = await fetch(
      `${ENV_URL}/platform/storage/query/v1/query:poll?request-token=${encodeURIComponent(data.requestToken)}`,
      {
        headers: { Authorization: `Api-Token ${TOKEN}` },
        cache: 'no-store',
      },
    )
    console.log('Poll response:', poll.status, poll.statusText)
    if (!poll.ok) {
      const text = await poll.text()
      console.log('Poll error response:', text)
      throw new Error(`DQL poll failed (${poll.status}): ${text}`)
    }
    data = await poll.json()
  }

  if (data.state !== 'SUCCEEDED') {
    throw new Error(`DQL query did not succeed: ${JSON.stringify(data)}`)
  }

  const result = data.result as DqlResult
  console.log('Result response:', {
    state: data.state,
    recordCount: result?.records?.length ?? 0,
    types: result?.types,
    notifications: (result?.metadata as { grail?: { notifications?: unknown[] } })?.grail?.notifications ?? [],
  })

  return result
}
