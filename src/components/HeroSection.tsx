import { useEffect, useState } from 'react'
import { useI18n } from '../i18n/I18nContext'
import { LanguageSwitcher } from './LanguageSwitcher'

export type RunnerState = 'initializing' | 'ready' | 'running' | 'recovering' | 'init-error'

export function HeroSection({ runnerState = 'ready' }: { runnerState?: RunnerState }) {
  const { t } = useI18n()
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
        return { text: t.hero.status.init, className: 'status-init' }
      case 'running':
        return { text: t.hero.status.running, className: 'status-running' }
      case 'recovering':
        return { text: t.hero.status.recovering, className: 'status-recover' }
      case 'init-error':
        return { text: t.hero.status.error, className: 'status-error' }
      case 'ready':
      default:
        return { text: t.hero.status.ready, className: 'status-ready' }
    }
  }

  const status = getStatusBadge()
  const steps = t.hero.steps
  const currentStepData = steps[activeStep] || steps[0]

  return (
    <section className="hero-section" aria-labelledby="hero-title">
      {/* Top Banner Toolbar */}
      <div className="hero-header-row">
        <div className="hero-badge">{t.hero.badge}</div>
        <div className="hero-controls">
          <LanguageSwitcher />
          <button
            type="button"
            className={`sim-button ${isPlaying ? 'playing' : ''}`}
            onClick={handleToggleSimulation}
            disabled={runnerState === 'running'}
            aria-label={isPlaying ? t.hero.simPause : t.hero.simPlay}
          >
            {isPlaying ? t.hero.simPause : t.hero.simPlay}
          </button>
          <div className={`runtime-status-pill ${status.className}`}>
            <span className="status-indicator-dot"></span>
            <span>{status.text}</span>
          </div>
        </div>
      </div>

      <h1 id="hero-title">{t.hero.title}</h1>
      <p className="hero-description">{t.hero.description}</p>

      {/* Artifact Animation Stage */}
      <div className="animation-stage-box">
        <div className="stage-header">
          <div className="packet-indicator-wrapper">
            <span className="live-pulse-badge">{t.hero.liveFlow}</span>
            <span className="current-stage-title">
              STEP {currentStepData.step}: {currentStepData.analogy} ({currentStepData.title})
            </span>
          </div>
          <span className="stage-highlight-tag">{currentStepData.animationHighlight}</span>
        </div>

        {/* Pipeline Progress Track with Traveling Beam */}
        <div className="pipeline-visual-track" aria-label="WASM Execution Pipeline">
          <div className="track-bar-background">
            <div
              className="track-bar-progress"
              style={{ width: `${(activeStep / (steps.length - 1)) * 100}%` }}
            />
          </div>
          <div className="track-dots">
            {steps.map((s, idx) => (
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
        {steps.map((step, index) => {
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
          <span>
            <strong>{t.hero.features.zeroCost.strong}</strong> {t.hero.features.zeroCost.desc}
          </span>
        </div>
        <div className="feature-item">
          <span className="feature-icon">🔒</span>
          <span>
            <strong>{t.hero.features.sandboxing.strong}</strong> {t.hero.features.sandboxing.desc}
          </span>
        </div>
        <div className="feature-item">
          <span className="feature-icon">⏱️</span>
          <span>
            <strong>{t.hero.features.recovery.strong}</strong> {t.hero.features.recovery.desc}
          </span>
        </div>
      </div>
    </section>
  )
}
