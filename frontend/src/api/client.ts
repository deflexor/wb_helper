import type { ApiErrorCode, QuotaExceededError } from '@/api/types'

const API_PREFIX = import.meta.env.VITE_API_URL ?? ''

type ApiErrorBody = {
  code?: string
  message?: string
}

function isQuotaExceededErrorPayload(value: unknown): value is QuotaExceededError {
  if (!value || typeof value !== 'object') return false
  const payload = value as Record<string, unknown>
  return (
    payload.code === 'daily_quota_exceeded' &&
    typeof payload.message === 'string' &&
    typeof payload.used === 'number' &&
    typeof payload.limit === 'number' &&
    typeof payload.resets_at_utc === 'string' &&
    typeof payload.upgrade_url === 'string'
  )
}

export class ApiError extends Error {
  status: number
  code: ApiErrorCode | null
  quota: QuotaExceededError | null

  constructor(params: {
    status: number
    message: string
    code: ApiErrorCode | null
    quota?: QuotaExceededError | null
  }) {
    super(params.message)
    this.name = 'ApiError'
    this.status = params.status
    this.code = params.code
    this.quota = params.quota ?? null
  }
}

export function isQuotaExceededApiError(error: unknown): error is ApiError & {
  quota: QuotaExceededError
} {
  return (
    error instanceof ApiError &&
    error.status === 429 &&
    error.code === 'daily_quota_exceeded' &&
    error.quota != null
  )
}

async function parseError(res: Response): Promise<ApiError> {
  const text = await res.text()
  if (!text) {
    return new ApiError({
      status: res.status,
      message: res.statusText || 'Request failed',
      code: null,
    })
  }
  try {
    const j = JSON.parse(text) as ApiErrorBody
    const code =
      j.code === 'daily_quota_exceeded' || j.code === 'quota_backend_unavailable'
        ? j.code
        : typeof j.code === 'string'
          ? 'unknown'
          : null
    const message = j.message ?? text
    const quota = isQuotaExceededErrorPayload(j) ? j : null
    return new ApiError({
      status: res.status,
      message,
      code,
      quota,
    })
  } catch {
    return new ApiError({
      status: res.status,
      message: text,
      code: null,
    })
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
    throw await parseError(res)
  }
  return res.json() as Promise<TResponse>
}

export async function apiPostJsonAuth<TResponse>(
  path: string,
  body: unknown,
  token: string,
): Promise<TResponse> {
  const url = `${API_PREFIX}${path}`
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(body),
  })
  if (!res.ok) {
    throw await parseError(res)
  }
  return res.json() as Promise<TResponse>
}

export async function apiPostJsonAuthWithHeaders<TResponse>(
  path: string,
  body: unknown,
  token: string,
): Promise<{ data: TResponse; headers: Headers }> {
  const url = `${API_PREFIX}${path}`
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(body),
  })
  if (!res.ok) {
    throw await parseError(res)
  }
  const data = (await res.json()) as TResponse
  return { data, headers: res.headers }
}
