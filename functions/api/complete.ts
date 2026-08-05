import {
  Env,
  json,
  methodNotAllowed,
  parseBody,
  publicSession,
  readCookie,
  rpc,
  SESSION_COOKIE,
  sessionHash,
  type SessionPayload,
} from './_shared'

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  const token = readCookie(request, SESSION_COOKIE)
  if (!token) {
    return json({ ok: false, error: 'no_session', message: '登录状态已失效，请重新输入卡密' }, 401)
  }

  const body = await parseBody(request)
  const completionKey = typeof body?.completionKey === 'string' ? body.completionKey : ''
  const personaId = typeof body?.personaId === 'string' ? body.personaId : ''
  if (
    !/^[a-zA-Z0-9_-]{12,80}$/.test(completionKey) ||
    !/^[a-z0-9-]{2,80}$/.test(personaId)
  ) {
    return json({ ok: false, error: 'invalid_request', message: '结果数据不完整' }, 400)
  }

  try {
    const result = await rpc<SessionPayload>(env, 'complete_quiz_session', {
      p_session_hash: await sessionHash(token, env),
      p_completion_key: completionKey,
      p_persona_id: personaId,
    })
    if (!result.ok) {
      const exhausted = result.error === 'completion_limit_reached'
      return json(
        {
          ok: false,
          error: result.error || 'invalid_session',
          message: exhausted ? '本卡密的测试次数已用完' : '登录状态已失效，请重新输入卡密',
        },
        exhausted ? 403 : 401,
      )
    }
    return json(publicSession(result))
  } catch (error) {
    console.error('Completion failed', error)
    return json(
      { ok: false, error: 'service_unavailable', message: '暂时无法保存结果，请稍后重试' },
      503,
    )
  }
}

export const onRequest: PagesFunction<Env> = async (context) => {
  if (context.request.method === 'POST') return onRequestPost(context)
  return methodNotAllowed()
}
