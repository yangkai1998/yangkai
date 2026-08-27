import { describe, expect, it } from 'vitest'
import {
  codeHash,
  generateAccessCode,
  isValidCodeFormat,
  normalizeCode,
  readCookie,
  sessionCookie,
  type Env,
} from './_shared'

const env = { CODE_PEPPER: 'test-pepper' } as Env

describe('access service helpers', () => {
  it('normalizes and validates production code format', () => {
    const code = normalizeCode('  sg-a8k2-p9x7 ')
    expect(code).toBe('SG-A8K2-P9X7')
    expect(isValidCodeFormat(code)).toBe(true)
    expect(isValidCodeFormat('SHIGUANG')).toBe(false)
  })

  it('generates unique customer-facing codes', () => {
    const codes = Array.from({ length: 100 }, () => generateAccessCode())
    expect(new Set(codes)).toHaveLength(100)
    codes.forEach((code) => expect(code).toMatch(/^SG-[A-Z2-9]{4}-[A-Z2-9]{4}$/))
  })

  it('hashes codes deterministically with a server-side pepper', async () => {
    const first = await codeHash('SG-A8K2-P9X7', env)
    const second = await codeHash('SG-A8K2-P9X7', env)
    const changed = await codeHash('SG-A8K2-P9X7', {
      ...env,
      CODE_PEPPER: 'another-pepper',
    })
    expect(first).toBe(second)
    expect(first).not.toBe(changed)
    expect(first).toMatch(/^[a-f0-9]{64}$/)
  })

  it('creates and reads a hardened session cookie', () => {
    const expiresAt = new Date(Date.now() + 60_000).toISOString()
    const cookie = sessionCookie('secret-token', expiresAt)
    expect(cookie).toContain('HttpOnly')
    expect(cookie).toContain('Secure')
    expect(cookie).toContain('SameSite=Strict')

    const request = new Request('https://example.com', {
      headers: { Cookie: 'other=value; shiguang_session=secret-token' },
    })
    expect(readCookie(request, 'shiguang_session')).toBe('secret-token')
  })
})
