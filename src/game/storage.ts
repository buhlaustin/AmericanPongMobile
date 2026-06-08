import { Preferences } from '@capacitor/preferences';
import type { GameStats } from './types';

const STATS_KEY = 'american_pong_stats';

const DEFAULT_STATS: GameStats = {
  gamesPlayed: 0,
  gamesWon: 0,
  bestStreak: 0,
  currentStreak: 0,
  longestRally: 0,
  totalPoints: 0,
  campaignProgress: 0,
  achievements: [],
};

export async function loadStats(): Promise<GameStats> {
  try {
    const { value } = await Preferences.get({ key: STATS_KEY });
    if (!value) return { ...DEFAULT_STATS };
    return { ...DEFAULT_STATS, ...JSON.parse(value) };
  } catch {
    const raw = localStorage.getItem(STATS_KEY);
    if (!raw) return { ...DEFAULT_STATS };
    return { ...DEFAULT_STATS, ...JSON.parse(raw) };
  }
}

export async function saveStats(stats: GameStats): Promise<void> {
  const data = JSON.stringify(stats);
  try {
    await Preferences.set({ key: STATS_KEY, value: data });
  } catch {
    localStorage.setItem(STATS_KEY, data);
  }
}

export function unlockAchievement(stats: GameStats, id: string): boolean {
  if (stats.achievements.includes(id)) return false;
  stats.achievements.push(id);
  return true;
}

export const ACHIEVEMENTS: Record<string, { label: string; description: string }> = {
  first_win: { label: 'First Victory', description: 'Win your first match' },
  streak_3: { label: 'Hot Streak', description: 'Win 3 matches in a row' },
  streak_5: { label: 'On Fire', description: 'Win 5 matches in a row' },
  rally_10: { label: 'Rally Master', description: 'Hit a 10-shot rally' },
  rally_25: { label: 'Ping Pong Pro', description: 'Hit a 25-shot rally' },
  shutout: { label: 'Shutout', description: 'Win without letting CPU score' },
  campaign_complete: { label: 'American Legend', description: 'Beat the campaign' },
  survival_60: { label: 'Survivor', description: 'Survive 60 seconds' },
  power_collector: { label: 'Power Player', description: 'Collect 10 power-ups in one match' },
  comeback: { label: 'Comeback Kid', description: 'Win after being down 5-2' },
};
