import { Haptics, ImpactStyle, NotificationType } from '@capacitor/haptics';
import {
  CAMPAIGN_BOSSES,
  DIFFICULTIES,
  POWER_UP_CONFIG,
  WIN_SCORE,
  type Difficulty,
  type GameMode,
  type PowerUpType,
} from './constants';
import type { ActivePowerUp, Ball, GameState, GameStats, PowerUpEntity } from './types';
import { CpuAI } from './ai';
import { audio } from './audio';
import { nextPowerUpId, spawnBurst, spawnTrail, updateParticles } from './particles';
import { ACHIEVEMENTS, unlockAchievement } from './storage';

const BASE_PADDLE_HEIGHT = 100;
const PADDLE_WIDTH = 14;
const PADDLE_MARGIN = 24;
const BALL_RADIUS = 10;
const PADDLE_SPEED = 480;
const POWER_UP_TYPES: PowerUpType[] = ['bigPaddle', 'speedBoost', 'slowMo', 'magnet', 'shield', 'fireball', 'ghost'];

export class GameEngine {
  width = 900;
  height = 520;
  state: GameState;
  stats: GameStats;
  ai = new CpuAI();
  keys = { up: false, down: false };
  touchTargetY: number | null = null;
  powerUpsCollectedThisMatch = 0;
  wasDown52 = false;
  onStatsChange?: (stats: GameStats) => void;
  onAchievement?: (id: string) => void;

  constructor(stats: GameStats) {
    this.stats = stats;
    this.state = this.createInitialState();
  }

  private createInitialState(): GameState {
    return {
      phase: 'menu',
      mode: 'classic',
      difficulty: 'normal',
      campaignLevel: 0,
      winScore: WIN_SCORE,
      playerY: this.height / 2 - BASE_PADDLE_HEIGHT / 2,
      cpuY: this.height / 2 - BASE_PADDLE_HEIGHT / 2,
      playerPaddleHeight: BASE_PADDLE_HEIGHT,
      cpuPaddleHeight: BASE_PADDLE_HEIGHT,
      playerScore: 0,
      cpuScore: 0,
      ball: this.createBall(),
      serving: true,
      serveDirection: 1,
      serveTimer: 0,
      rallyCount: 0,
      survivalTime: 0,
      combo: 0,
      maxCombo: 0,
      shieldHits: 0,
      powerUps: [],
      activePowerUps: [],
      particles: [],
      screenShake: 0,
      slowMoFactor: 1,
      lastTime: 0,
      autoServe: false,
      message: '',
      messageTimer: 0,
    };
  }

  private createBall(): Ball {
    return {
      x: this.width / 2,
      y: this.height / 2,
      vx: 0,
      vy: 0,
      radius: BALL_RADIUS,
      ghost: false,
      trail: [],
    };
  }

  resize(w: number, h: number): void {
    const scale = Math.min(w / this.width, h / this.height);
    this.width = Math.floor(this.width * scale) || w;
    this.height = Math.floor(this.height * scale) || h;
  }

  setCanvasSize(w: number, h: number): void {
    if (w <= 0 || h <= 0) return;
    if (Math.abs(this.width - w) < 0.5 && Math.abs(this.height - h) < 0.5) return;

    const oldW = this.width || w;
    const oldH = this.height || h;
    const scaleX = w / oldW;
    const scaleY = h / oldH;

    this.width = w;
    this.height = h;

    const s = this.state;
    s.playerY = this.clamp(s.playerY * scaleY, 0, this.height - s.playerPaddleHeight);
    s.cpuY = this.clamp(s.cpuY * scaleY, 0, this.height - s.cpuPaddleHeight);
    s.ball.x *= scaleX;
    s.ball.y *= scaleY;
  }

  private resetPositions(): void {
    const s = this.state;
    s.playerY = this.height / 2 - s.playerPaddleHeight / 2;
    s.cpuY = this.height / 2 - s.cpuPaddleHeight / 2;
    this.resetBall(s.serveDirection);
  }

  showMenu(): void {
    this.state.phase = 'menu';
  }

  showModeSelect(): void {
    this.state.phase = 'modeSelect';
    audio.play('menu');
  }

  showDifficultySelect(mode: GameMode): void {
    this.state.mode = mode;
    if (mode === 'campaign') {
      this.startCampaignLevel(this.stats.campaignProgress);
      return;
    }
    this.state.phase = 'difficultySelect';
    audio.play('menu');
  }

