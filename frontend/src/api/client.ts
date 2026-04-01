const API_PREFIX = import.meta.env.VITE_API_URL ?? ''

async function parseError(res: Response): Promise<string> {
  const text = await res.text()
  if (!text) return res.statusText || 'Request failed'
  try {
    const j = JSON.parse(text) as { message?: string }
    return j.message ?? text
  } catch {
    return text
  }
}

export async function apiPostJson<TResponse>(
  path: string,
  body: unknown,
): Promise<TResponse> {
  const url = `${API_PREFIX}${path}`
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  if (!res.ok) {
    throw new Error(await parseError(res))
  }
  return res.json() as Promise<TResponse>
}
