import type { GameEngine } from './game/engine';

export class TouchControls {
  private zone!: HTMLElement;
  private activePointer: number | null = null;

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
  }

  sync(): void {
    const playing = this.engine.state.phase === 'playing';
    this.zone.classList.toggle('hidden', !playing);
    this.zone.classList.toggle('serving', playing && this.engine.state.serving);
  }

  private onPointerDown(e: PointerEvent): void {
    if (this.engine.state.phase !== 'playing') return;
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    if (this.isPauseTarget(e.target) || this.isPauseArea(e.clientX, e.clientY)) {
      this.engine.pause();
      return;
    }

    e.preventDefault();
    e.stopPropagation();
    this.activePointer = e.pointerId;
    this.zone.setPointerCapture(e.pointerId);

    if (this.engine.state.serving) {
      this.engine.tapToServe();
      return;
    }

    const point = this.toCanvasPoint(e.clientX, e.clientY);
    this.updatePaddle(point.x, point.y);
  }

  private onPointerMove(e: PointerEvent): void {
    if (this.engine.state.phase !== 'playing') return;
    if (this.activePointer !== e.pointerId) return;
    if (this.engine.state.serving) return;

    e.preventDefault();
    const point = this.toCanvasPoint(e.clientX, e.clientY);
    this.updatePaddle(point.x, point.y);
  }

  private onPointerUp(e: PointerEvent): void {
    if (this.activePointer !== e.pointerId) return;
    e.preventDefault();

    if (this.engine.state.serving) {
      this.engine.tapToServe();
    }

    this.clearPointer();
  }

  private updatePaddle(x: number, y: number): void {
    if (x > this.engine.width * 0.55) return;
    this.engine.setTouchTarget(y);
  }

  private toCanvasPoint(clientX: number, clientY: number): { x: number; y: number } {
    const rect = this.canvas.getBoundingClientRect();
    return {
      x: ((clientX - rect.left) / Math.max(rect.width, 1)) * this.engine.width,
      y: ((clientY - rect.top) / Math.max(rect.height, 1)) * this.engine.height,
    };
  }

  private isPauseTarget(target: EventTarget | null): boolean {
    return target instanceof HTMLElement && Boolean(target.closest('#btn-pause'));
  }

  private isPauseArea(clientX: number, clientY: number): boolean {
    const rect = this.shell.getBoundingClientRect();
    const margin = 72;
    return (
      clientX >= rect.right - margin &&
      clientY >= rect.bottom - margin
    );
  }

  private clearPointer(): void {
    if (this.activePointer !== null) {
      try {
        this.zone.releasePointerCapture(this.activePointer);
      } catch {
        /* ignore */
      }
    }
    this.activePointer = null;
    this.engine.setTouchTarget(null);
  }
}
