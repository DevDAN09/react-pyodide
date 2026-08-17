export type Language = 'ko' | 'en'

export interface StepTranslation {
  step: string
  icon: string
  analogy: string
  title: string
  desc: string
  animationHighlight: string
  dataLabel: string
  scenarioNote: string
}

export interface Translations {
  hero: {
    badge: string
    title: string
    description: string
    simPlay: string
    simPause: string
    liveFlow: string
    status: {
      init: string
      running: string
      recovering: string
      error: string
      ready: string
    }
    steps: StepTranslation[]
    features: {
      zeroCost: { strong: string; desc: string }
      sandboxing: { strong: string; desc: string }
      recovery: { strong: string; desc: string }
    }
  }
  editor: {
    label: string
    runButton: string
    retryButton: string
    copyButton: string
    copiedButton: string
    clearButton: string
    resetButton: string
    shortcutHint: string
    presetLabel: string
    presets: {
      hello: string
      fibonacci: string
      primes: string
      exceptions: string
      timeout: string
    }
    status: {
      initializing: string
      ready: string
      running: string
      recovering: string
      initError: string
    }
  }
  result: {
    heading: string
    stdout: string
    stderr: string
    result: string
    error: string
    duration: string
  }
}
