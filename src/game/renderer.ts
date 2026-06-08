import { CAMPAIGN_BOSSES, DIFFICULTIES, MODE_INFO, POWER_UP_CONFIG } from './constants';
import type { GameEngine } from './engine';
import type { GameStats } from './types';

function shadeColor(hex: string, percent: number): string {
  const num = parseInt(hex.slice(1), 16);
  const r = Math.max(0, Math.min(255, ((num >> 16) & 0xff) + percent));
  const g = Math.max(0, Math.min(255, ((num >> 8) & 0xff) + percent));
  const b = Math.max(0, Math.min(255, (num & 0xff) + percent));
  return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number): void {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

export class Renderer {
  constructor(
    private canvas: HTMLCanvasElement,
    private engine: GameEngine,
  ) {}

  render(stats: GameStats): void {
    const ctx = this.canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const rect = this.canvas.getBoundingClientRect();
    const w = rect.width;
    const h = rect.height;

    if (this.canvas.width !== w * dpr || this.canvas.height !== h * dpr) {
      this.canvas.width = w * dpr;
      this.canvas.height = h * dpr;
      this.engine.setCanvasSize(w, h);
    }

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const s = this.engine.state;
    const shake = s.screenShake;
    const sx = (Math.random() - 0.5) * shake;
    const sy = (Math.random() - 0.5) * shake;

    ctx.save();
    ctx.translate(sx, sy);

    this.drawCourt(ctx, w, h);

    if (s.phase === 'playing' || s.phase === 'paused' || s.phase === 'gameOver' || s.phase === 'levelComplete' || s.phase === 'victory') {
      this.drawGameplay(ctx, w, h);
    }

    ctx.restore();

    this.drawOverlay(ctx, w, h, stats);
  }

  private drawCourt(ctx: CanvasRenderingContext2D, w: number, h: number): void {
    const grad = ctx.createLinearGradient(0, 0, 0, h);
    grad.addColorStop(0, '#0d1f3c');
    grad.addColorStop(1, '#0a1628');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);

    ctx.strokeStyle = 'rgba(255,255,255,0.08)';
    ctx.lineWidth = 2;
    ctx.setLineDash([10, 14]);
    ctx.beginPath();
    ctx.moveTo(w / 2, 0);
    ctx.lineTo(w / 2, h);
    ctx.stroke();
    ctx.setLineDash([]);

    ctx.strokeStyle = 'rgba(191,10,48,0.25)';
    ctx.lineWidth = 2;
    ctx.strokeRect(3, 3, w - 6, h - 6);

    for (let i = 0; i < 13; i++) {
      ctx.fillStyle = `rgba(0,40,104,${0.03 + (i % 2) * 0.02})`;
      ctx.fillRect((w / 13) * i, 0, w / 13, h);
    }
  }

  private drawGameplay(ctx: CanvasRenderingContext2D, w: number, h: number): void {
    const s = this.engine.state;
    const margin = this.engine.getPaddleMargin();
    const pw = this.engine.getPaddleWidth();

    for (const pu of s.powerUps) {
      const cfg = POWER_UP_CONFIG[pu.type];
      ctx.fillStyle = cfg.color;
      ctx.shadowColor = cfg.color;
      ctx.shadowBlur = 12;
      ctx.beginPath();
      ctx.arc(pu.x, pu.y, 14, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 8px system-ui';
      ctx.textAlign = 'center';
      ctx.fillText(pu.type === 'bigPaddle' ? 'BIG' : pu.type.slice(0, 3).toUpperCase(), pu.x, pu.y + 3);
    }

    for (const p of s.particles) {
      const alpha = p.life / p.maxLife;
      ctx.globalAlpha = alpha;
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size * alpha, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;

    this.drawPaddle(ctx, margin, s.playerY, pw, s.playerPaddleHeight, '#58a6ff', s.activePowerUps.some((p) => p.type === 'shield' && p.owner === 'player'));
    this.drawPaddle(ctx, w - margin - pw, s.cpuY, pw, s.cpuPaddleHeight, '#bf0a30', false);
    this.drawBall(ctx, s.ball);

    if (s.serving && s.phase === 'playing') {
      ctx.fillStyle = 'rgba(0,0,0,0.25)';
      ctx.fillRect(0, 0, w, h);
      ctx.fillStyle = '#e6edf3';
      ctx.font = '600 16px system-ui';
      ctx.textAlign = 'center';
      ctx.fillText(s.autoServe ? 'Serving...' : 'Tap to serve', w / 2, h / 2 + 40);
    }

    this.drawHud(ctx, w, h, s.playerScore, s.cpuScore, s.message, s.messageTimer > 0 ? s.message : '', s.combo, s.mode === 'survival' ? s.survivalTime : null);
  }

  private drawPaddle(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, color: string, shield: boolean): void {
    if (shield) {
      ctx.strokeStyle = 'rgba(121,192,255,0.6)';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(x - 8, y + h / 2, h * 0.7, -Math.PI / 2, Math.PI / 2);
      ctx.stroke();
    }

    const gradient = ctx.createLinearGradient(x, 0, x + w, 0);
    gradient.addColorStop(0, color);
    gradient.addColorStop(1, shadeColor(color, -30));
    ctx.fillStyle = gradient;
    roundRect(ctx, x, y, w, h, 6);
    ctx.fill();

    ctx.fillStyle = 'rgba(255,255,255,0.18)';
    roundRect(ctx, x + 3, y + 4, 4, h - 8, 2);
    ctx.fill();
  }

  private drawBall(ctx: CanvasRenderingContext2D, ball: { x: number; y: number; radius: number; ghost: boolean; trail: { x: number; y: number }[] }): void {
    for (let i = 0; i < ball.trail.length; i++) {
      const t = ball.trail[i];
      const alpha = (i / ball.trail.length) * 0.3;
      ctx.fillStyle = ball.ghost ? `rgba(210,168,255,${alpha})` : `rgba(255,255,255,${alpha})`;
      ctx.beginPath();
      ctx.arc(t.x, t.y, ball.radius * (i / ball.trail.length), 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    ctx.beginPath();
    ctx.arc(ball.x, ball.y + 3, ball.radius, 0, Math.PI * 2);
    ctx.fill();

    const gradient = ctx.createRadialGradient(ball.x - ball.radius * 0.3, ball.y - ball.radius * 0.3, 1, ball.x, ball.y, ball.radius);
    if (ball.ghost) {
      gradient.addColorStop(0, 'rgba(255,255,255,0.9)');
      gradient.addColorStop(1, 'rgba(180,140,255,0.5)');
    } else {
      gradient.addColorStop(0, '#ffffff');
      gradient.addColorStop(1, '#b8c0cc');
    }
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(ball.x, ball.y, ball.radius, 0, Math.PI * 2);
    ctx.fill();
  }

  private drawHud(
    ctx: CanvasRenderingContext2D,
    w: number,
    _h: number,
    playerScore: number,
    cpuScore: number,
    _msg: string,
    flashMsg: string,
    combo: number,
    survivalTime: number | null,
  ): void {
    ctx.fillStyle = 'rgba(10,22,40,0.75)';
    ctx.fillRect(0, 0, w, 44);

    ctx.font = 'bold 28px system-ui';
    ctx.fillStyle = '#58a6ff';
    ctx.textAlign = 'left';
    ctx.fillText(String(playerScore), 16, 32);

    ctx.fillStyle = '#bf0a30';
    ctx.textAlign = 'right';
    ctx.fillText(String(cpuScore), w - 16, 32);

    ctx.fillStyle = '#8b949e';
    ctx.font = '600 11px system-ui';
    ctx.textAlign = 'center';
    if (survivalTime !== null) {
      ctx.fillText(`${Math.floor(survivalTime)}s`, w / 2, 20);
    } else {
      ctx.fillText('AMERICAN PONG', w / 2, 20);
    }

    if (combo >= 3) {
      ctx.fillStyle = '#f0883e';
      ctx.font = 'bold 13px system-ui';
      ctx.fillText(`${combo}x COMBO`, w / 2, 36);
    }

    if (flashMsg) {
      ctx.fillStyle = '#e6edf3';
      ctx.font = 'bold 14px system-ui';
      ctx.textAlign = 'center';
      ctx.fillText(flashMsg, w / 2, _h - 24);
    }
  }

  private drawOverlay(ctx: CanvasRenderingContext2D, w: number, h: number, stats: GameStats): void {
    const s = this.engine.state;

    if (s.phase === 'menu') {
      this.drawMenu(ctx, w, h, stats);
    } else if (s.phase === 'modeSelect') {
      this.drawModeSelect(ctx, w, h);
    } else if (s.phase === 'difficultySelect') {
      this.drawDifficultySelect(ctx, w, h);
    } else if (s.phase === 'paused') {
      this.drawPauseMenu(ctx, w, h);
    } else if (s.phase === 'gameOver') {
      this.drawGameOver(ctx, w, h, stats, s.message === 'VICTORY!');
    } else if (s.phase === 'levelComplete') {
      this.drawLevelComplete(ctx, w, h);
    } else if (s.phase === 'victory') {
      this.drawVictory(ctx, w, h, stats);
    }
  }

  private drawPanel(ctx: CanvasRenderingContext2D, w: number, h: number, alpha = 0.88): void {
    ctx.fillStyle = `rgba(10,22,40,${alpha})`;
    ctx.fillRect(0, 0, w, h);
  }

  private drawTitle(ctx: CanvasRenderingContext2D, w: number, y: number): void {
    const grad = ctx.createLinearGradient(w * 0.2, 0, w * 0.8, 0);
    grad.addColorStop(0, '#bf0a30');
    grad.addColorStop(0.45, '#ffffff');
    grad.addColorStop(1, '#002868');
    ctx.fillStyle = grad;
    ctx.font = 'bold 32px system-ui';
    ctx.textAlign = 'center';
    ctx.fillText('AMERICAN PONG', w / 2, y);
  }

  private drawMenu(ctx: CanvasRenderingContext2D, w: number, h: number, stats: GameStats): void {
    this.drawPanel(ctx, w, h, 0.92);
    this.drawTitle(ctx, w, h * 0.22);
    ctx.fillStyle = '#8b949e';
    ctx.font = '14px system-ui';
    ctx.textAlign = 'center';
    ctx.fillText('The ultimate patriotic paddle experience', w / 2, h * 0.28);
    ctx.fillText(`Wins: ${stats.gamesWon} · Streak: ${stats.currentStreak} · Best Rally: ${stats.longestRally}`, w / 2, h * 0.34);

    this.drawButton(ctx, w / 2, h * 0.48, 'PLAY', true);
    this.drawButton(ctx, w / 2, h * 0.58, 'CAMPAIGN', false);
    this.drawButton(ctx, w / 2, h * 0.68, 'STATS', false);

    ctx.fillStyle = '#6e7681';
    ctx.font = '12px system-ui';
    ctx.fillText('by Austin Buhl · v2.0 Mobile', w / 2, h * 0.9);
  }

  private drawModeSelect(ctx: CanvasRenderingContext2D, w: number, h: number): void {
    this.drawPanel(ctx, w, h);
    ctx.fillStyle = '#e6edf3';
    ctx.font = 'bold 22px system-ui';
    ctx.textAlign = 'center';
    ctx.fillText('Choose Mode', w / 2, h * 0.15);

    const modes = Object.entries(MODE_INFO).filter(([k]) => k !== 'campaign');
    modes.forEach(([key, info], i) => {
      const y = h * (0.28 + i * 0.14);
      this.drawButton(ctx, w / 2, y, info.label, false, info.description);
    });
    this.drawButton(ctx, w / 2, h * 0.82, 'BACK', false);
  }

  private drawDifficultySelect(ctx: CanvasRenderingContext2D, w: number, h: number): void {
    this.drawPanel(ctx, w, h);
    ctx.fillStyle = '#e6edf3';
    ctx.font = 'bold 22px system-ui';
    ctx.textAlign = 'center';
    ctx.fillText('Difficulty', w / 2, h * 0.12);

    const diffs = Object.entries(DIFFICULTIES);
    diffs.forEach(([key, cfg], i) => {
      const y = h * (0.22 + i * 0.11);
      const active = this.engine.state.difficulty === key;
      this.drawButton(ctx, w / 2, y, cfg.label, active, cfg.description);
    });
    this.drawButton(ctx, w / 2, h * 0.82, 'START MATCH', true);
    this.drawButton(ctx, w / 2, h * 0.9, 'BACK', false);
  }

  private drawPauseMenu(ctx: CanvasRenderingContext2D, w: number, h: number): void {
    this.drawPanel(ctx, w, h, 0.75);
    ctx.fillStyle = '#e6edf3';
    ctx.font = 'bold 26px system-ui';
    ctx.textAlign = 'center';
    ctx.fillText('PAUSED', w / 2, h * 0.35);
    this.drawButton(ctx, w / 2, h * 0.5, 'RESUME', true);
    this.drawButton(ctx, w / 2, h * 0.62, 'RESTART', false);
    this.drawButton(ctx, w / 2, h * 0.74, 'QUIT', false);
  }

  private drawGameOver(ctx: CanvasRenderingContext2D, w: number, h: number, stats: GameStats, won: boolean): void {
    this.drawPanel(ctx, w, h, 0.8);
    ctx.fillStyle = won ? '#3fb950' : '#f85149';
    ctx.font = 'bold 30px system-ui';
    ctx.textAlign = 'center';
    ctx.fillText(won ? 'VICTORY!' : 'DEFEAT', w / 2, h * 0.32);
    ctx.fillStyle = '#8b949e';
    ctx.font = '14px system-ui';
    ctx.fillText(`Score ${this.engine.state.playerScore} - ${this.engine.state.cpuScore}`, w / 2, h * 0.4);
    if (this.engine.state.maxCombo >= 3) {
      ctx.fillText(`Best combo: ${this.engine.state.maxCombo}x`, w / 2, h * 0.46);
    }
    this.drawButton(ctx, w / 2, h * 0.58, 'PLAY AGAIN', true);
    this.drawButton(ctx, w / 2, h * 0.7, 'MENU', false);
  }

  private drawLevelComplete(ctx: CanvasRenderingContext2D, w: number, h: number): void {
    this.drawPanel(ctx, w, h, 0.8);
    const boss = CAMPAIGN_BOSSES[this.engine.state.campaignLevel];
    ctx.fillStyle = '#3fb950';
    ctx.font = 'bold 26px system-ui';
    ctx.textAlign = 'center';
    ctx.fillText('LEVEL COMPLETE!', w / 2, h * 0.3);
    ctx.fillStyle = '#8b949e';
    ctx.font = '14px system-ui';
    ctx.fillText(boss?.name ?? '', w / 2, h * 0.38);
    this.drawButton(ctx, w / 2, h * 0.55, 'NEXT LEVEL', true);
    this.drawButton(ctx, w / 2, h * 0.67, 'MENU', false);
  }

  private drawVictory(ctx: CanvasRenderingContext2D, w: number, h: number, stats: GameStats): void {
    this.drawPanel(ctx, w, h, 0.85);
    ctx.fillStyle = '#ffd700';
    ctx.font = 'bold 28px system-ui';
    ctx.textAlign = 'center';
    ctx.fillText('🇺🇸 CAMPAIGN COMPLETE 🇺🇸', w / 2, h * 0.28);
    ctx.fillStyle = '#e6edf3';
    ctx.font = '16px system-ui';
    ctx.fillText('You are an American Pong Legend!', w / 2, h * 0.36);
    ctx.fillStyle = '#8b949e';
    ctx.font = '13px system-ui';
    ctx.fillText(`${stats.achievements.length} achievements unlocked`, w / 2, h * 0.44);
    this.drawButton(ctx, w / 2, h * 0.58, 'PLAY AGAIN', true);
    this.drawButton(ctx, w / 2, h * 0.7, 'MENU', false);
  }

  private drawButton(ctx: CanvasRenderingContext2D, x: number, y: number, label: string, primary: boolean, subtitle?: string): void {
    const bw = Math.min(280, ctx.canvas.getBoundingClientRect().width - 48);
    const bh = subtitle ? 52 : 42;
    const bx = x - bw / 2;
    const by = y - bh / 2;

    if (primary) {
      const g = ctx.createLinearGradient(bx, by, bx, by + bh);
      g.addColorStop(0, '#d4143a');
      g.addColorStop(1, '#bf0a30');
      ctx.fillStyle = g;
      ctx.strokeStyle = '#ff4d6d';
    } else {
      ctx.fillStyle = 'rgba(33,38,45,0.95)';
      ctx.strokeStyle = '#30363d';
    }

    ctx.lineWidth = 1.5;
    roundRect(ctx, bx, by, bw, bh, 8);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = primary ? '#fff' : '#e6edf3';
    ctx.font = `600 ${subtitle ? 14 : 15}px system-ui`;
    ctx.textAlign = 'center';
    ctx.fillText(label, x, subtitle ? y - 6 : y + 5);
    if (subtitle) {
      ctx.fillStyle = '#8b949e';
      ctx.font = '11px system-ui';
      ctx.fillText(subtitle, x, y + 14);
    }
  }

  hitTestButton(x: number, y: number, w: number, h: number, buttons: { label: string; y: number }[]): string | null {
    const bw = Math.min(280, w - 48);
    const bh = 42;
    for (const btn of buttons) {
      const bx = w / 2 - bw / 2;
      const by = btn.y - bh / 2;
      if (x >= bx && x <= bx + bw && y >= by && y <= by + bh) return btn.label;
    }
    return null;
  }
}
