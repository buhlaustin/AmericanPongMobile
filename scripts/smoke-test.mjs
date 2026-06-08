import { chromium } from 'playwright';

const baseUrl = process.env.TEST_URL || 'http://127.0.0.1:4173';

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({
  viewport: { width: 844, height: 390 },
  hasTouch: true,
});
const page = await context.newPage();

try {
  await page.goto(baseUrl, { waitUntil: 'networkidle' });
  await page.locator('#splash-screen').waitFor({ state: 'hidden', timeout: 6000 });

  await page.getByRole('button', { name: 'Play' }).click();
  await page.getByRole('button', { name: 'Classic' }).click();
  await page.getByRole('button', { name: 'Start Match' }).click();

  await page.locator('#touch-play-zone.serving').waitFor({ state: 'visible', timeout: 3000 });

  await page.waitForFunction(() => {
    const engine = window.__gameEngine;
    return Boolean(engine?.state.serving && engine.state.phase === 'playing');
  });

  const box = await page.locator('#game-canvas').boundingBox();
  if (!box) throw new Error('Canvas missing');

  await page.touchscreen.tap(box.x + box.width * 0.5, box.y + box.height * 0.5);

  await page.waitForFunction(() => {
    const engine = window.__gameEngine;
    return Boolean(
      engine &&
        engine.state.phase === 'playing' &&
        !engine.state.serving &&
        Math.hypot(engine.state.ball.vx, engine.state.ball.vy) > 50,
    );
  }, { timeout: 2000 });

  await page.waitForTimeout(600);

  const afterServe = await page.evaluate(() => {
    const engine = window.__gameEngine;
    return {
      serving: engine?.state.serving,
      vx: engine?.state.ball.vx ?? 0,
      vy: engine?.state.ball.vy ?? 0,
      x: engine?.state.ball.x ?? 0,
    };
  });

  if (afterServe.serving) {
    throw new Error(`Ball returned to serving state after tap: ${JSON.stringify(afterServe)}`);
  }
  if (Math.hypot(afterServe.vx, afterServe.vy) < 50) {
    throw new Error(`Ball did not launch: ${JSON.stringify(afterServe)}`);
  }

  await page.touchscreen.tap(box.x + box.width * 0.18, box.y + box.height * 0.5);
  await page.touchscreen.tap(box.x + box.width * 0.18, box.y + box.height * 0.72);

  console.log('SMOKE TEST PASSED', afterServe);
} finally {
  await context.close();
  await browser.close();
}
