import {
  codeHash,
  Env,
  isValidCodeFormat,
  json,
  methodNotAllowed,
  normalizeCode,
  parseBody,
  publicSession,
  randomToken,
  rpc,
  sessionCookie,
  sessionHash,
  type SessionPayload,
} from './_shared'

const errorMessages: Record<string, string> = {
  invalid_code: '卡密无效，请检查后重试',
  disabled_code: '卡密已停用，请联系售后',
  expired_code: '卡密已过期，请联系售后',
  redemption_limit_reached: '卡密已完成绑定，不能在新设备重复使用',
}

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  const body = await parseBody(request)
  const code = normalizeCode(body?.code)
  if (!isValidCodeFormat(code)) {
    return json({ ok: false, error: 'invalid_code', message: errorMessages.invalid_code }, 400)
  }

  try {
    const token = randomToken()
    const [hashedCode, hashedSession] = await Promise.all([
      codeHash(code, env),
      sessionHash(token, env),
    ])
    const result = await rpc<SessionPayload>(env, 'redeem_access_code', {
      p_code_hash: hashedCode,
      p_session_hash: hashedSession,
    })

    if (!result.ok || !result.expiresAt) {
      const error = result.error || 'invalid_code'
      return json(
        {
          ok: false,
          error,
          message: errorMessages[error] || '暂时无法核销，请稍后重试',
        },
        error === 'invalid_code' ? 400 : 403,
      )
    }

    return json(publicSession(result), 200, {
      'Set-Cookie': sessionCookie(token, result.expiresAt),
    })
  } catch (error) {
    console.error('Redeem failed', error)
    return json(
      { ok: false, error: 'service_unavailable', message: '核销服务暂时不可用，请稍后重试' },
      503,
    )
  }
}

export const onRequest: PagesFunction<Env> = async (context) => {
  if (context.request.method === 'POST') return onRequestPost(context)
  return methodNotAllowed()
}
