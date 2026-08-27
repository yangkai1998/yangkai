import {
  codeHash,
  Env,
  generateAccessCode,
  isAdmin,
  json,
  methodNotAllowed,
  parseBody,
  supabaseRequest,
} from '../_shared'

interface AdminCodeRecord {
  id: string
  code_hint: string
  status: string
  order_ref: string | null
  max_redemptions: number
  redemption_count: number
  max_completions: number
  valid_days: number
  expires_at: string | null
  created_at: string
}

const integerWithin = (value: unknown, fallback: number, min: number, max: number) => {
  const parsed = Number(value)
  return Number.isInteger(parsed) && parsed >= min && parsed <= max ? parsed : fallback
}

export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  if (!(await isAdmin(request, env))) {
    return json({ ok: false, error: 'unauthorized' }, 401)
  }

  try {
    const url = new URL(request.url)
    const limit = integerWithin(url.searchParams.get('limit'), 100, 1, 500)
    const records = await supabaseRequest<AdminCodeRecord[]>(
      env,
      `access_codes?select=id,code_hint,status,order_ref,max_redemptions,redemption_count,max_completions,valid_days,expires_at,created_at&order=created_at.desc&limit=${limit}`,
    )
    return json({ ok: true, items: records })
  } catch (error) {
    console.error('Admin code list failed', error)
    return json({ ok: false, error: 'service_unavailable' }, 503)
  }
}

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  if (!(await isAdmin(request, env))) {
    return json({ ok: false, error: 'unauthorized' }, 401)
  }

  const body = await parseBody(request)
  if (!body) return json({ ok: false, error: 'invalid_request' }, 400)

  const count = integerWithin(body.count, 1, 1, 200)
  const validDays = integerWithin(body.validDays, 7, 1, 365)
  const maxCompletions = integerWithin(body.maxCompletions, 3, 1, 100)
  const maxRedemptions = integerWithin(body.maxRedemptions, 1, 1, 10)
  const orderRef = typeof body.orderRef === 'string' ? body.orderRef.trim().slice(0, 100) : ''
  const expiresAt =
    typeof body.expiresAt === 'string' && !Number.isNaN(new Date(body.expiresAt).getTime())
      ? new Date(body.expiresAt).toISOString()
      : null

  try {
    const rawCodes = new Set<string>()
    while (rawCodes.size < count) rawCodes.add(generateAccessCode())

    const rows = await Promise.all(
      [...rawCodes].map(async (code, index) => ({
        code_hash: await codeHash(code, env),
        code_hint: `SG-••••-${code.slice(-4)}`,
        order_ref:
          orderRef && count > 1 ? `${orderRef}-${String(index + 1).padStart(3, '0')}` : orderRef || null,
        max_redemptions: maxRedemptions,
        max_completions: maxCompletions,
        valid_days: validDays,
        expires_at: expiresAt,
      })),
    )

    const created = await supabaseRequest<AdminCodeRecord[]>(
      env,
      'access_codes?select=id,code_hint,status,order_ref,max_redemptions,redemption_count,max_completions,valid_days,expires_at,created_at',
      {
        method: 'POST',
        headers: { Prefer: 'return=representation' },
        body: JSON.stringify(rows),
      },
    )

    return json({
      ok: true,
      items: created.map((record, index) => ({
        ...record,
        code: [...rawCodes][index],
      })),
      warning: '完整卡密只会在本次响应中出现，请立即下载保存。',
    })
  } catch (error) {
    console.error('Admin code creation failed', error)
    return json({ ok: false, error: 'create_failed' }, 503)
  }
}

export const onRequest: PagesFunction<Env> = async (context) => {
  if (context.request.method === 'GET') return onRequestGet(context)
  if (context.request.method === 'POST') return onRequestPost(context)
  return methodNotAllowed()
}
