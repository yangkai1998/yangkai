import {
  Env,
  isAdmin,
  json,
  methodNotAllowed,
  parseBody,
  supabaseRequest,
} from '../../_shared'

const positiveInteger = (value: unknown, max: number): number | null => {
  const parsed = Number(value)
  return Number.isInteger(parsed) && parsed >= 1 && parsed <= max ? parsed : null
}

export const onRequestPatch: PagesFunction<Env> = async ({ request, env, params }) => {
  if (!(await isAdmin(request, env))) {
    return json({ ok: false, error: 'unauthorized' }, 401)
  }

  const id = Array.isArray(params.id) ? params.id[0] : params.id
  if (!id || !/^[0-9a-f-]{36}$/i.test(id)) {
    return json({ ok: false, error: 'invalid_id' }, 400)
  }

  const body = await parseBody(request)
  if (!body) return json({ ok: false, error: 'invalid_request' }, 400)

  const update: Record<string, unknown> = {}
  if (body.status === 'active' || body.status === 'disabled') update.status = body.status

  if ('maxCompletions' in body) {
    const value = positiveInteger(body.maxCompletions, 100)
    if (!value) return json({ ok: false, error: 'invalid_max_completions' }, 400)
    update.max_completions = value
  }
  if ('maxRedemptions' in body) {
    const value = positiveInteger(body.maxRedemptions, 10)
    if (!value) return json({ ok: false, error: 'invalid_max_redemptions' }, 400)
    update.max_redemptions = value
  }
  if ('validDays' in body) {
    const value = positiveInteger(body.validDays, 365)
    if (!value) return json({ ok: false, error: 'invalid_valid_days' }, 400)
    update.valid_days = value
  }
  if ('orderRef' in body) {
    update.order_ref =
      typeof body.orderRef === 'string' ? body.orderRef.trim().slice(0, 100) || null : null
  }
  if ('expiresAt' in body) {
    if (body.expiresAt === null || body.expiresAt === '') {
      update.expires_at = null
    } else if (
      typeof body.expiresAt === 'string' &&
      !Number.isNaN(new Date(body.expiresAt).getTime())
    ) {
      update.expires_at = new Date(body.expiresAt).toISOString()
    } else {
      return json({ ok: false, error: 'invalid_expires_at' }, 400)
    }
  }

  if (!Object.keys(update).length) {
    return json({ ok: false, error: 'empty_update' }, 400)
  }

  try {
    const records = await supabaseRequest<unknown[]>(
      env,
      `access_codes?id=eq.${encodeURIComponent(id)}&select=id,code_hint,status,order_ref,max_redemptions,redemption_count,max_completions,valid_days,expires_at,created_at`,
      {
        method: 'PATCH',
        headers: { Prefer: 'return=representation' },
        body: JSON.stringify(update),
      },
    )
    return records.length
      ? json({ ok: true, item: records[0] })
      : json({ ok: false, error: 'not_found' }, 404)
  } catch (error) {
    console.error('Admin code update failed', error)
    return json({ ok: false, error: 'update_failed' }, 503)
  }
}

export const onRequest: PagesFunction<Env> = async (context) => {
  if (context.request.method === 'PATCH') return onRequestPatch(context)
  return methodNotAllowed()
}
