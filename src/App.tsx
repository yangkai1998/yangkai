import { useEffect, useMemo, useRef, useState } from 'react'
import html2canvas from 'html2canvas'
import {
  ArrowRight,
  ChevronLeft,
  Clock3,
  Download,
  LockKeyhole,
  RotateCcw,
  ScrollText,
  Share2,
  ShieldCheck,
  Sparkles,
} from 'lucide-react'
import { questions, traitLabels } from './data'
import { calculateResult } from './engine'
import { TRAIT_KEYS, type QuizResult, type ResponseStyle, type TraitScores } from './types'

type Stage = 'gate' | 'intro' | 'quiz' | 'result'

const STORAGE = {
  access: 'shiguang-access-v1',
  progress: 'shiguang-progress-v1',
  result: 'shiguang-result-v1',
}

const DEMO_CODE = (import.meta.env.VITE_DEMO_ACCESS_CODE || 'SHIGUANG').toUpperCase()

function BrandMark() {
  return (
    <div className="brand-mark" aria-label="拾光人物志">
      <span>拾</span>
      <i />
      <span>光</span>
    </div>
  )
}

function Grain() {
  return <div className="grain" aria-hidden="true" />
}

function AccessGate({ onUnlock }: { onUnlock: () => void }) {
  const [code, setCode] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const submit = (event: React.FormEvent) => {
    event.preventDefault()
    const normalized = code.trim().toUpperCase()
    if (!normalized) {
      setError('请先输入体验码')
      return
    }
    if (normalized !== DEMO_CODE) {
      setError('体验码不正确，请检查后重试')
      return
    }
    setLoading(true)
    setError('')
    window.setTimeout(() => {
      localStorage.setItem(STORAGE.access, 'granted')
      onUnlock()
    }, 520)
  }

  return (
    <main className="gate-page">
      <Grain />
      <div className="gate-orbit orbit-one" />
      <div className="gate-orbit orbit-two" />
      <section className="gate-shell">
        <header className="gate-brand">
          <BrandMark />
          <div>
            <p className="eyebrow">ARCHIVE OF KINDRED SOULS</p>
            <p className="brand-name">拾光人物志</p>
          </div>
        </header>

        <div className="gate-copy">
          <div className="edition-pill">
            <Sparkles size={13} />
            <span>人格档案 · 壹号卷</span>
          </div>
          <h1>
            在历史长河里，
            <br />
            谁与你<span>同频</span>？
          </h1>
          <p className="gate-lead">
            24 道原创情境题，从格局、行动、秩序、共情、洞察与韧性六个维度，寻找与你精神底色最接近的历史人物。
          </p>
        </div>

        <form className="access-card" onSubmit={submit}>
          <div className="access-card-head">
            <div className="access-icon">
              <LockKeyhole size={21} />
            </div>
            <div>
              <strong>开启你的时空档案</strong>
              <span>请输入购买后获得的体验码</span>
            </div>
          </div>
          <label htmlFor="access-code">体验码</label>
          <div className="code-row">
            <input
              id="access-code"
              value={code}
              onChange={(event) => {
                setCode(event.target.value)
                setError('')
              }}
              placeholder="例如：SHIGUANG"
              autoComplete="off"
              spellCheck={false}
            />
            <button type="submit" disabled={loading}>
              {loading ? '正在启封' : '启封'}
              {!loading && <ArrowRight size={18} />}
            </button>
          </div>
          {error && <p className="form-error">{error}</p>}
          <p className="demo-hint">原型体验码：SHIGUANG</p>
          <div className="access-notes">
            <span>
              <ShieldCheck size={14} /> 结果仅保存在本机
            </span>
            <span>
              <Clock3 size={14} /> 约 5 分钟完成
            </span>
          </div>
        </form>

        <p className="gate-foot">原创测试 · 结果仅供自我探索与娱乐</p>
      </section>
    </main>
  )
}

