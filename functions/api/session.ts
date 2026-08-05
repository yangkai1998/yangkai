import {
  clearSessionCookie,
  Env,
  json,
  methodNotAllowed,
  publicSession,
  readCookie,
  rpc,
  SESSION_COOKIE,
  sessionHash,
  type SessionPayload,
} from './_shared'

export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  const token = readCookie(request, SESSION_COOKIE)
  if (!token) {
    return json({ ok: false, error: 'no_session' }, 401)
  }

  try {
    const result = await rpc<SessionPayload>(env, 'validate_access_session', {
      p_session_hash: await sessionHash(token, env),
    })
    if (!result.ok) {
      return json({ ok: false, error: result.error || 'invalid_session' }, 401, {
        'Set-Cookie': clearSessionCookie(),
      })
    }
    return json(publicSession(result))
  } catch (error) {
    console.error('Session validation failed', error)
    return json({ ok: false, error: 'service_unavailable' }, 503)
  }
}

export const onRequest: PagesFunction<Env> = async (context) => {
  if (context.request.method === 'GET') return onRequestGet(context)
  return methodNotAllowed()
}
