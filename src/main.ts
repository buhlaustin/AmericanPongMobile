import { App } from '@capacitor/app';
import { SplashScreen } from '@capacitor/splash-screen';
import { StatusBar, Style } from '@capacitor/status-bar';
import './styles/main.css';
import { GameEngine } from './game/engine';
import { Renderer } from './game/renderer';
import { DIFFICULTIES, MODE_INFO, type Difficulty, type GameMode } from './game/constants';
import { ACHIEVEMENTS, loadStats, saveStats } from './game/storage';
import { audio } from './game/audio';

async function initCapacitor(engine: GameEngine): Promise<void> {
  try {
    await StatusBar.setStyle({ style: Style.Dark });
    await StatusBar.setBackgroundColor({ color: '#0a1628' });
    await SplashScreen.hide();
  } catch {
    /* web dev */
  }

  try {
    App.addListener('backButton', () => {
      if (engine.state.phase === 'playing') engine.pause();
      else if (engine.state.phase === 'paused') engine.showMenu();
      else if (engine.state.phase !== 'menu') engine.showMenu();
    });
  } catch {
    /* web dev */
  }
}

const app = document.getElementById('app')!;
app.innerHTML = `
  <div id="game-shell">
    <canvas id="game-canvas" aria-label="American Pong"></canvas>
    <div id="touch-zones"><div id="touch-left"></div></div>
    <div id="achievement-toast"></div>
  </div>
`;

const canvas = document.getElementById('game-canvas') as HTMLCanvasElement;
const touchLeft = document.getElementById('touch-left')!;
const toast = document.getElementById('achievement-toast')!;

