// ═══════════════════════════════════════════════════════════════
// TERRITORY DOMINATION — Game Loop (requestAnimationFrame)
// ═══════════════════════════════════════════════════════════════

export type FrameCallback = (deltaMs: number, totalMs: number, fps: number) => void;

export class GameLoop {
  private running = false;
  private rafId: number | null = null;
  private lastTimestamp = 0;
  private frameCount = 0;
  private fpsAccumulator = 0;
  private _currentFps = 0;

  /** Registered per-frame callbacks. */
  private callbacks: Map<string, FrameCallback> = new Map();

  /** Performance: how many ms the last frame took. */
  private _lastFrameTime = 0;

  // ── Lifecycle ─────────────────────────────────────────────

  start(): void {
    if (this.running) return;
    this.running = true;
    this.lastTimestamp = performance.now();
    this.frameCount = 0;
    this.fpsAccumulator = 0;
    this._currentFps = 0;
    this.tick(this.lastTimestamp);
  }

  stop(): void {
    this.running = false;
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
  }

  get isRunning(): boolean {
    return this.running;
  }

  // ── Callbacks ─────────────────────────────────────────────

  /**
   * Register a named callback. Name acts as a dedup key —
   * registering with the same name replaces the old callback.
   */
  addCallback(name: string, cb: FrameCallback): void {
    this.callbacks.set(name, cb);
  }

  removeCallback(name: string): void {
    this.callbacks.delete(name);
  }

  // ── Metrics ───────────────────────────────────────────────

  get currentFps(): number {
    return this._currentFps;
  }

  get lastFrameTime(): number {
    return this._lastFrameTime;
  }

  // ── Core Loop ─────────────────────────────────────────────

  private tick = (timestamp: number): void => {
    if (!this.running) return;

    const deltaMs = timestamp - this.lastTimestamp;
    this.lastTimestamp = timestamp;

    // Clamp delta to avoid spiraling after tab switch / debugger pause
    const clampedDelta = Math.min(deltaMs, 100);

    // FPS calculation (averaged over 1 second)
    this.frameCount++;
    this.fpsAccumulator += deltaMs;
    if (this.fpsAccumulator >= 1000) {
      this._currentFps = Math.round(
        (this.frameCount * 1000) / this.fpsAccumulator,
      );
      this.frameCount = 0;
      this.fpsAccumulator = 0;
    }

    // Run all registered callbacks
    const frameStart = performance.now();
    this.callbacks.forEach((cb) => {
      cb(clampedDelta, timestamp, this._currentFps);
    });
    this._lastFrameTime = performance.now() - frameStart;

    // Schedule next frame
    this.rafId = requestAnimationFrame(this.tick);
  };
}