function Intro({ onStart, onResume }: { onStart: () => void; onResume: (() => void) | null }) {
  return (
    <main className="intro-page">
      <Grain />
      <nav className="topbar">
        <BrandMark />
        <span>拾光人物志 · 壹号卷</span>
        <div className="topbar-rule" />
      </nav>
      <section className="intro-hero">
        <div className="sun-disc" aria-hidden="true">
          <span>古</span>
        </div>
        <p className="chapter-label">CHAPTER 01 · 时空寻迹</p>
        <h1>
          你与哪位历史人物，
          <br />
          共享同一种<span>精神底色</span>？
        </h1>
        <p className="intro-subtitle">
          这里没有标准答案。请凭第一直觉选择，
          <br className="desktop-only" />
          让你在真实处境里的反应，带你遇见另一个时代的自己。
        </p>
        <div className="intro-metrics">
          <div>
            <strong>24</strong>
            <span>道情境选择</span>
          </div>
          <i />
          <div>
            <strong>6</strong>
            <span>重人格维度</span>
          </div>
          <i />
          <div>
            <strong>10</strong>
            <span>位人物原型</span>
          </div>
        </div>
        <div className="intro-actions">
          <button className="primary-cta" onClick={onStart}>
            <span>开始寻迹</span>
            <ArrowRight size={19} />
          </button>
          {onResume && (
            <button className="text-cta" onClick={onResume}>
              继续上次进度
            </button>
          )}
        </div>
        <p className="quiet-note">
          <ScrollText size={14} />
          不采集姓名与联系方式，答案只存于当前设备
        </p>
      </section>
      <div className="mountains" aria-hidden="true">
        <div />
        <div />
        <div />
      </div>
    </main>
  )
}

function Progress({ current }: { current: number }) {
  const progress = ((current + 1) / questions.length) * 100
  return (
    <div className="progress-wrap" aria-label={`第 ${current + 1} 题，共 ${questions.length} 题`}>
      <div className="progress-meta">
        <span>寻迹进度</span>
        <b>
          {String(current + 1).padStart(2, '0')}
          <em> / {questions.length}</em>
        </b>
      </div>
      <div className="progress-track">
        <span style={{ width: `${progress}%` }} />
      </div>
    </div>
  )
}

function Quiz({
  initialAnswers,
  onFinish,
}: {
  initialAnswers: ResponseStyle[]
  onFinish: (answers: ResponseStyle[]) => void
}) {
  const [answers, setAnswers] = useState<ResponseStyle[]>(initialAnswers)
  const [index, setIndex] = useState(Math.min(initialAnswers.length, questions.length - 1))
  const [selected, setSelected] = useState<number | null>(null)
  const [leaving, setLeaving] = useState(false)
  const question = questions[index]

  useEffect(() => {
    localStorage.setItem(STORAGE.progress, JSON.stringify(answers))
  }, [answers])

  const choose = (style: ResponseStyle, optionIndex: number) => {
    if (leaving) return
    const nextAnswers = [...answers.slice(0, index), style]
    setAnswers(nextAnswers)
    setSelected(optionIndex)
    setLeaving(true)

    window.setTimeout(() => {
      if (index === questions.length - 1) {
        localStorage.removeItem(STORAGE.progress)
        onFinish(nextAnswers)
        return
      }
      setIndex((value) => value + 1)
      setSelected(null)
      setLeaving(false)
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }, 360)
  }

  const goBack = () => {
    if (index === 0 || leaving) return
    setIndex((value) => value - 1)
    setAnswers((value) => value.slice(0, -1))
    setSelected(null)
  }

  return (
    <main className="quiz-page">
      <Grain />
      <nav className="quiz-nav">
        <button onClick={goBack} disabled={index === 0} aria-label="返回上一题">
          <ChevronLeft size={20} />
        </button>
        <BrandMark />
        <span>直觉作答</span>
      </nav>
      <section className={`quiz-shell ${leaving ? 'is-leaving' : ''}`}>
        <Progress current={index} />
        <div className="question-card">
          <div className="scene-row">
            <span>情境 · {question.scene}</span>
            <i />
            <small>SCENE {String(question.id).padStart(2, '0')}</small>
          </div>
          <h1>{question.text}</h1>
          <div className="answers-grid">
            {question.options.map((option, optionIndex) => (
              <button
                key={option.key}
                className={selected === optionIndex ? 'selected' : ''}
                onClick={() => choose(option.style, optionIndex)}
                disabled={leaving}
              >
                <span className="option-key">{option.key}</span>
                <span className="option-text">{option.text}</span>
                <ArrowRight className="option-arrow" size={18} />
              </button>
            ))}
          </div>
        </div>
        <p className="quiz-tip">
          <Sparkles size={14} />
          不必反复权衡，第一反应往往更接近你
        </p>
      </section>
      <div className="quiz-seal" aria-hidden="true">
        寻
      </div>
    </main>
  )
}

