import { useState } from 'react'

export type RunnerState = 'initializing' | 'ready' | 'running' | 'recovering' | 'init-error'

interface StepDetail {
  step: string
  title: string
  subtitle: string
  summary: string
  details: string[]
  techNote: string
}

const STEPS: StepDetail[] = [
  {
    step: '01',
    title: 'React UI (Main Thread)',
    subtitle: '사용자 인터랙션 및 상태 관리',
    summary: '사용자 입력 코드를 수신하고 UI 렌더링을 멈춤(Freeze) 없이 유지하기 위해 비동기 메시지를 발행합니다.',
    details: [
      'UI 렌더링 스레드와 무거운 Python 연산 로직을 완벽하게 분리',
      'CodeEditor 상태 및 실행 진행 상태(RunnerState)를 실시간 반영',
      'PyodideWorkerClient를 통해 Worker로 메시지(postMessage)를 안전하게 전달',
    ],
    techNote: 'Main Thread: Zero-blocking 60fps 유지',
  },
  {
    step: '02',
    title: 'Web Worker (격리 스레드)',
    subtitle: '스레드 격리 및 타임아웃 감시',
    summary: '메인 스레드와 분리된 독립 백그라운드 스레드에서 타임아웃(10초) 감시 및 실행 수명주기를 제어합니다.',
    details: [
      '별도의 전용 백그라운드 Web Worker 프로세스에서 런타임 호스팅',
      '무한 루프(while True) 등 비정상 동작 시 10초 타임아웃 후 Worker 강제 종료',
      '자동 복구 메커니즘을 통해 브라우저 재새로고침 없이 신규 Worker 즉시 투입',
    ],
    techNote: 'Worker Thread: 10s Timeout Safe Guard & Auto-Recovery',
  },
  {
    step: '03',
    title: 'Pyodide CPython (WebAssembly)',
    subtitle: 'CPython 3.12+ 가상머신 엔진',
    summary: 'Emscripten으로 컴파일된 CPython 인터프리터 WASM 바이너리가 브라우저 메모리 상에서 직접 코드를 해석·실행합니다.',
    details: [
      'pyodide.asm.wasm 바이너리를 브라우저 V8/WASM JIT 컴파일러로 고속 로드',
      '표준 파이썬 내장 라이브러리(python_stdlib.zip)를 가상 파일시스템에 마운트',
      'PyProxy 객체 메모리 자동 해제(destroy())로 브라우저 WASM 힙 메모리 누수 방지',
    ],
    techNote: 'WASM Runtime: Native CPython binary in Browser Memory',
  },
  {
    step: '04',
    title: 'I/O Bridge & State Capture',
    subtitle: '표준 입출력 및 결과 정규화',
    summary: '가상 파일시스템(MEMFS)과 stdout, stderr, 반환값, 예외 스택을 캡처하여 구조화된 결과로 변환합니다.',
    details: [
      'pyodide.setStdout / setStderr 훅으로 파이썬 print() 출력을 실시간 버퍼링',
      '표준 예외 발생 시 전체 Traceback 콜스택을 안전한 텍스트로 직렬화',
      '{ stdout, stderr, result, error, durationMs } 형태의 구조화된 JSON 데이터 반환',
    ],
    techNote: 'I/O Layer: Batched Stream Interception & Payload Formatting',
  },
]

export function HeroSection({ runnerState = 'ready' }: { runnerState?: RunnerState }) {
  const [activeStep, setActiveStep] = useState<number | null>(null)

  const getStatusBadge = () => {
    switch (runnerState) {
      case 'initializing':
        return { text: 'WASM 런타임 로딩 중...', className: 'status-init' }
      case 'running':
        return { text: 'Python 코드 실행 중 (WASM 연산 중)', className: 'status-running' }
      case 'recovering':
        return { text: '타임아웃 복구 진행 중...', className: 'status-recover' }
      case 'init-error':
        return { text: '런타임 초기화 오류', className: 'status-error' }
      case 'ready':
      default:
        return { text: 'WASM 엔진 대기 완료 (Ready)', className: 'status-ready' }
    }
  }

  const status = getStatusBadge()

  return (
    <section className="hero-section" aria-labelledby="hero-title">
      <div className="hero-header-row">
        <div className="hero-badge">WebAssembly Architecture</div>
        <div className={`runtime-status-pill ${status.className}`}>
          <span className="status-indicator-dot"></span>
          <span>{status.text}</span>
        </div>
      </div>

      <h1 id="hero-title">React & Pyodide WASM Runner</h1>
      <p className="hero-description">
        서버 없이 브라우저 내부에서 <strong>WebAssembly(WASM)</strong> 기반 CPython 가상 머신을 구동하여
        Python 코드를 안전하고 빠르게 실행합니다. 카드를 클릭하면 각 계층의 세부 동작 메커니즘을 확인할 수 있습니다.
      </p>

      <div className="architecture-grid" role="list">
        {STEPS.map((step, index) => {
          const isSelected = activeStep === index
          const isProcessing =
            runnerState === 'running' && (index === 1 || index === 2 || index === 3)
          const isInitializing = runnerState === 'initializing' && (index === 1 || index === 2)

          return (
            <div
              key={step.step}
              role="listitem"
              tabIndex={0}
              className={`arch-card ${isSelected ? 'selected' : ''} ${
                isProcessing ? 'card-processing' : ''
              } ${isInitializing ? 'card-init' : ''}`}
              onClick={() => setActiveStep(isSelected ? null : index)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault()
                  setActiveStep(isSelected ? null : index)
                }
              }}
              aria-expanded={isSelected}
              aria-label={`${step.title} 세부정보 ${isSelected ? '접기' : '펼치기'}`}
            >
              <div className="arch-card-top">
                <span className="arch-step">{step.step}</span>
                <span className="arch-tech-tag">{step.techNote}</span>
              </div>
              <h3>{step.title}</h3>
              <p className="arch-subtitle">{step.subtitle}</p>
              <p className="arch-summary">{step.summary}</p>

              {isSelected && (
                <div className="arch-details-expanded">
                  <div className="arch-details-divider" />
                  <h4>핵심 동작 메커니즘</h4>
                  <ul>
                    {step.details.map((detail, dIdx) => (
                      <li key={dIdx}>{detail}</li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="arch-toggle-hint">
                {isSelected ? '▲ 닫기' : '▼ 세부 동작 원리 보기'}
              </div>
            </div>
          )
        })}
      </div>

      <div className="hero-features">
        <div className="feature-item">
          <span className="feature-dot"></span>
          <span><strong>Zero Server Cost</strong>: 서버리스 100% 클라이언트 연산</span>
        </div>
        <div className="feature-item">
          <span className="feature-dot"></span>
          <span><strong>Memory Sandboxing</strong>: WASM 가상 메모리 내 안전한 격리</span>
        </div>
        <div className="feature-item">
          <span className="feature-dot"></span>
          <span><strong>Auto Recovery</strong>: 10초 타임아웃 워커 자동 재생성 복구</span>
        </div>
      </div>
    </section>
  )
}
