import { CAMPAIGN_BOSSES, DIFFICULTIES, MODE_INFO, type Difficulty, type GameMode } from '../game/constants';
import type { GameEngine } from '../game/engine';
import { ACHIEVEMENTS } from '../game/storage';
import { audio } from '../game/audio';

export class MobileUI {
  private menuScreen!: HTMLElement;
  private modeScreen!: HTMLElement;
  private difficultyScreen!: HTMLElement;
  private pauseScreen!: HTMLElement;
  private gameOverScreen!: HTMLElement;
  private levelCompleteScreen!: HTMLElement;
  private victoryScreen!: HTMLElement;
  private statsScreen!: HTMLElement;
  private gameControls!: HTMLElement;
  private btnUp!: HTMLButtonElement;
  private btnDown!: HTMLButtonElement;
  private btnServe!: HTMLButtonElement;
  private btnPause!: HTMLButtonElement;
  private gameOverTitle!: HTMLElement;
  private gameOverDetail!: HTMLElement;
  private levelCompleteTitle!: HTMLElement;
  private menuStats!: HTMLElement;
  private difficultyList!: HTMLElement;

  constructor(
    private shell: HTMLElement,
    private engine: GameEngine,
  ) {}

  mount(): void {
    this.shell.insertAdjacentHTML(
      'beforeend',
      `
      <div id="ui-layer">
        <div id="menu-screen" class="screen">
          <div class="screen-card">
            <h1 class="screen-title">American Pong</h1>
            <p class="screen-subtitle">The ultimate patriotic paddle experience</p>
            <p id="menu-stats" class="screen-meta"></p>
            <div class="screen-actions">
              <button class="btn btn-primary" data-action="play">Play</button>
              <button class="btn" data-action="campaign">Campaign</button>
              <button class="btn" data-action="stats">Stats</button>
            </div>
            <p class="screen-credit">by Austin Buhl · v2.0 Mobile</p>
          </div>
        </div>

        <div id="mode-screen" class="screen hidden">
          <div class="screen-card">
            <h2 class="screen-heading">Choose Mode</h2>
            <div class="screen-actions" id="mode-list"></div>
            <button class="btn" data-action="back-menu">Back</button>
          </div>
        </div>

        <div id="difficulty-screen" class="screen hidden">
          <div class="screen-card screen-card-scroll">
            <h2 class="screen-heading">Difficulty</h2>
            <div class="screen-actions" id="difficulty-list"></div>
            <button class="btn btn-primary" data-action="start-match">Start Match</button>
            <button class="btn" data-action="back-mode">Back</button>
          </div>
        </div>

        <div id="pause-screen" class="screen screen-dim hidden">
          <div class="screen-card">
            <h2 class="screen-heading">Paused</h2>
            <div class="screen-actions">
              <button class="btn btn-primary" data-action="resume">Resume</button>
              <button class="btn" data-action="restart">Restart</button>
              <button class="btn" data-action="quit">Quit to Menu</button>
            </div>
          </div>
        </div>

        <div id="gameover-screen" class="screen screen-dim hidden">
          <div class="screen-card">
            <h2 id="gameover-title" class="screen-heading">Victory!</h2>
            <p id="gameover-detail" class="screen-meta"></p>
            <div class="screen-actions">
              <button class="btn btn-primary" data-action="restart">Play Again</button>
              <button class="btn" data-action="back-menu">Menu</button>
            </div>
          </div>
        </div>

        <div id="level-screen" class="screen screen-dim hidden">
          <div class="screen-card">
            <h2 class="screen-heading">Level Complete!</h2>
            <p id="level-complete-title" class="screen-meta"></p>
            <div class="screen-actions">
              <button class="btn btn-primary" data-action="next-level">Next Level</button>
              <button class="btn" data-action="back-menu">Menu</button>
            </div>
          </div>
        </div>

        <div id="victory-screen" class="screen screen-dim hidden">
          <div class="screen-card">
            <h2 class="screen-heading victory-heading">Campaign Complete!</h2>
            <p class="screen-meta">You are an American Pong Legend!</p>
            <div class="screen-actions">
              <button class="btn btn-primary" data-action="restart">Play Again</button>
              <button class="btn" data-action="back-menu">Menu</button>
            </div>
          </div>
        </div>

        <div id="stats-screen" class="screen screen-dim hidden">
          <div class="screen-card screen-card-scroll">
            <h2 class="screen-heading">Your Stats</h2>
            <div id="stats-body" class="stats-body"></div>
            <button class="btn btn-primary" data-action="close-stats">Close</button>
          </div>
        </div>

        <div id="game-controls" class="hidden">
          <div class="control-cluster control-move">
            <button id="btn-up" class="control-btn" type="button" aria-label="Move paddle up">▲</button>
            <button id="btn-down" class="control-btn" type="button" aria-label="Move paddle down">▼</button>
          </div>
          <button id="btn-serve" class="control-btn control-serve hidden" type="button">Serve</button>
          <button id="btn-pause" class="control-btn control-pause" type="button" aria-label="Pause game">⏸</button>
        </div>
      </div>
    `,
    );

    this.menuScreen = this.q('#menu-screen');
    this.modeScreen = this.q('#mode-screen');
    this.difficultyScreen = this.q('#difficulty-screen');
    this.pauseScreen = this.q('#pause-screen');
    this.gameOverScreen = this.q('#gameover-screen');
    this.levelCompleteScreen = this.q('#level-screen');
    this.victoryScreen = this.q('#victory-screen');
    this.statsScreen = this.q('#stats-screen');
    this.gameControls = this.q('#game-controls');
    this.btnUp = this.q('#btn-up');
    this.btnDown = this.q('#btn-down');
    this.btnServe = this.q('#btn-serve');
    this.btnPause = this.q('#btn-pause');
    this.gameOverTitle = this.q('#gameover-title');
    this.gameOverDetail = this.q('#gameover-detail');
    this.levelCompleteTitle = this.q('#level-complete-title');
    this.menuStats = this.q('#menu-stats');
    this.difficultyList = this.q('#difficulty-list');

    this.buildModeList();
    this.buildDifficultyList();
    this.bindMenuActions();
    this.bindGameControls();
    this.sync();
  }