function RadarChart({ scores }: { scores: TraitScores }) {
  const center = 120
  const radius = 82
  const angleFor = (index: number) => -Math.PI / 2 + (index * Math.PI * 2) / TRAIT_KEYS.length
  const point = (index: number, ratio: number) => {
    const angle = angleFor(index)
    return `${center + Math.cos(angle) * radius * ratio},${center + Math.sin(angle) * radius * ratio}`
  }
  const rings = [0.25, 0.5, 0.75, 1]
  const scorePoints = TRAIT_KEYS.map((trait, index) => point(index, scores[trait] / 100)).join(' ')

  return (
    <svg className="radar" viewBox="0 0 240 240" role="img" aria-label="六维人格雷达图">
      {rings.map((ring) => (
        <polygon
          key={ring}
          points={TRAIT_KEYS.map((_, index) => point(index, ring)).join(' ')}
          className="radar-ring"
        />
      ))}
      {TRAIT_KEYS.map((_, index) => (
        <line
          key={index}
          x1={center}
          y1={center}
          x2={point(index, 1).split(',')[0]}
          y2={point(index, 1).split(',')[1]}
          className="radar-axis"
        />
      ))}
      <polygon points={scorePoints} className="radar-score" />
      {TRAIT_KEYS.map((trait, index) => {
        const [x, y] = point(index, 1.24).split(',').map(Number)
        return (
          <text key={trait} x={x} y={y} textAnchor="middle" dominantBaseline="middle">
            {traitLabels[trait]}
          </text>
        )
      })}
    </svg>
  )
}