  setDifficulty(d: Difficulty): void {
    this.state.difficulty = d;
  }

  startMatch(): void {
    const s = this.state;
    s.phase = 'playing';
    s.playerScore = 0;
    s.cpuScore = 0;
    s.winScore = s.mode === 'survival' ? 999 : WIN_SCORE;
    s.rallyCount = 0;
    s.combo = 0;
    s.maxCombo = 0;
    s.survivalTime = 0;
    s.shieldHits = 0;
    s.powerUps = [];
    s.activePowerUps = [];
    s.particles = [];
    s.playerPaddleHeight = BASE_PADDLE_HEIGHT;
    s.cpuPaddleHeight = BASE_PADDLE_HEIGHT;
    this.powerUpsCollectedThisMatch = 0;
    this.wasDown52 = false;
    this.ai.reset();
    this.resetPositions();
    s.message = 'Tap the ball to serve';
    s.messageTimer = 1.5;
    audio.play('menu');
  }

  startCampaignLevel(level: number): void {
    const boss = CAMPAIGN_BOSSES[Math.min(level, CAMPAIGN_BOSSES.length - 1)];
    this.state.campaignLevel = level;
    this.state.mode = 'campaign';
    this.state.difficulty = boss.difficulty;
    this.state.winScore = boss.winScore;
    this.startMatch();
    this.state.message = `Level ${level + 1}: ${boss.name}`;
    this.state.messageTimer = 2.5;
  }

  pause(): void {
    if (this.state.phase === 'playing') this.state.phase = 'paused';
  }

  resume(): void {
    if (this.state.phase === 'paused') this.state.phase = 'playing';
  }

  restart(): void {
    if (this.state.mode === 'campaign') {
      this.startCampaignLevel(this.state.campaignLevel);
    } else {
      this.startMatch();
    }
  }

  serve(): void {
    const s = this.state;
    if (s.phase !== 'playing' || !s.serving) return;

    const config = DIFFICULTIES[s.difficulty];
    const angle = (Math.random() * 0.5 - 0.25) * Math.PI;
    const speed = config.initialSpeed * (s.activePowerUps.some((p) => p.type === 'fireball' && p.owner === 'player') ? 1.25 : 1);
    s.ball.vx = Math.cos(angle) * speed * s.serveDirection;
    s.ball.vy = Math.sin(angle) * speed;
    s.serving = false;
    s.serveTimer = 0;
    s.ball.trail = [];
    audio.play('serve');
    void this.haptic(ImpactStyle.Light);
  }

  tapToServe(): void {
    if (this.state.phase !== 'playing' || !this.state.serving) return;
    this.serve();
  }

  setTouchTarget(y: number | null): void {
    this.touchTargetY = y;
  }

  private resetBall(direction: number): void {
    const s = this.state;
    s.ball = this.createBall();
    s.ball.x = this.width / 2;
    s.ball.y = this.height / 2;
    s.serving = true;
    s.serveDirection = direction;
    s.serveTimer = 3.0;
    s.rallyCount = 0;
    s.combo = 0;
  }

  private getEffectiveDifficulty(): Difficulty {
    return this.state.difficulty;
  }

  private clamp(v: number, min: number, max: number): number {
    return Math.max(min, Math.min(max, v));
  }

  private hasPowerUp(type: PowerUpType, owner: 'player' | 'cpu'): boolean {
    const now = performance.now() / 1000;
    return this.state.activePowerUps.some((p) => p.type === type && p.owner === owner && p.expiresAt > now);
  }

  private applyPowerUp(type: PowerUpType, owner: 'player' | 'cpu'): void {
    const config = POWER_UP_CONFIG[type];
    const now = performance.now() / 1000;
    this.state.activePowerUps = this.state.activePowerUps.filter((p) => !(p.type === type && p.owner === owner));
    this.state.activePowerUps.push({ type, owner, expiresAt: now + config.duration });

    if (type === 'bigPaddle' && owner === 'player') {
      this.state.playerPaddleHeight = BASE_PADDLE_HEIGHT * 1.55;
    }
    if (type === 'bigPaddle' && owner === 'cpu') {
      this.state.cpuPaddleHeight = BASE_PADDLE_HEIGHT * 1.4;
    }
    if (type === 'slowMo') {
      this.state.slowMoFactor = 0.55;
    }
    if (type === 'ghost' && owner === 'player') {
      this.state.ball.ghost = true;
    }

    audio.play('powerup');
    void this.haptic(ImpactStyle.Medium);
    this.state.message = config.label + '!';
    this.state.messageTimer = 1.2;
    spawnBurst(this.state.particles, owner === 'player' ? PADDLE_MARGIN : this.width - PADDLE_MARGIN, this.height / 2, config.color, 16, 200);
  }

