import { Env, json, methodNotAllowed, supabaseRequest } from './_shared'

export const onRequestGet: PagesFunction<Env> = async ({ env }) => {
  const configured = Boolean(
    env.SUPABASE_URL && env.SUPABASE_SERVICE_ROLE_KEY && env.CODE_PEPPER,
  )
  if (!configured) {
    return json({ ok: false, service: 'shiguang-access', configured, database: false }, 503)
  }

  try {
    await supabaseRequest<unknown[]>(env, 'access_codes?select=id&limit=1')
    return json({ ok: true, service: 'shiguang-access', configured, database: true })
  } catch (error) {
    console.error('Health database check failed', error)
    return json({ ok: false, service: 'shiguang-access', configured, database: false }, 503)
  }
}

export const onRequest: PagesFunction<Env> = async (context) => {
  if (context.request.method === 'GET') return onRequestGet(context)
  return methodNotAllowed()
}
