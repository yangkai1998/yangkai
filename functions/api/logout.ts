import { clearSessionCookie, Env, json, methodNotAllowed } from './_shared'

export const onRequestPost: PagesFunction<Env> = async () =>
  json({ ok: true }, 200, { 'Set-Cookie': clearSessionCookie() })

export const onRequest: PagesFunction<Env> = async (context) => {
  if (context.request.method === 'POST') return onRequestPost(context)
  return methodNotAllowed()
}