async function bootstrap(): Promise<void> {
const stats = await loadStats();
const engine = new GameEngine(stats);
const renderer = new Renderer(canvas, engine);

engine.onStatsChange = (s) => void saveStats(s);
engine.onAchievement = (id) => {
  const info = ACHIEVEMENTS[id];
  if (!info) return;
  toast.textContent = `🏆 ${info.label}: ${info.description}`;
  toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'), 3000);
  void saveStats(engine.stats);
};

function getCanvasCoords(clientX: number, clientY: number): { x: number; y: number } {
  const rect = canvas.getBoundingClientRect();
  return {
    x: clientX - rect.left,
    y: clientY - rect.top,
  };
}

function handleMenuTap(x: number, y: number): void {
  const w = canvas.getBoundingClientRect().width;
  const h = canvas.getBoundingClientRect().height;
  const phase = engine.state.phase;

  if (phase === 'menu') {
    if (hitBtn(x, y, w, h, w / 2, h * 0.48)) engine.showModeSelect();
    else if (hitBtn(x, y, w, h, w / 2, h * 0.58)) engine.showDifficultySelect('campaign');
    else if (hitBtn(x, y, w, h, w / 2, h * 0.68)) showStatsAlert();
    return;
  }

  if (phase === 'modeSelect') {
    const modes = (Object.keys(MODE_INFO) as GameMode[]).filter((m) => m !== 'campaign');
    modes.forEach((mode, i) => {
      if (hitBtn(x, y, w, h, w / 2, h * (0.28 + i * 0.14))) {
        engine.showDifficultySelect(mode);
      }
    });
    if (hitBtn(x, y, w, h, w / 2, h * 0.82)) engine.showMenu();
    return;
  }

  if (phase === 'difficultySelect') {
    const diffs = Object.keys(DIFFICULTIES) as Difficulty[];
    diffs.forEach((d, i) => {
      if (hitBtn(x, y, w, h, w / 2, h * (0.22 + i * 0.11))) engine.setDifficulty(d);
    });
    if (hitBtn(x, y, w, h, w / 2, h * 0.82)) engine.startMatch();
    if (hitBtn(x, y, w, h, w / 2, h * 0.9)) engine.showModeSelect();
    return;
  }

  if (phase === 'paused') {
    if (hitBtn(x, y, w, h, w / 2, h * 0.5)) engine.resume();
    if (hitBtn(x, y, w, h, w / 2, h * 0.62)) engine.restart();
    if (hitBtn(x, y, w, h, w / 2, h * 0.74)) engine.showMenu();
    return;
  }

  if (phase === 'gameOver' || phase === 'victory') {
    if (hitBtn(x, y, w, h, w / 2, h * 0.58)) engine.restart();
    if (hitBtn(x, y, w, h, w / 2, h * 0.7)) engine.showMenu();
    return;
  }

  if (phase === 'levelComplete') {
    if (hitBtn(x, y, w, h, w / 2, h * 0.55)) engine.startCampaignLevel(engine.state.campaignLevel + 1);
    if (hitBtn(x, y, w, h, w / 2, h * 0.67)) engine.showMenu();
  }
}

function hitBtn(x: number, y: number, w: number, _h: number, cx: number, cy: number): boolean {
  const bw = Math.min(280, w - 48);
  const bh = 48;
  return x >= cx - bw / 2 && x <= cx + bw / 2 && y >= cy - bh / 2 && y <= cy + bh / 2;
}

function showStatsAlert(): void {
  const s = engine.stats;
  const achText = s.achievements.length
    ? s.achievements.map((id) => ACHIEVEMENTS[id]?.label ?? id).join(', ')
    : 'None yet';
  alert(
    `📊 Stats\n\nGames: ${s.gamesPlayed}\nWins: ${s.gamesWon}\nBest Streak: ${s.bestStreak}\nLongest Rally: ${s.longestRally}\nCampaign: Level ${s.campaignProgress + 1}\n\nAchievements: ${achText}`,
  );
}

canvas.addEventListener('click', (e) => {
  const { x, y } = getCanvasCoords(e.clientX, e.clientY);
  audio.play('menu');

  if (engine.state.phase === 'playing' && engine.state.serving && !engine.state.autoServe) {
    engine.serve();
    return;
  }

  if (engine.state.phase === 'playing') {
    if (x > canvas.getBoundingClientRect().width * 0.85) engine.pause();
    return;
  }

  handleMenuTap(x, y);
});

canvas.addEventListener('touchstart', (e) => {
  if (engine.state.phase !== 'playing') {
    const touch = e.touches[0];
    if (touch) {
      const { x, y } = getCanvasCoords(touch.clientX, touch.clientY);
      handleMenuTap(x, y);
    }
    return;
  }
  e.preventDefault();
}, { passive: false });

touchLeft.addEventListener('touchmove', (e) => {
  if (engine.state.phase !== 'playing') return;
  e.preventDefault();
  const touch = e.touches[0];
  if (!touch) return;
  const rect = canvas.getBoundingClientRect();
  const y = touch.clientY - rect.top;
  engine.setTouchTarget(y);
}, { passive: false });

touchLeft.addEventListener('touchstart', (e) => {
  if (engine.state.phase !== 'playing') return;
  e.preventDefault();
  const touch = e.touches[0];
  if (!touch) return;
  const rect = canvas.getBoundingClientRect();
  engine.setTouchTarget(touch.clientY - rect.top);
}, { passive: false });

touchLeft.addEventListener('touchend', () => engine.setTouchTarget(null));

document.addEventListener('keydown', (e) => {
  if (e.code === 'KeyW' || e.code === 'ArrowUp') engine.keys.up = true;
  if (e.code === 'KeyS' || e.code === 'ArrowDown') engine.keys.down = true;
  if (e.code === 'Space' || e.code === 'KeyP' || e.code === 'Escape') {
    if (engine.state.phase === 'playing') engine.pause();
    else if (engine.state.phase === 'paused') engine.resume();
    else if (engine.state.phase !== 'menu') engine.showMenu();
  }
  if (e.code === 'Enter' && engine.state.phase === 'playing') engine.serve();
});

document.addEventListener('keyup', (e) => {
  if (e.code === 'KeyW' || e.code === 'ArrowUp') engine.keys.up = false;
  if (e.code === 'KeyS' || e.code === 'ArrowDown') engine.keys.down = false;
});

function loop(ts: number): void {
  engine.tick(ts);
  renderer.render(engine.stats);
  requestAnimationFrame(loop);
}

await initCapacitor(engine);
requestAnimationFrame(loop);
}

void bootstrap();
