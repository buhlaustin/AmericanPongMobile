import type { Difficulty, GameMode, PowerUpType } from './constants';

export interface Vec2 {
  x: number;
  y: number;
}

export interface Ball {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  ghost: boolean;
  trail: Vec2[];
}

export interface PowerUpEntity {
  id: number;
  type: PowerUpType;
  x: number;
  y: number;
  vy: number;
  collected: boolean;
}

export interface ActivePowerUp {
  type: PowerUpType;
  expiresAt: number;
  owner: 'player' | 'cpu';
}

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  color: string;
  size: number;
}

export interface GameStats {
  gamesPlayed: number;
  gamesWon: number;
  bestStreak: number;
  currentStreak: number;
  longestRally: number;
  totalPoints: number;
  campaignProgress: number;
  achievements: string[];
}

export type GamePhase = 'menu' | 'modeSelect' | 'difficultySelect' | 'playing' | 'paused' | 'gameOver' | 'levelComplete' | 'victory';

export interface GameState {
  phase: GamePhase;
  mode: GameMode;
  difficulty: Difficulty;
  campaignLevel: number;
  winScore: number;
  playerY: number;
  cpuY: number;
  playerPaddleHeight: number;
  cpuPaddleHeight: number;
  playerScore: number;
  cpuScore: number;
  ball: Ball;
  serving: boolean;
  serveDirection: number;
  serveTimer: number;
  rallyCount: number;
  survivalTime: number;
  combo: number;
  maxCombo: number;
  shieldHits: number;
  powerUps: PowerUpEntity[];
  activePowerUps: ActivePowerUp[];
  particles: Particle[];
  screenShake: number;
  slowMoFactor: number;
  lastTime: number;
  autoServe: boolean;
  message: string;
  messageTimer: number;
}