  private spawnPowerUp(): void {
    if (this.state.mode !== 'arcade' && this.state.mode !== 'survival') return;
    if (this.state.powerUps.length > 2) return;
    if (Math.random() > 0.012) return;

    const config = DIFFICULTIES[this.getEffectiveDifficulty()];
    const type = POWER_UP_TYPES[Math.floor(Math.random() * POWER_UP_TYPES.length)];
    const favorPlayer = Math.random() < config.powerUpBias;
    const entity: PowerUpEntity = {
      id: nextPowerUpId(),
      type,
      x: this.width / 2 + (Math.random() - 0.5) * 200,
      y: -20,
      vy: 60 + Math.random() * 40,
      collected: false,
    };
    (entity as PowerUpEntity & { favorPlayer?: boolean }).favorPlayer = favorPlayer;
    this.state.powerUps.push(entity);
  }

  private updatePowerUps(dt: number): void {
    const s = this.state;
    const now = performance.now() / 1000;

    s.activePowerUps = s.activePowerUps.filter((p) => {
      if (p.expiresAt <= now) {
        if (p.type === 'bigPaddle' && p.owner === 'player') s.playerPaddleHeight = BASE_PADDLE_HEIGHT;
        if (p.type === 'bigPaddle' && p.owner === 'cpu') s.cpuPaddleHeight = BASE_PADDLE_HEIGHT;
        if (p.type === 'slowMo') s.slowMoFactor = 1;
        if (p.type === 'ghost' && p.owner === 'player') s.ball.ghost = false;
        return false;
      }
      return true;
    });

    for (let i = s.powerUps.length - 1; i >= 0; i--) {
      const pu = s.powerUps[i];
      pu.y += pu.vy * dt;
      if (pu.y > this.height + 30) {
        s.powerUps.splice(i, 1);
        continue;
      }

      const playerX = PADDLE_MARGIN;
      const playerHit =
        pu.x > playerX &&
        pu.x < playerX + PADDLE_WIDTH + 30 &&
        pu.y > s.playerY &&
        pu.y < s.playerY + s.playerPaddleHeight;

      if (playerHit) {
        this.applyPowerUp(pu.type, 'player');
        this.powerUpsCollectedThisMatch++;
        s.powerUps.splice(i, 1);
      }
    }
  }

  private updatePlayer(dt: number): void {
    const s = this.state;
    const config = DIFFICULTIES[this.getEffectiveDifficulty()];
    let dy = 0;

    if (this.touchTargetY !== null) {
      const target = this.touchTargetY - s.playerPaddleHeight / 2;
      const diff = target - s.playerY;
      const speed = PADDLE_SPEED * (this.hasPowerUp('speedBoost', 'player') ? 1.45 : 1);
      dy = this.clamp(diff, -speed * dt, speed * dt);
    } else {
      if (this.keys.up) dy -= PADDLE_SPEED * dt;
      if (this.keys.down) dy += PADDLE_SPEED * dt;
    }

    if (config.playerAssist > 0 && !s.serving && s.ball.vx < 0) {
      const paddleCenter = s.playerY + s.playerPaddleHeight / 2;
      const diff = s.ball.y - paddleCenter;
      dy += diff * config.playerAssist * dt * 3;
    }

    if (this.hasPowerUp('magnet', 'player') && s.ball.vx < 0 && Math.abs(s.ball.x - PADDLE_MARGIN) < 120) {
      const paddleCenter = s.playerY + s.playerPaddleHeight / 2;
      dy += (s.ball.y - paddleCenter) * 2.5 * dt;
    }

    s.playerY = this.clamp(s.playerY + dy, 0, this.height - s.playerPaddleHeight);
  }

