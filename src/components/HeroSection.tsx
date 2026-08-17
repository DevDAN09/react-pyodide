export type RunnerState = 'initializing' | 'ready' | 'running' | 'recovering' | 'init-error'

interface StepCard {
  step: string
  icon: string
  analogy: string
  title: string
  desc: string
}

const STEPS: StepCard[] = [
  {
    step: '01',
    icon: '📝',
    analogy: '주문서 접수',
    title: 'React UI (Main Thread)',
    desc: '작성한 코드를 받아 화면이 멈추지 않도록 백그라운드로 안전하게 보냅니다.',
  },
  {
    step: '02',
    icon: '🛡️',
    analogy: '격리된 조리실',
    title: 'Web Worker (격리 스레드)',
    desc: '무한 루프나 오류가 나도 브라우저가 뻗지 않도록 10초 타임아웃을 감시합니다.',
  },
  {
    step: '03',
    icon: '⚡',
    analogy: '초소형 엔진',
    title: 'Pyodide CPython (WebAssembly)',
    desc: '서버 없이 사용자 PC 브라우저 메모리 안에서 파이썬을 빛의 속도로 직접 실행합니다.',
  },
  {
    step: '04',
    icon: '📊',
    analogy: '결과물 배달',
    title: 'I/O Bridge & State Capture',
    desc: '파이썬의 print() 출력과 연산 결과를 깔끔하게 캡처해 화면에 보여줍니다.',
  },
]

export function HeroSection({ runnerState = 'ready' }: { runnerState?: RunnerState }) {
  const getStatusBadge = () => {
    switch (runnerState) {
      case 'initializing':
        return { text: '엔진 시동 중...', className: 'status-init' }
      case 'running':
        return { text: '코드 실행 중...', className: 'status-running' }
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

  return (
    <section className="hero-section" aria-labelledby="hero-title">
      <div className="hero-header-row">
        <div className="hero-badge">💡 브라우저 속 초소형 파이썬 컴퓨터</div>
        <div className={`runtime-status-pill ${status.className}`}>
          <span className="status-indicator-dot"></span>
          <span>{status.text}</span>
        </div>
      </div>

      <h1 id="hero-title">React & Pyodide WASM Runner</h1>
      <p className="hero-description">
        서버로 코드를 보내지 않습니다. 내 컴퓨터 브라우저 안에서 <strong>WebAssembly(WASM)</strong> 엔진이 직접 파이썬을 실행합니다.
      </p>

      {/* 4단계 직관적인 프로세스 카드 */}
      <div className="architecture-grid" role="list">
        {STEPS.map((step, index) => {
          const isProcessing =
            runnerState === 'running' && (index === 1 || index === 2 || index === 3)
          return (
            <div
              key={step.step}
              role="listitem"
              className={`arch-card ${isProcessing ? 'card-processing' : ''}`}
            >
              <div className="arch-card-header">
                <span className="arch-step-badge">{step.step}</span>
                <span className="arch-analogy-pill">{step.icon} {step.analogy}</span>
              </div>
              <h3 className="arch-card-title">{step.title}</h3>
              <p className="arch-card-desc">{step.desc}</p>
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
