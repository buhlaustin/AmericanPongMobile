export const WIN_SCORE = 7;
export const CAMPAIGN_LEVELS = 12;

export type Difficulty = 'rookie' | 'easy' | 'normal' | 'hard' | 'legend';
export type GameMode = 'classic' | 'arcade' | 'survival' | 'campaign';
export type PowerUpType = 'bigPaddle' | 'speedBoost' | 'slowMo' | 'magnet' | 'shield' | 'fireball' | 'ghost';

export interface DifficultyConfig {
  label: string;
  description: string;
  cpuSpeed: number;
  cpuDeadzone: number;
  cpuReactionDelay: number;
  cpuMissChance: number;
  initialSpeed: number;
  maxSpeed: number;
  speedBoost: number;
  playerAssist: number;
  powerUpBias: number;
}

export const DIFFICULTIES: Record<Difficulty, DifficultyConfig> = {
  rookie: {
    label: 'Rookie',
    description: 'Generous paddle assist, CPU stumbles often',
    cpuSpeed: 160,
    cpuDeadzone: 28,
    cpuReactionDelay: 0.18,
    cpuMissChance: 0.22,
    initialSpeed: 280,
    maxSpeed: 520,
    speedBoost: 1.01,
    playerAssist: 0.35,
    powerUpBias: 0.75,
  },
  easy: {
    label: 'Easy',
    description: 'Forgiving returns and friendly power-ups',
    cpuSpeed: 220,
    cpuDeadzone: 20,
    cpuReactionDelay: 0.12,
    cpuMissChance: 0.14,
    initialSpeed: 320,
    maxSpeed: 600,
    speedBoost: 1.02,
    playerAssist: 0.22,
    powerUpBias: 0.65,
  },
  normal: {
    label: 'Normal',
    description: 'Balanced classic pong action',
    cpuSpeed: 340,
    cpuDeadzone: 10,
    cpuReactionDelay: 0.06,
    cpuMissChance: 0.06,
    initialSpeed: 380,
    maxSpeed: 720,
    speedBoost: 1.04,
    playerAssist: 0.1,
    powerUpBias: 0.55,
  },
  hard: {
    label: 'Hard',
    description: 'Fast CPU with sharp angles',
    cpuSpeed: 460,
    cpuDeadzone: 5,
    cpuReactionDelay: 0.03,
    cpuMissChance: 0.02,
    initialSpeed: 420,
    maxSpeed: 820,
    speedBoost: 1.06,
    playerAssist: 0.04,
    powerUpBias: 0.45,
  },
  legend: {
    label: 'Legend',
    description: 'For pong masters only',
    cpuSpeed: 540,
    cpuDeadzone: 2,
    cpuReactionDelay: 0.01,
    cpuMissChance: 0.005,
    initialSpeed: 460,
    maxSpeed: 900,
    speedBoost: 1.08,
    playerAssist: 0,
    powerUpBias: 0.4,
  },
};

export const POWER_UP_CONFIG: Record<PowerUpType, { label: string; color: string; duration: number }> = {
  bigPaddle: { label: 'BIG PADDLE', color: '#3fb950', duration: 8 },
  speedBoost: { label: 'SPEED BOOST', color: '#f0883e', duration: 6 },
  slowMo: { label: 'SLOW-MO', color: '#a371f7', duration: 5 },
  magnet: { label: 'MAGNET', color: '#58a6ff', duration: 7 },
  shield: { label: 'SHIELD', color: '#79c0ff', duration: 10 },
  fireball: { label: 'FIREBALL', color: '#ff7b72', duration: 4 },
  ghost: { label: 'GHOST BALL', color: '#d2a8ff', duration: 5 },
};

export const MODE_INFO: Record<GameMode, { label: string; description: string }> = {
  classic: { label: 'Classic', description: 'First to 7. Pure pong perfection.' },
  arcade: { label: 'Arcade', description: 'Power-ups rain down. Chaos ensues.' },
  survival: { label: 'Survival', description: 'One life. How long can you rally?' },
  campaign: { label: 'Campaign', description: '12 patriotic levels. Earn your stripes.' },
};

export const CAMPAIGN_BOSSES = [
  { name: 'Boot Camp', winScore: 3, difficulty: 'rookie' as Difficulty },
  { name: 'Recruit Rally', winScore: 4, difficulty: 'rookie' as Difficulty },
  { name: 'Stars & Stripes', winScore: 4, difficulty: 'easy' as Difficulty },
  { name: 'Liberty Lane', winScore: 5, difficulty: 'easy' as Difficulty },
  { name: 'Eagle Eye', winScore: 5, difficulty: 'normal' as Difficulty },
  { name: 'Freedom Fighter', winScore: 6, difficulty: 'normal' as Difficulty },
  { name: 'Patriot Paddle', winScore: 6, difficulty: 'normal' as Difficulty },
  { name: 'Constitution Court', winScore: 7, difficulty: 'hard' as Difficulty },
  { name: 'Independence Day', winScore: 7, difficulty: 'hard' as Difficulty },
  { name: 'Uncle Sam', winScore: 8, difficulty: 'hard' as Difficulty },
  { name: 'Star Spangled', winScore: 9, difficulty: 'legend' as Difficulty },
  { name: 'American Legend', winScore: 10, difficulty: 'legend' as Difficulty },
];