function ResultPage({ result, onRestart }: { result: QuizResult; onRestart: () => void }) {
  const [saving, setSaving] = useState(false)
  const [shareLabel, setShareLabel] = useState('分享结果')
  const cardRef = useRef<HTMLDivElement>(null)
  const { persona, secondary, scores, match } = result

  const strongestTraits = useMemo(
    () => [...TRAIT_KEYS].sort((a, b) => scores[b] - scores[a]).slice(0, 3),
    [scores],
  )

  const saveCard = async () => {
    if (!cardRef.current || saving) return
    setSaving(true)
    try {
      const canvas = await html2canvas(cardRef.current, {
        backgroundColor: '#f4efe3',
        scale: 2,
        useCORS: true,
      })
      const link = document.createElement('a')
      link.download = `拾光人物志-${persona.name}.png`
      link.href = canvas.toDataURL('image/png')
      link.click()
    } finally {
      setSaving(false)
    }
  }

  const share = async () => {
    const text = `我的历史同频者是${persona.name}，契合度 ${match}%。${persona.quote}`
    try {
      if (navigator.share) {
        await navigator.share({ title: '拾光人物志', text, url: window.location.href })
        return
      }
      await navigator.clipboard.writeText(`${text} ${window.location.href}`)
      setShareLabel('已复制分享文案')
      window.setTimeout(() => setShareLabel('分享结果'), 1800)
    } catch {
      // The native share sheet can be cancelled without requiring an error state.
    }
  }

  return (
    <main className="result-page">
      <Grain />
      <nav className="result-nav">
        <BrandMark />
        <span>你的时空档案 · 已启封</span>
      </nav>

      <section className="result-shell">
        <p className="result-kicker">YOUR KINDRED SOUL IN HISTORY</p>
        <h1>与你同频的历史人物是</h1>

        <div className="share-card" ref={cardRef}>
          <div className="card-corner corner-one" />
          <div className="card-corner corner-two" />
          <header className="share-card-head">
            <BrandMark />
            <span>拾光人物志 · 壹号卷</span>
            <b>No. {persona.id.slice(0, 3).toUpperCase()}</b>
          </header>
          <div className="portrait-wrap">
            <div className="portrait-halo" />
            <div className="portrait">
              <span>{persona.portrait}</span>
              <small>{persona.era}</small>
            </div>
            <div className="match-badge">
              <strong>{match}%</strong>
              <span>精神契合度</span>
            </div>
          </div>
          <div className="persona-heading">
            <p>{persona.era}代 · 历史人物原型</p>
            <h2>{persona.name}</h2>
            <span>{persona.title}</span>
          </div>
          <blockquote>“{persona.quote}”</blockquote>
          <div className="card-tags">
            {persona.tags.map((tag) => (
              <span key={tag}>#{tag}</span>
            ))}
          </div>
          <div className="card-signature">
            <span>你的精神印记</span>
            <strong>{strongestTraits.map((trait) => traitLabels[trait]).join(' · ')}</strong>
            <i>{persona.seal}</i>
          </div>
        </div>

        <div className="result-actions">
          <button className="save-button" onClick={saveCard} disabled={saving}>
            <Download size={18} />
            {saving ? '正在生成图片' : '保存结果卡'}
          </button>
          <button className="share-button" onClick={share}>
            <Share2 size={18} />
            {shareLabel}
          </button>
        </div>

        <section className="report-section">
          <div className="section-title">
            <span>01</span>
            <div>
              <p>PERSONA PORTRAIT</p>
              <h2>你的精神肖像</h2>
            </div>
          </div>
          <p className="report-lead">{persona.summary}</p>
          <div className="trait-panel">
            <RadarChart scores={scores} />
            <div className="trait-list">
              {TRAIT_KEYS.map((trait) => (
                <div key={trait}>
                  <span>{traitLabels[trait]}</span>
                  <div>
                    <i style={{ width: `${scores[trait]}%` }} />
                  </div>
                  <b>{scores[trait]}</b>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="insight-grid">
          <article className="insight-card gift">
            <span>你的天赋</span>
            <h3>这份底色如何照亮你</h3>
            <p>{persona.gift}</p>
          </article>
          <article className="insight-card shadow">
            <span>需要留意</span>
            <h3>光越亮，影子也越清晰</h3>
            <p>{persona.shadow}</p>
          </article>
        </section>

        <section className="action-scroll">
          <div className="scroll-number">02</div>
          <div>
            <p>ONE SMALL STEP</p>
            <h2>给此刻的你，一件小事</h2>
            <strong>{persona.action}</strong>
          </div>
          <span className="mini-seal">{persona.seal}</span>
        </section>

        <section className="secondary-result">
          <span>你的第二同频人物</span>
          <div>
            <i>{secondary.portrait}</i>
            <p>
              <strong>{secondary.name}</strong>
              <small>{secondary.title}</small>
            </p>
          </div>
        </section>

        <button className="restart-button" onClick={onRestart}>
          <RotateCcw size={16} />
          换一种选择，重新寻迹
        </button>
        <p className="result-disclaimer">人格会随经历生长，本结果不是心理诊断，也不定义你。</p>
      </section>
    </main>
  )
}

function readStoredAnswers(): ResponseStyle[] {
  try {
    const value = JSON.parse(localStorage.getItem(STORAGE.progress) || '[]')
    return Array.isArray(value) ? value.slice(0, questions.length - 1) : []
  } catch {
    return []
  }
}

export default function App() {
  const hasAccess = localStorage.getItem(STORAGE.access) === 'granted'
  const [stage, setStage] = useState<Stage>(hasAccess ? 'intro' : 'gate')
  const [savedAnswers, setSavedAnswers] = useState<ResponseStyle[]>(readStoredAnswers)
  const [result, setResult] = useState<QuizResult | null>(() => {
    try {
      const answers = JSON.parse(localStorage.getItem(STORAGE.result) || '[]')
      return Array.isArray(answers) && answers.length === questions.length
        ? calculateResult(answers)
        : null
    } catch {
      return null
    }
  })

  const startFresh = () => {
    localStorage.removeItem(STORAGE.progress)
    localStorage.removeItem(STORAGE.result)
    setSavedAnswers([])
    setResult(null)
    setStage('quiz')
    window.scrollTo(0, 0)
  }

  const finish = (answers: ResponseStyle[]) => {
    const nextResult = calculateResult(answers)
    localStorage.setItem(STORAGE.result, JSON.stringify(answers))
    setResult(nextResult)
    setStage('result')
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  if (stage === 'gate') {
    return <AccessGate onUnlock={() => setStage('intro')} />
  }
  if (stage === 'intro') {
    if (result) {
      return <ResultPage result={result} onRestart={startFresh} />
    }
    return (
      <Intro
        onStart={startFresh}
        onResume={savedAnswers.length ? () => setStage('quiz') : null}
      />
    )
  }
  if (stage === 'quiz') {
    return <Quiz initialAnswers={savedAnswers} onFinish={finish} />
  }
  return result ? <ResultPage result={result} onRestart={startFresh} /> : null
}
