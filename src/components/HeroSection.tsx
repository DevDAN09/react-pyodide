import { useEffect, useState } from 'react'

export type RunnerState = 'initializing' | 'ready' | 'running' | 'recovering' | 'init-error'

interface StepCard {
  step: string
  icon: string
  analogy: string
  title: string
  desc: string
  animationHighlight: string
  dataLabel: string
  scenarioNote: string
}

const STEPS: StepCard[] = [
  {
    step: '01',
    icon: '📝',
    analogy: '주문서 접수',
    title: 'React UI (Main Thread)',
    desc: '작성한 코드를 받아 화면이 멈추지(Freeze) 않도록 백그라운드로 즉시 전달합니다.',
    animationHighlight: 'UI 멈춤 차단 (60fps 유지)',
    dataLabel: 'payload: "print(\'hello\')\\n1 + 2"',
    scenarioNote: '코드를 작은 데이터 패킷으로 포장해 비동기로 발송',
  },
  {
    step: '02',
    icon: '🛡️',
    analogy: '격리된 조리실',
    title: 'Web Worker (격리 스레드)',
    desc: '무한 루프나 오류가 발생해도 브라우저가 뻗지 않도록 10초 타임아웃을 안전하게 감시합니다.',
    animationHighlight: '보호막 돔 가동 (10s Watchdog)',
    dataLabel: 'postMessage(RUN, id) & Watchdog 10s',
    scenarioNote: '오류가 나도 메인 화면을 완벽히 보호하는 독립 공간',
  },
  {
    step: '03',
    icon: '⚡',
    analogy: '초소형 엔진',
    title: 'Pyodide CPython (WebAssembly)',
    desc: '서버 없이 사용자 PC 브라우저 메모리(WASM Heap) 안에서 파이썬을 빛의 속도로 직접 실행합니다.',
    animationHighlight: 'WASM JIT 고속 연산 중...',
    dataLabel: 'WASM 32-bit Memory & Native Exec',
    scenarioNote: 'CPython 바이너리가 내 브라우저에서 직접 계산',
  },
  {
    step: '04',
    icon: '📊',
    analogy: '결과물 배달',
    title: 'I/O Bridge & State Capture',
    desc: '파이썬의 print() 출력과 연산 결과값을 분리·캡처해 화면의 결과창으로 배달합니다.',
    animationHighlight: '결과 패킷 화면 전달 완료!',
    dataLabel: '{ stdout: "hello", result: "3", durationMs: 0.8ms }',
    scenarioNote: '콘솔 출력과 반환값을 깔끔하게 정리해 화면에 렌더링',
  },
]

