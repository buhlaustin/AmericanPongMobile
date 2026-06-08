import type { GameEngine } from './game/engine';

export class TouchControls {
  private zone!: HTMLElement;
  private activePointer: number | null = null;
  private tapStart: { x: number; y: number } | null = null;

  constructor(
    private shell: HTMLElement,
    private canvas: HTMLCanvasElement,
    private engine: GameEngine,
  ) {}

  mount(): void {
    this.zone = document.createElement('div');
    this.zone.id = 'touch-play-zone';
    this.zone.setAttribute('aria-hidden', 'true');
    this.shell.appendChild(this.zone);

    this.zone.addEventListener('pointerdown', (e) => this.onPointerDown(e), { passive: false });
    this.zone.addEventListener('pointermove', (e) => this.onPointerMove(e), { passive: false });
    this.zone.addEventListener('pointerup', (e) => this.onPointerUp(e), { passive: false });
    this.zone.addEventListener('pointercancel', (e) => this.onPointerUp(e), { passive: false });

    // Fallback for older Android WebView touch event paths.
    this.zone.addEventListener('touchstart', (e) => this.onTouchFallback(e), { passive: false });
    this.zone.addEventListener('touchmove', (e) => this.onTouchMoveFallback(e), { passive: false });
    this.zone.addEventListener('touchend', (e) => this.onTouchEndFallback(e), { passive: false });
    this.zone.addEventListener('touchcancel', () => this.clearPointer(), { passive: false });
  }

  sync(): void {
    const playing = this.engine.state.phase === 'playing';
    this.zone.classList.toggle('hidden', !playing);
    this.zone.classList.toggle('serving', playing && this.engine.state.serving);
  }

  private onPointerDown(e: PointerEvent): void {
    if (this.engine.state.phase !== 'playing') return;
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    if (this.isPauseTarget(e.target)) return;

    e.preventDefault();
    e.stopPropagation();
    this.activePointer = e.pointerId;
    this.tapStart = { x: e.clientX, y: e.clientY };
    this.zone.setPointerCapture(e.pointerId);

    const point = this.toCanvasPoint(e.clientX, e.clientY);
    if (this.tryServe(point.x, point.y)) return;
    this.updatePaddle(point.x, point.y);
  }

  private onPointerMove(e: PointerEvent): void {
    if (this.engine.state.phase !== 'playing') return;
    if (this.activePointer !== e.pointerId) return;

    e.preventDefault();
    const point = this.toCanvasPoint(e.clientX, e.clientY);
    this.updatePaddle(point.x, point.y);
  }

  private onPointerUp(e: PointerEvent): void {
    if (this.activePointer !== e.pointerId) return;

    e.preventDefault();
    const point = this.toCanvasPoint(e.clientX, e.clientY);

    if (this.tapStart) {
      const moved = Math.hypot(e.clientX - this.tapStart.x, e.clientY - this.tapStart.y);
      if (moved < 16) {
        this.tryServe(point.x, point.y);
      }
    }

    this.clearPointer();
  }

  private onTouchFallback(e: TouchEvent): void {
    if (this.engine.state.phase !== 'playing') return;
    if (this.activePointer !== null) return;

    e.preventDefault();
    const touch = e.changedTouches[0] ?? e.touches[0];
    if (!touch) return;

    this.tapStart = { x: touch.clientX, y: touch.clientY };
    const point = this.toCanvasPoint(touch.clientX, touch.clientY);
    if (this.tryServe(point.x, point.y)) return;
    this.updatePaddle(point.x, point.y);
  }

  private onTouchMoveFallback(e: TouchEvent): void {
    if (this.engine.state.phase !== 'playing') return;
    if (this.activePointer !== null) return;

    e.preventDefault();
    const touch = e.touches[0];
    if (!touch) return;
    const point = this.toCanvasPoint(touch.clientX, touch.clientY);
    this.updatePaddle(point.x, point.y);
  }

  private onTouchEndFallback(e: TouchEvent): void {
    if (this.activePointer !== null) return;

    e.preventDefault();
    const touch = e.changedTouches[0];
    if (!touch || !this.tapStart) {
      this.clearPointer();
      return;
    }

    const moved = Math.hypot(touch.clientX - this.tapStart.x, touch.clientY - this.tapStart.y);
    const point = this.toCanvasPoint(touch.clientX, touch.clientY);
    if (moved < 18) {
      this.tryServe(point.x, point.y);
    }
    this.clearPointer();
  }

  private tryServe(x: number, y: number): boolean {
    if (!this.engine.state.serving) return false;
    if (!this.engine.canServeFromTap(x, y)) return false;
    this.engine.serve();
    return true;
  }

  private updatePaddle(x: number, y: number): void {
    if (this.engine.state.serving) return;
    if (x > this.engine.width * 0.55) return;
    this.engine.setTouchTarget(y);
  }

  private toCanvasPoint(clientX: number, clientY: number): { x: number; y: number } {
    const rect = this.canvas.getBoundingClientRect();
    const scaleX = this.engine.width / Math.max(rect.width, 1);
    const scaleY = this.engine.height / Math.max(rect.height, 1);
    return {
      x: (clientX - rect.left) * scaleX,
      y: (clientY - rect.top) * scaleY,
    };
  }

  private isPauseTarget(target: EventTarget | null): boolean {
    return target instanceof HTMLElement && Boolean(target.closest('#btn-pause'));
  }

  private clearPointer(): void {
    this.activePointer = null;
    this.tapStart = null;
    this.engine.setTouchTarget(null);
  }
}
