export function HeroSection() {
  return (
    <section className="hero-section" aria-labelledby="hero-title">
      <div className="hero-badge">WebAssembly Architecture</div>
      <h1 id="hero-title">React & Pyodide WASM Runner</h1>
      <p className="hero-description">
        서버 없이 브라우저 내부에서 <strong>WebAssembly(WASM)</strong> 기반 CPython 가상 머신을 구동하여
        Python 코드를 안전하고 빠르게 실행합니다.
      </p>

      <div className="architecture-grid">
        <div className="arch-card">
          <div className="arch-step">01</div>
          <h3>React UI (Main Thread)</h3>
          <p>사용자 입력 코드를 수신하고 UI 렌더링을 멈춤(Freeze) 없이 유지하기 위해 비동기 메시지를 발행합니다.</p>
        </div>

        <div className="arch-card">
          <div className="arch-step">02</div>
          <h3>Web Worker (격리 스레드)</h3>
          <p>메인 스레드와 분리된 독립 백그라운드 스레드에서 타임아웃(10초) 감시 및 실행 수명주기를 제어합니다.</p>
        </div>

        <div className="arch-card">
          <div className="arch-step">03</div>
          <h3>Pyodide CPython (WASM)</h3>
          <p>Emscripten으로 컴파일된 CPython 인터프리터 WASM 바이너리가 브라우저 메모리 상에서 직접 코드를 해석·실행합니다.</p>
        </div>

        <div className="arch-card">
          <div className="arch-step">04</div>
          <h3>I/O Bridge & State</h3>
          <p>가상 파일시스템(MEMFS)과 <code>stdout</code>, <code>stderr</code>, 반환값, 예외 스택을 캡처하여 구조화된 결과로 변환합니다.</p>
        </div>
      </div>

      <div className="hero-features">
        <div className="feature-item">
          <span className="feature-dot"></span>
          <span><strong>Zero Server Cost</strong>: 서버리스 완전 클라이언트 사이드 연산</span>
        </div>
        <div className="feature-item">
          <span className="feature-dot"></span>
          <span><strong>Memory Sandboxing</strong>: WASM 가상 메모리 내 안전한 격리 실행</span>
        </div>
        <div className="feature-item">
          <span className="feature-dot"></span>
          <span><strong>Auto Recovery</strong>: 타임아웃 발생 시 워커 자동 재생성 복구</span>
        </div>
      </div>
    </section>
  )
}
