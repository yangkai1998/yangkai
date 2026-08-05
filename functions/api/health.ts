import { Env, json, methodNotAllowed } from './_shared'

export const onRequestGet: PagesFunction<Env> = async ({ env }) =>
  json({
    ok: true,
    service: 'shiguang-access',
    configured: Boolean(env.SUPABASE_URL && env.SUPABASE_SERVICE_ROLE_KEY && env.CODE_PEPPER),
  })

export const onRequest: PagesFunction<Env> = async (context) => {
  if (context.request.method === 'GET') return onRequestGet(context)
  return methodNotAllowed()
}