  sync(): void {
    const phase = this.engine.state.phase;
    const s = this.engine.state;

    this.toggle(this.menuScreen, phase === 'menu');
    this.toggle(this.modeScreen, phase === 'modeSelect');
    this.toggle(this.difficultyScreen, phase === 'difficultySelect');
    this.toggle(this.pauseScreen, phase === 'paused');
    this.toggle(this.gameOverScreen, phase === 'gameOver');
    this.toggle(this.levelCompleteScreen, phase === 'levelComplete');
    this.toggle(this.victoryScreen, phase === 'victory');
    this.toggle(this.gameControls, phase === 'playing');

    if (phase === 'menu') {
      const stats = this.engine.stats;
      this.menuStats.textContent = `Wins: ${stats.gamesWon} · Streak: ${stats.currentStreak} · Best Rally: ${stats.longestRally}`;
    }

    if (phase === 'difficultySelect') {
      this.difficultyList.querySelectorAll<HTMLButtonElement>('[data-difficulty]').forEach((btn) => {
        btn.classList.toggle('active', btn.dataset.difficulty === s.difficulty);
      });
    }

    if (phase === 'gameOver') {
      const won = s.message === 'VICTORY!';
      this.gameOverTitle.textContent = won ? 'Victory!' : 'Defeat';
      this.gameOverTitle.classList.toggle('win', won);
      this.gameOverTitle.classList.toggle('loss', !won);
      this.gameOverDetail.textContent = `Score ${s.playerScore} – ${s.cpuScore}${
        s.maxCombo >= 3 ? ` · Best combo ${s.maxCombo}x` : ''
      }`;
    }

    if (phase === 'levelComplete') {
      const boss = CAMPAIGN_BOSSES[s.campaignLevel];
      this.levelCompleteTitle.textContent = boss?.name ?? '';
    }

    if (phase === 'playing') {
      const showServe = s.serving;
      this.toggle(this.btnServe, showServe);
      this.btnServe.textContent = 'Serve';
      this.btnServe.classList.toggle('pulse', showServe);
    }
  }

  private buildModeList(): void {
    const list = this.q('#mode-list');
    (Object.entries(MODE_INFO) as [GameMode, { label: string; description: string }][])
      .filter(([mode]) => mode !== 'campaign')
      .forEach(([mode, info]) => {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'btn btn-option';
        btn.dataset.mode = mode;
        btn.innerHTML = `<span class="btn-label">${info.label}</span><span class="btn-desc">${info.description}</span>`;
        btn.addEventListener('click', () => {
          audio.play('menu');
          this.engine.showDifficultySelect(mode);
          this.sync();
        });
        list.appendChild(btn);
      });
  }