  private collidePaddle(paddleY: number, paddleH: number, paddleX: number, isPlayer: boolean): void {
    const ball = this.state.ball;
    const nextX = ball.x + ball.vx * 0.016;
    const withinY = ball.y + ball.radius > paddleY && ball.y - ball.radius < paddleY + paddleH;

    const hitLeft = isPlayer && ball.vx < 0 && nextX - ball.radius <= paddleX + PADDLE_WIDTH && ball.x - ball.radius >= paddleX - 8;
    const hitRight = !isPlayer && ball.vx > 0 && nextX + ball.radius >= paddleX && ball.x + ball.radius <= paddleX + PADDLE_WIDTH + 8;

    if (!withinY || (!hitLeft && !hitRight)) return;

    const config = DIFFICULTIES[this.getEffectiveDifficulty()];
    const paddleCenter = paddleY + paddleH / 2;
    const relativeIntersect = (ball.y - paddleCenter) / (paddleH / 2);
    const maxAngle = this.hasPowerUp('fireball', isPlayer ? 'player' : 'cpu') ? Math.PI / 2.2 : Math.PI / 3;
    const bounceAngle = relativeIntersect * maxAngle;
    const speed = Math.min(Math.hypot(ball.vx, ball.vy) * config.speedBoost + 14, config.maxSpeed);
    const direction = isPlayer ? 1 : -1;

    ball.vx = Math.cos(bounceAngle) * speed * direction;
    ball.vy = Math.sin(bounceAngle) * speed;

    if (isPlayer) {
      ball.x = paddleX + PADDLE_WIDTH + ball.radius + 1;
    } else {
      ball.x = paddleX - ball.radius - 1;
    }

    this.state.rallyCount++;
    this.state.combo++;
    if (this.state.combo > this.state.maxCombo) this.state.maxCombo = this.state.combo;
    if (this.state.rallyCount > this.stats.longestRally) {
      this.stats.longestRally = this.state.rallyCount;
      this.onStatsChange?.(this.stats);
    }

    if (this.state.combo >= 3 && this.state.combo % 3 === 0) {
      audio.play('combo');
      this.state.message = `${this.state.combo}x COMBO!`;
      this.state.messageTimer = 0.8;
    } else {
      audio.play('hit');
    }

    this.state.screenShake = 4;
    spawnBurst(this.state.particles, ball.x, ball.y, isPlayer ? '#58a6ff' : '#bf0a30', 8, 140);
    void this.haptic(ImpactStyle.Light);

    if (this.state.rallyCount >= 10) this.tryAchievement('rally_10');
    if (this.state.rallyCount >= 25) this.tryAchievement('rally_25');
  }

  private updateBall(dt: number): void {
    const s = this.state;
    if (s.serving) {
      s.serveTimer -= dt;
      if (s.serveTimer <= 0) this.serve();
      return;
    }

    const ball = s.ball;
    const effectiveDt = dt / s.slowMoFactor;

    ball.trail.push({ x: ball.x, y: ball.y });
    if (ball.trail.length > 12) ball.trail.shift();

    if (this.hasPowerUp('fireball', 'player') && ball.vx > 0) {
      spawnTrail(s.particles, ball.x, ball.y, '#ff7b72');
    }

    ball.x += ball.vx * effectiveDt;
    ball.y += ball.vy * effectiveDt;

    if (ball.y - ball.radius <= 0) {
      ball.y = ball.radius;
      ball.vy = Math.abs(ball.vy);
    } else if (ball.y + ball.radius >= this.height) {
      ball.y = this.height - ball.radius;
      ball.vy = -Math.abs(ball.vy);
    }

    this.collidePaddle(s.playerY, s.playerPaddleHeight, PADDLE_MARGIN, true);
    this.collidePaddle(s.cpuY, s.cpuPaddleHeight, this.width - PADDLE_MARGIN - PADDLE_WIDTH, false);

    if (ball.x - ball.radius < 0) {
      if (this.hasPowerUp('shield', 'player') && s.shieldHits < 1) {
        s.shieldHits++;
        ball.vx = Math.abs(ball.vx);
        ball.x = ball.radius + 2;
        audio.play('shield');
        s.message = 'SHIELD SAVED YOU!';
        s.messageTimer = 1;
        spawnBurst(s.particles, PADDLE_MARGIN, ball.y, '#79c0ff', 20, 160);
        return;
      }

      this.scorePoint('cpu');
    } else if (ball.x + ball.radius > this.width) {
      this.scorePoint('player');
    }
  }

