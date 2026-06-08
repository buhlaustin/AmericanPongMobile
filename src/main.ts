import { App } from '@capacitor/app';
import { SplashScreen } from '@capacitor/splash-screen';
import { StatusBar, Style } from '@capacitor/status-bar';
import './styles/main.css';
import { GameEngine } from './game/engine';
import { Renderer } from './game/renderer';
import { loadStats, saveStats, ACHIEVEMENTS } from './game/storage';
import { hideSplashScreen } from './splash';
import { MobileUI } from './ui/mobile-ui';

async function initCapacitor(engine: GameEngine, mobileUI: MobileUI): Promise<void> {
  try {
    await StatusBar.setStyle({ style: Style.Dark });
    await StatusBar.setBackgroundColor({ color: '#0a1628' });
  } catch {
    /* web dev */
  }

  try {
    App.addListener('backButton', () => {
      if (mobileUI.handleBack()) return;
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
    <canvas id="game-canvas" aria-label="American Pong game board"></canvas>
    <div id="achievement-toast"></div>
  </div>
`;

const shell = document.getElementById('game-shell')!;
const canvas = document.getElementById('game-canvas') as HTMLCanvasElement;
const toast = document.getElementById('achievement-toast')!;

async function bootstrap(): Promise<void> {
  const stats = await loadStats();
  const engine = new GameEngine(stats);
  const renderer = new Renderer(canvas, engine);
  const mobileUI = new MobileUI(shell, engine);

  mobileUI.mount();

  engine.onStatsChange = (s) => void saveStats(s);
  engine.onAchievement = (id) => {
    const info = ACHIEVEMENTS[id];
    if (!info) return;
    toast.textContent = `🏆 ${info.label}: ${info.description}`;
    toast.classList.add('show');
    setTimeout(() => toast.classList.remove('show'), 3000);
    void saveStats(engine.stats);
  };

  function loop(ts: number): void {
    engine.tick(ts);
    renderer.render(engine.stats);
    mobileUI.sync();
    requestAnimationFrame(loop);
  }

  await initCapacitor(engine, mobileUI);
  await hideSplashScreen();
  try {
    await SplashScreen.hide();
  } catch {
    /* web dev */
  }
  requestAnimationFrame(loop);
}

void bootstrap();
