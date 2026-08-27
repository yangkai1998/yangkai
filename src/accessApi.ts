export interface AccessSession {
  expiresAt: string
  completionCount: number
  maxCompletions: number
  remainingCompletions: number
}

interface ApiPayload {
  ok: boolean
  error?: string
  message?: string
  expiresAt?: string
  completionCount?: number
  maxCompletions?: number
  remainingCompletions?: number
}

export class AccessError extends Error {
  code: string

  constructor(code: string, message: string) {
    super(message)
    this.name = 'AccessError'
    this.code = code
  }
}

export const accessMode =
  import.meta.env.VITE_ACCESS_MODE || (import.meta.env.DEV ? 'demo' : 'api')
export const isDemoMode = accessMode === 'demo'
const DEMO_CODE = (import.meta.env.VITE_DEMO_ACCESS_CODE || 'SHIGUANG').toUpperCase()
const DEMO_ACCESS_KEY = 'shiguang-demo-access-v1'

const demoSession = (): AccessSession => ({
  expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
  completionCount: 0,
  maxCompletions: 999,
  remainingCompletions: 999,
})

function toSession(payload: ApiPayload): AccessSession {
  if (
    !payload.expiresAt ||
    typeof payload.completionCount !== 'number' ||
    typeof payload.maxCompletions !== 'number' ||
    typeof payload.remainingCompletions !== 'number'
  ) {
    throw new AccessError('invalid_response', '服务返回的数据不完整')
  }
  return {
    expiresAt: payload.expiresAt,
    completionCount: payload.completionCount,
    maxCompletions: payload.maxCompletions,
    remainingCompletions: payload.remainingCompletions,
  }
}

async function request(path: string, init?: RequestInit): Promise<ApiPayload> {
  let response: Response
  try {
    response = await fetch(path, {
      credentials: 'same-origin',
      ...init,
      headers: {
        'Content-Type': 'application/json',
        ...init?.headers,
      },
    })
  } catch {
    throw new AccessError('network_error', '网络连接失败，请检查网络后重试')
  }

  let payload: ApiPayload
  try {
    payload = (await response.json()) as ApiPayload
  } catch {
    throw new AccessError('invalid_response', '服务暂时不可用，请稍后重试')
  }

  if (!response.ok || !payload.ok) {
    throw new AccessError(payload.error || 'request_failed', payload.message || '操作失败，请重试')
  }
  return payload
}

export async function getAccessSession(): Promise<AccessSession | null> {
  if (isDemoMode) {
    return localStorage.getItem(DEMO_ACCESS_KEY) === 'granted' ? demoSession() : null
  }
  try {
    return toSession(await request('/api/session'))
  } catch (error) {
    if (
      error instanceof AccessError &&
      ['no_session', 'invalid_session'].includes(error.code)
    ) {
      return null
    }
    throw error
  }
}

export async function redeemAccessCode(code: string): Promise<AccessSession> {
  if (isDemoMode) {
    if (code.trim().toUpperCase() !== DEMO_CODE) {
      throw new AccessError('invalid_code', '体验码不正确，请检查后重试')
    }
    localStorage.setItem(DEMO_ACCESS_KEY, 'granted')
    return demoSession()
  }

  const payload = await request('/api/redeem', {
    method: 'POST',
    body: JSON.stringify({ code }),
  })
  return toSession(payload)
}

export async function recordQuizCompletion(
  completionKey: string,
  personaId: string,
): Promise<AccessSession> {
  if (isDemoMode) return demoSession()
  const payload = await request('/api/complete', {
    method: 'POST',
    body: JSON.stringify({ completionKey, personaId }),
  })
  return toSession(payload)
}

export function createCompletionKey(): string {
  if (typeof crypto.randomUUID === 'function') {
    return `result_${crypto.randomUUID()}`
  }
  return `result_${Date.now()}_${Math.random().toString(36).slice(2, 14)}`
}
