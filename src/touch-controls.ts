import type { GameEngine } from './game/engine';

export class TouchControls {
  private zone!: HTMLElement;

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

    this.zone.addEventListener(
      'touchstart',
      (e) => this.onTouch(e, true),
      { passive: false },
    );
    this.zone.addEventListener(
      'touchmove',
      (e) => this.onTouch(e, false),
      { passive: false },
    );
    this.zone.addEventListener('touchend', () => this.engine.setTouchTarget(null));
    this.zone.addEventListener('touchcancel', () => this.engine.setTouchTarget(null));

    this.zone.addEventListener('mousedown', (e) => {
      if (this.engine.state.phase !== 'playing') return;
      this.handlePoint(e.clientX, e.clientY, true);
    });
    this.zone.addEventListener('mousemove', (e) => {
      if (this.engine.state.phase !== 'playing' || e.buttons !== 1) return;
      this.handlePoint(e.clientX, e.clientY, false);
    });
    this.zone.addEventListener('mouseup', () => this.engine.setTouchTarget(null));
    this.zone.addEventListener('mouseleave', () => this.engine.setTouchTarget(null));
  }

  sync(): void {
    const playing = this.engine.state.phase === 'playing';
    this.zone.classList.toggle('hidden', !playing);
    this.zone.classList.toggle('serving', playing && this.engine.state.serving);
  }

  private onTouch(e: TouchEvent, allowServe: boolean): void {
    if (this.engine.state.phase !== 'playing') return;
    e.preventDefault();
    const touch = e.touches[0];
    if (!touch) return;
    this.handlePoint(touch.clientX, touch.clientY, allowServe);
  }

  private handlePoint(clientX: number, clientY: number, allowServe: boolean): void {
    const rect = this.canvas.getBoundingClientRect();
    const x = clientX - rect.left;
    const y = clientY - rect.top;

    if (allowServe && this.engine.state.serving && this.engine.isBallTap(x, y)) {
      this.engine.serve();
      return;
    }

    if (x <= rect.width * 0.52) {
      this.engine.setTouchTarget(y);
    }
  }
}