  private buildDifficultyList(): void {
    (Object.entries(DIFFICULTIES) as [Difficulty, { label: string; description: string }][]).forEach(([key, cfg]) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'btn btn-option';
      btn.dataset.difficulty = key;
      btn.innerHTML = `<span class="btn-label">${cfg.label}</span><span class="btn-desc">${cfg.description}</span>`;
      btn.addEventListener('click', () => {
        audio.play('menu');
        this.engine.setDifficulty(key);
        this.sync();
      });
      this.difficultyList.appendChild(btn);
    });
  }

  private bindMenuActions(): void {
    this.shell.addEventListener('click', (e) => {
      const target = (e.target as HTMLElement).closest<HTMLElement>('[data-action]');
      if (!target) return;

      audio.play('menu');
      const action = target.dataset.action;

      switch (action) {
        case 'play':
          this.engine.showModeSelect();
          break;
        case 'campaign':
          this.engine.showDifficultySelect('campaign');
          break;
        case 'stats':
          this.showStats();
          return;
        case 'back-menu':
          this.engine.showMenu();
          break;
        case 'back-mode':
          this.engine.showModeSelect();
          break;
        case 'start-match':
          this.engine.startMatch();
          break;
        case 'resume':
          this.engine.resume();
          break;
        case 'restart':
          this.engine.restart();
          break;
        case 'quit':
          this.engine.showMenu();
          break;
        case 'next-level':
          this.engine.startCampaignLevel(this.engine.state.campaignLevel + 1);
          break;
        case 'close-stats':
          this.statsScreen.classList.add('hidden');
          return;
      }

      this.statsScreen.classList.add('hidden');
      this.sync();
    });
  }

  private bindGameControls(): void {
    const press = (dir: 'up' | 'down', active: boolean) => {
      this.engine.keys[dir] = active;
    };

    this.holdButton(this.btnUp, () => press('up', true), () => press('up', false));
    this.holdButton(this.btnDown, () => press('down', true), () => press('down', false));

    this.btnServe.addEventListener('click', (e) => {
      e.stopPropagation();
      if (this.engine.state.phase === 'playing' && this.engine.state.serving) {
        this.engine.serve();
        this.sync();
      }
    });

    this.btnPause.addEventListener('click', (e) => {
      e.stopPropagation();
      if (this.engine.state.phase === 'playing') {
        this.engine.pause();
        this.sync();
      }
    });
  }

  private holdButton(btn: HTMLButtonElement, onPress: () => void, onRelease: () => void): void {
    const start = (e: Event) => {
      e.preventDefault();
      e.stopPropagation();
      btn.classList.add('pressed');
      onPress();
    };
    const end = (e: Event) => {
      e.preventDefault();
      btn.classList.remove('pressed');
      onRelease();
    };

    btn.addEventListener('touchstart', start, { passive: false });
    btn.addEventListener('touchend', end, { passive: false });
    btn.addEventListener('touchcancel', end, { passive: false });
    btn.addEventListener('mousedown', start);
    btn.addEventListener('mouseup', end);
    btn.addEventListener('mouseleave', end);
  }

  private showStats(): void {
    const s = this.engine.stats;
    const body = this.q('#stats-body');
    const achievements = s.achievements.length
      ? s.achievements.map((id) => ACHIEVEMENTS[id]?.label ?? id).join(', ')
      : 'None yet';

    body.innerHTML = `
      <p><strong>Games played</strong><span>${s.gamesPlayed}</span></p>
      <p><strong>Wins</strong><span>${s.gamesWon}</span></p>
      <p><strong>Best streak</strong><span>${s.bestStreak}</span></p>
      <p><strong>Longest rally</strong><span>${s.longestRally}</span></p>
      <p><strong>Campaign</strong><span>Level ${s.campaignProgress + 1}</span></p>
      <p class="stats-achievements"><strong>Achievements</strong><span>${achievements}</span></p>
    `;
    this.statsScreen.classList.remove('hidden');
  }

  private q<T extends HTMLElement>(selector: string): T {
    const el = this.shell.querySelector(selector);
    if (!el) throw new Error(`Missing element: ${selector}`);
    return el as T;
  }

  handleBack(): boolean {
    if (!this.statsScreen.classList.contains('hidden')) {
      this.statsScreen.classList.add('hidden');
      return true;
    }
    return false;
  }

  private toggle(el: HTMLElement, show: boolean): void {
    el.classList.toggle('hidden', !show);
  }
}
