import { useEffect, useState } from 'react'
import {
  Check,
  Clipboard,
  Download,
  KeyRound,
  LoaderCircle,
  LogOut,
  Plus,
  RefreshCw,
  ShieldAlert,
} from 'lucide-react'

interface CodeRecord {
  id: string
  code?: string
  code_hint: string
  status: 'active' | 'disabled'
  order_ref: string | null
  max_redemptions: number
  redemption_count: number
  max_completions: number
  valid_days: number
  expires_at: string | null
  created_at: string
}

const TOKEN_KEY = 'shiguang-admin-token'

function formatAdminError(status: number, code?: string) {
  if (status === 401) return '管理密钥不正确'
  if (status === 503 || code === 'service_unavailable') {
    return '数据库暂时不可用（多半是 Supabase 免费项目休眠了）。请到 Supabase 控制台点 Restore，恢复后再试。'
  }
  return code || '请求失败'
}

async function adminRequest<T>(token: string, path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(path, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      ...init?.headers,
    },
  })
  const payload = (await response.json()) as T & { error?: string }
  if (!response.ok) {
    throw new Error(formatAdminError(response.status, payload.error))
  }
  return payload
}

export default function AdminPanel() {
  const [token, setToken] = useState(() => sessionStorage.getItem(TOKEN_KEY) || '')
  const [tokenDraft, setTokenDraft] = useState('')
  const [authenticated, setAuthenticated] = useState(false)
  const [codes, setCodes] = useState<CodeRecord[]>([])
  const [generated, setGenerated] = useState<CodeRecord[]>([])
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [copied, setCopied] = useState(false)
  const [form, setForm] = useState({
    count: 10,
    validDays: 7,
    maxCompletions: 3,
    maxRedemptions: 1,
    orderRef: '',
    expiresAt: '',
  })

  const loadCodes = async (activeToken = token) => {
    if (!activeToken) return
    setLoading(true)
    setError('')
    try {
      const payload = await adminRequest<{ ok: true; items: CodeRecord[] }>(
        activeToken,
        '/api/admin/codes?limit=200',
      )
      setCodes(payload.items)
      setAuthenticated(true)
    } catch (requestError) {
      setAuthenticated(false)
      setError(requestError instanceof Error ? requestError.message : '无法加载卡密')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (token) void loadCodes(token)
    // Only validate the token once when the panel is opened.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const login = async (event: React.FormEvent) => {
    event.preventDefault()
    const value = tokenDraft.trim()
    if (!value) {
      setError('请输入管理密钥')
      return
    }
    sessionStorage.setItem(TOKEN_KEY, value)
    setToken(value)
    await loadCodes(value)
  }

  const logout = () => {
    sessionStorage.removeItem(TOKEN_KEY)
    setToken('')
    setTokenDraft('')
    setAuthenticated(false)
    setCodes([])
    setGenerated([])
  }

  const createCodes = async (event: React.FormEvent) => {
    event.preventDefault()
    setLoading(true)
    setError('')
    try {
      const payload = await adminRequest<{
        ok: true
        items: CodeRecord[]
        warning: string
      }>(token, '/api/admin/codes', {
        method: 'POST',
        body: JSON.stringify({
          ...form,
          expiresAt: form.expiresAt || null,
        }),
      })
      setGenerated(payload.items)
      await loadCodes()
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : '生成卡密失败')
      setLoading(false)
    }
  }

  const toggleStatus = async (record: CodeRecord) => {
    setLoading(true)
    setError('')
    try {
      await adminRequest(token, `/api/admin/codes/${record.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ status: record.status === 'active' ? 'disabled' : 'active' }),
      })
      await loadCodes()
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : '更新失败')
      setLoading(false)
    }
  }

  const generatedText = generated
    .map((item) => `${item.code}\t${item.order_ref || ''}`)
    .join('\n')

  const copyCodes = async () => {
    await navigator.clipboard.writeText(generatedText)
    setCopied(true)
    window.setTimeout(() => setCopied(false), 1600)
  }

  const downloadCsv = () => {
    const rows = [
      ['卡密', '订单标记', '有效天数', '完成次数', '兑换设备数'],
      ...generated.map((item) => [
        item.code || '',
        item.order_ref || '',
        String(item.valid_days),
        String(item.max_completions),
        String(item.max_redemptions),
      ]),
    ]
    const csv = rows
      .map((row) => row.map((cell) => `"${cell.replace(/"/g, '""')}"`).join(','))
      .join('\n')
    const blob = new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = `拾光人物志卡密-${new Date().toISOString().slice(0, 10)}.csv`
    link.click()
    URL.revokeObjectURL(link.href)
  }

  if (!authenticated) {
    return (
      <main className="admin-login">
        <div className="admin-login-card">
          <KeyRound size={30} />
          <p>SHIGUANG CONTROL DESK</p>
          <h1>卡密管理台</h1>
          <span>管理密钥只保存在当前浏览器标签页，不会写入本地长期存储。</span>
          <form onSubmit={login}>
            <input
              type="password"
              value={tokenDraft}
              onChange={(event) => {
                setTokenDraft(event.target.value)
                setError('')
              }}
              placeholder="输入 ADMIN_API_TOKEN"
              autoComplete="current-password"
            />
            <button disabled={loading}>
              {loading ? <LoaderCircle className="spin" size={18} /> : <KeyRound size={18} />}
              进入管理台
            </button>
          </form>
          {error && <div className="admin-error">{error}</div>}
          <a href="/">返回测试首页</a>
        </div>
      </main>
    )
  }

  return (
    <main className="admin-page">
      <header className="admin-header">
        <div>
          <p>SHIGUANG CONTROL DESK</p>
          <h1>卡密管理台</h1>
        </div>
        <div>
          <button onClick={() => void loadCodes()} disabled={loading}>
            <RefreshCw className={loading ? 'spin' : ''} size={16} /> 刷新
          </button>
          <button onClick={logout}>
            <LogOut size={16} /> 退出
          </button>
        </div>
      </header>

      {error && <div className="admin-error">{error}</div>}

      <section className="admin-stats">
        <article>
          <span>库存总数</span>
          <strong>{codes.length}</strong>
        </article>
        <article>
          <span>可用卡密</span>
          <strong>{codes.filter((item) => item.status === 'active').length}</strong>
        </article>
        <article>
          <span>已绑定</span>
          <strong>{codes.filter((item) => item.redemption_count > 0).length}</strong>
        </article>
      </section>

      <section className="admin-grid">
        <form className="code-generator" onSubmit={createCodes}>
          <div className="admin-section-title">
            <Plus size={20} />
            <div>
              <h2>生成一批新卡密</h2>
              <p>规则只影响本批卡密，之后可以随时换一套参数。</p>
            </div>
          </div>
          <div className="generator-fields">
            <label>
              生成数量
              <input
                type="number"
                min="1"
                max="200"
                value={form.count}
                onChange={(event) => setForm({ ...form, count: Number(event.target.value) })}
              />
            </label>
            <label>
              绑定后有效天数
              <input
                type="number"
                min="1"
                max="365"
                value={form.validDays}
                onChange={(event) =>
                  setForm({ ...form, validDays: Number(event.target.value) })
                }
              />
            </label>
            <label>
              最多完成测试
              <input
                type="number"
                min="1"
                max="100"
                value={form.maxCompletions}
                onChange={(event) =>
                  setForm({ ...form, maxCompletions: Number(event.target.value) })
                }
              />
            </label>
            <label>
              最多绑定设备
              <input
                type="number"
                min="1"
                max="10"
                value={form.maxRedemptions}
                onChange={(event) =>
                  setForm({ ...form, maxRedemptions: Number(event.target.value) })
                }
              />
            </label>
            <label>
              订单批次标记
              <input
                value={form.orderRef}
                onChange={(event) => setForm({ ...form, orderRef: event.target.value })}
                placeholder="例如：XHS-202608"
              />
            </label>
            <label>
              统一截止时间（可选）
              <input
                type="datetime-local"
                value={form.expiresAt}
                onChange={(event) => setForm({ ...form, expiresAt: event.target.value })}
              />
            </label>
          </div>
          <button className="admin-primary" disabled={loading}>
            {loading ? <LoaderCircle className="spin" size={18} /> : <Plus size={18} />}
            生成卡密
          </button>
        </form>

        <aside className="admin-safety">
          <ShieldAlert size={24} />
          <h2>发货前检查</h2>
          <ul>
            <li>一张订单只发送一条完整卡密</li>
            <li>完整卡密仅在生成后显示一次</li>
            <li>下载 CSV 后放入安全位置保存</li>
            <li>退款或异常订单应立即停用卡密</li>
          </ul>
        </aside>
      </section>

      {generated.length > 0 && (
        <section className="generated-codes">
          <div>
            <h2>本次生成的完整卡密</h2>
            <p>离开页面后无法再次查看完整内容，请立即复制或下载。</p>
          </div>
          <div className="generated-actions">
            <button onClick={() => void copyCodes()}>
              {copied ? <Check size={16} /> : <Clipboard size={16} />}
              {copied ? '已复制' : '复制全部'}
            </button>
            <button onClick={downloadCsv}>
              <Download size={16} /> 下载 CSV
            </button>
          </div>
          <pre>{generatedText}</pre>
        </section>
      )}

      <section className="code-inventory">
        <div className="admin-section-title">
          <KeyRound size={20} />
          <div>
            <h2>最近卡密</h2>
            <p>这里只显示末四位，完整卡密不会从数据库取回。</p>
          </div>
        </div>
        <div className="inventory-table-wrap">
          <table>
            <thead>
              <tr>
                <th>卡密</th>
                <th>订单标记</th>
                <th>状态</th>
                <th>绑定</th>
                <th>规则</th>
                <th>创建时间</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {codes.map((record) => (
                <tr key={record.id}>
                  <td className="code-cell">{record.code_hint}</td>
                  <td>{record.order_ref || '—'}</td>
                  <td>
                    <span className={`status-pill ${record.status}`}>
                      {record.status === 'active' ? '可用' : '已停用'}
                    </span>
                  </td>
                  <td>
                    {record.redemption_count}/{record.max_redemptions}
                  </td>
                  <td>
                    {record.valid_days} 天 · {record.max_completions} 次
                  </td>
                  <td>{new Date(record.created_at).toLocaleDateString('zh-CN')}</td>
                  <td>
                    <button className="status-action" onClick={() => void toggleStatus(record)}>
                      {record.status === 'active' ? '停用' : '启用'}
                    </button>
                  </td>
                </tr>
              ))}
              {!codes.length && (
                <tr>
                  <td colSpan={7} className="empty-table">
                    暂无卡密
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  )
}