export function HeroSection({ runnerState = 'ready' }: { runnerState?: RunnerState }) {
  const [activeStep, setActiveStep] = useState<number>(0)
  const [isPlaying, setIsPlaying] = useState<boolean>(false)

  // Real runner state triggers flow animation
  useEffect(() => {
    if (runnerState === 'running') {
      setIsPlaying(true)
      setActiveStep(1)
      const t1 = setTimeout(() => setActiveStep(2), 600)
      const t2 = setTimeout(() => setActiveStep(3), 1200)
      return () => {
        clearTimeout(t1)
        clearTimeout(t2)
      }
    } else if (runnerState === 'ready') {
      setActiveStep(0)
    }
  }, [runnerState])

  // Interactive user simulation loop
  useEffect(() => {
    if (!isPlaying || runnerState === 'running') return
    const interval = setInterval(() => {
      setActiveStep((prev) => {
        if (prev >= 3) {
          setIsPlaying(false)
          return 0
        }
        return prev + 1
      })
    }, 1400)
    return () => clearInterval(interval)
  }, [isPlaying, runnerState])

  const handleToggleSimulation = () => {
    if (isPlaying) {
      setIsPlaying(false)
    } else {
      setActiveStep(0)
      setIsPlaying(true)
    }
  }

  const getStatusBadge = () => {
    switch (runnerState) {
      case 'initializing':
        return { text: '엔진 시동 중...', className: 'status-init' }
      case 'running':
        return { text: '실시간 WASM 연산 중...', className: 'status-running' }
      case 'recovering':
        return { text: '타임아웃 자동 복구 중...', className: 'status-recover' }
      case 'init-error':
        return { text: '초기화 오류', className: 'status-error' }
      case 'ready':
      default:
        return { text: '실행 준비 완료 (Ready)', className: 'status-ready' }
    }
  }

  const status = getStatusBadge()
  const currentStepData = STEPS[activeStep]

  return (
    <section className="hero-section" aria-labelledby="hero-title">
      {/* Top Banner Toolbar */}
      <div className="hero-header-row">
        <div className="hero-badge">💡 브라우저 속 초소형 파이썬 컴퓨터</div>
        <div className="hero-controls">
          <button
            type="button"
            className={`sim-button ${isPlaying ? 'playing' : ''}`}
            onClick={handleToggleSimulation}
            disabled={runnerState === 'running'}
            aria-label="데이터 흐름 시뮬레이션 토글"
          >
            {isPlaying ? '⏸️ 일시 정지' : '▶️ 시나리오 애니메이션 재생'}
          </button>
          <div className={`runtime-status-pill ${status.className}`}>
            <span className="status-indicator-dot"></span>
            <span>{status.text}</span>
          </div>
        </div>
      </div>

      <h1 id="hero-title">React & Pyodide WASM Runner</h1>
      <p className="hero-description">
        서버로 코드를 보내지 않습니다. 내 컴퓨터 브라우저 안에서 <strong>WebAssembly(WASM)</strong> 엔진이 직접 파이썬을 실행합니다.
      </p>

      {/* Artifact Animation Stage */}
      <div className="animation-stage-box">
        <div className="stage-header">
          <div className="packet-indicator-wrapper">
            <span className="live-pulse-badge">LIVE FLOW</span>
            <span className="current-stage-title">
              STEP {currentStepData.step}: {currentStepData.analogy} ({currentStepData.title})
            </span>
          </div>
          <span className="stage-highlight-tag">{currentStepData.animationHighlight}</span>
        </div>

        {/* Pipeline Progress Track with Traveling Beam */}
        <div className="pipeline-visual-track" aria-label="WASM 실행 파이프라인 단계">
          <div className="track-bar-background">
            <div
              className="track-bar-progress"
              style={{ width: `${(activeStep / (STEPS.length - 1)) * 100}%` }}
            />
          </div>
          <div className="track-dots">
            {STEPS.map((s, idx) => (
              <div
                key={s.step}
                className={`track-dot ${idx <= activeStep ? 'active' : ''} ${
                  idx === activeStep ? 'current' : ''
                }`}
                onClick={() => {
                  setIsPlaying(false)
                  setActiveStep(idx)
                }}
                title={`${s.analogy} (${s.title})`}
              >
                <span className="dot-number">{s.step}</span>
                <span className="dot-label">{s.analogy}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Live Scenario Story Box */}
        <div className="scenario-story-banner">
          <span className="story-icon">{currentStepData.icon}</span>
          <div className="story-content">
            <strong>{currentStepData.scenarioNote}</strong>
            <code>{currentStepData.dataLabel}</code>
          </div>
        </div>
      </div>

      {/* 4단계 직관적인 프로세스 카드 */}
      <div className="architecture-grid" role="list">
        {STEPS.map((step, index) => {
          const isActive = index === activeStep
          const isPast = index < activeStep
          return (
            <div
              key={step.step}
              role="listitem"
              tabIndex={0}
              className={`arch-card ${isActive ? 'card-active' : ''} ${
                isPast ? 'card-past' : ''
              }`}
              onClick={() => {
                setIsPlaying(false)
                setActiveStep(index)
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault()
                  setIsPlaying(false)
                  setActiveStep(index)
                }
              }}
            >
              <div className="arch-card-header">
                <span className="arch-step-badge">{step.step}</span>
                <span className="arch-analogy-pill">
                  {step.icon} {step.analogy}
                </span>
              </div>
              <h3 className="arch-card-title">{step.title}</h3>
              <p className="arch-card-desc">{step.desc}</p>
              <div className="arch-packet-badge">
                <span className="packet-indicator"></span>
                <code>{step.dataLabel}</code>
              </div>
            </div>
          )
        })}
      </div>

      {/* 3가지 핵심 요약 뱃지 */}
      <div className="hero-features">
        <div className="feature-item">
          <span className="feature-icon">🚀</span>
          <span><strong>서버 비용 0원</strong> (내 PC 100% 로컬 연산)</span>
        </div>
        <div className="feature-item">
          <span className="feature-icon">🔒</span>
          <span><strong>안전한 격리</strong> (브라우저 샌드박스 보안)</span>
        </div>
        <div className="feature-item">
          <span className="feature-icon">⏱️</span>
          <span><strong>멈춤 방지</strong> (10초 초과 시 자동 복구)</span>
        </div>
      </div>
    </section>
  )
}
