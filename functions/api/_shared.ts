export interface Env {
  SUPABASE_URL: string
  SUPABASE_SERVICE_ROLE_KEY: string
  CODE_PEPPER: string
  ADMIN_API_TOKEN: string
}

export interface SessionPayload {
  ok: boolean
  code?: string
  sessionId?: string
  expiresAt?: string
  completionCount?: number
  maxCompletions?: number
  remainingCompletions?: number
  error?: string
}

export const SESSION_COOKIE = 'shiguang_session'
const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'

export function json(data: unknown, status = 200, headers: HeadersInit = {}): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
      ...headers,
    },
  })
}

export function methodNotAllowed(): Response {
  return json({ ok: false, error: 'method_not_allowed' }, 405, { Allow: 'GET, POST, PATCH' })
}

export function normalizeCode(value: unknown): string {
  if (typeof value !== 'string') return ''
  return value.trim().toUpperCase().replace(/\s+/g, '')
}

export function isValidCodeFormat(code: string): boolean {
  return /^SG-[A-Z2-9]{4}-[A-Z2-9]{4}$/.test(code)
}

export async function sha256(value: string): Promise<string> {
  const bytes = new TextEncoder().encode(value)
  const digest = await crypto.subtle.digest('SHA-256', bytes)
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, '0')).join('')
}

export function randomToken(byteLength = 32): string {
  const bytes = crypto.getRandomValues(new Uint8Array(byteLength))
  let binary = ''
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte)
  })
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '')
}

export function generateAccessCode(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(8))
  const value = [...bytes].map((byte) => CODE_ALPHABET[byte % CODE_ALPHABET.length]).join('')
  return `SG-${value.slice(0, 4)}-${value.slice(4)}`
}

export function readCookie(request: Request, name: string): string {
  const cookieHeader = request.headers.get('Cookie') || ''
  const prefix = `${name}=`
  const part = cookieHeader
    .split(';')
    .map((item) => item.trim())
    .find((item) => item.startsWith(prefix))
  return part ? decodeURIComponent(part.slice(prefix.length)) : ''
}

export function sessionCookie(token: string, expiresAt: string): string {
  const maxAge = Math.max(0, Math.floor((new Date(expiresAt).getTime() - Date.now()) / 1000))
  return [
    `${SESSION_COOKIE}=${encodeURIComponent(token)}`,
    'Path=/',
    'HttpOnly',
    'Secure',
    'SameSite=Strict',
    `Max-Age=${maxAge}`,
  ].join('; ')
}

export function clearSessionCookie(): string {
  return `${SESSION_COOKIE}=; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=0`
}

export async function codeHash(code: string, env: Env): Promise<string> {
  return sha256(`${env.CODE_PEPPER}:${code}`)
}

export async function sessionHash(token: string, env: Env): Promise<string> {
  return sha256(`${env.CODE_PEPPER}:session:${token}`)
}

export async function supabaseRequest<T>(
  env: Env,
  path: string,
  init: RequestInit = {},
): Promise<T> {
  if (!env.SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error('missing_supabase_configuration')
  }

  const response = await fetch(`${env.SUPABASE_URL.replace(/\/$/, '')}/rest/v1/${path}`, {
    ...init,
    headers: {
      apikey: env.SUPABASE_SERVICE_ROLE_KEY,
      Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
      'Content-Type': 'application/json',
      ...init.headers,
    },
  })

  const text = await response.text()
  const payload = text ? JSON.parse(text) : null
  if (!response.ok) {
    console.error('Supabase request failed', response.status, payload)
    throw new Error('database_request_failed')
  }
  return payload as T
}

export function rpc<T>(env: Env, functionName: string, body: unknown): Promise<T> {
  return supabaseRequest<T>(env, `rpc/${functionName}`, {
    method: 'POST',
    body: JSON.stringify(body),
  })
}

export async function isAdmin(request: Request, env: Env): Promise<boolean> {
  const authorization = request.headers.get('Authorization') || ''
  const provided = authorization.startsWith('Bearer ') ? authorization.slice(7) : ''
  if (!provided || !env.ADMIN_API_TOKEN) return false
  const [providedHash, expectedHash] = await Promise.all([
    sha256(provided),
    sha256(env.ADMIN_API_TOKEN),
  ])
  return providedHash === expectedHash
}

export async function parseBody(request: Request): Promise<Record<string, unknown> | null> {
  try {
    const body = await request.json()
    return body && typeof body === 'object' && !Array.isArray(body)
      ? (body as Record<string, unknown>)
      : null
  } catch {
    return null
  }
}

export function publicSession(payload: SessionPayload) {
  return {
    ok: payload.ok,
    expiresAt: payload.expiresAt,
    completionCount: payload.completionCount ?? 0,
    maxCompletions: payload.maxCompletions ?? 0,
    remainingCompletions: payload.remainingCompletions ?? 0,
  }
}