  private scorePoint(scorer: 'player' | 'cpu'): void {
    const s = this.state;
    s.combo = 0;

    if (scorer === 'player') {
      s.playerScore++;
      this.stats.totalPoints++;
      audio.play('score');
      void this.haptic(ImpactStyle.Medium);
      this.resetBall(-1);
    } else {
      s.cpuScore++;
      audio.play('hit');
      if (s.playerScore <= 2 && s.cpuScore >= 5) this.wasDown52 = true;
      this.resetBall(1);
    }

    if (s.mode === 'survival') {
      if (scorer === 'cpu') {
        this.endGame(false);
        return;
      }
      s.message = `${Math.floor(s.survivalTime)}s survived`;
      s.messageTimer = 1;
      return;
    }

    this.checkWin();
  }

  private checkWin(): void {
    const s = this.state;
    if (s.playerScore >= s.winScore) {
      this.endGame(true);
    } else if (s.cpuScore >= s.winScore) {
      this.endGame(false);
    }
  }

  private endGame(playerWon: boolean): void {
    const s = this.state;
    this.stats.gamesPlayed++;

    if (playerWon) {
      this.stats.gamesWon++;
      this.stats.currentStreak++;
      if (this.stats.currentStreak > this.stats.bestStreak) this.stats.bestStreak = this.stats.currentStreak;
      audio.play('win');
      void this.hapticNotification(NotificationType.Success);

      this.tryAchievement('first_win');
      if (this.stats.currentStreak >= 3) this.tryAchievement('streak_3');
      if (this.stats.currentStreak >= 5) this.tryAchievement('streak_5');
      if (this.wasDown52) this.tryAchievement('comeback');
      if (s.cpuScore === 0) this.tryAchievement('shutout');
      if (this.powerUpsCollectedThisMatch >= 10) this.tryAchievement('power_collector');

      if (s.mode === 'campaign') {
        if (s.campaignLevel >= this.stats.campaignProgress) {
          this.stats.campaignProgress = s.campaignLevel + 1;
        }
        if (s.campaignLevel >= CAMPAIGN_BOSSES.length - 1) {
          s.phase = 'victory';
          this.tryAchievement('campaign_complete');
        } else {
          s.phase = 'levelComplete';
        }
      } else {
        s.phase = 'gameOver';
      }
      s.message = 'VICTORY!';
    } else {
      this.stats.currentStreak = 0;
      audio.play('lose');
      void this.hapticNotification(NotificationType.Error);
      s.phase = 'gameOver';
      s.message = 'DEFEAT';
    }

    s.messageTimer = 5;
    this.onStatsChange?.(this.stats);
  }

  private tryAchievement(id: string): void {
    if (unlockAchievement(this.stats, id)) {
      const info = ACHIEVEMENTS[id];
      if (info) {
        this.state.message = `🏆 ${info.label}`;
        this.state.messageTimer = 2.5;
        this.onAchievement?.(id);
      }
    }
  }

  private async haptic(style: ImpactStyle): Promise<void> {
    try {
      await Haptics.impact({ style });
    } catch {
      /* web fallback */
    }
  }

  private async hapticNotification(type: NotificationType): Promise<void> {
    try {
      await Haptics.notification({ type });
    } catch {
      /* web fallback */
    }
  }

  tick(timestamp: number): void {
    const s = this.state;
    if (s.lastTime === 0) s.lastTime = timestamp;
    let dt = Math.min((timestamp - s.lastTime) / 1000, 0.032);
    s.lastTime = timestamp;

    if (s.messageTimer > 0) s.messageTimer -= dt;

    if (s.phase !== 'playing') return;

    if (s.mode === 'survival') {
      s.survivalTime += dt;
      if (s.survivalTime >= 60) this.tryAchievement('survival_60');
    }

    s.screenShake = Math.max(0, s.screenShake - dt * 20);

    this.updatePlayer(dt);
    s.cpuY = this.ai.update(
      s.cpuY,
      s.cpuPaddleHeight,
      s.ball,
      this.height,
      this.getEffectiveDifficulty(),
      dt,
      !s.serving && s.ball.vx > 0,
    );

    this.updateBall(dt);
    this.spawnPowerUp();
    this.updatePowerUps(dt);
    updateParticles(s.particles, dt);
  }

  getPaddleWidth(): number {
    return PADDLE_WIDTH;
  }

  getPaddleMargin(): number {
    return PADDLE_MARGIN;
  }
}
