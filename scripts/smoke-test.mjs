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

  const splash = page.locator('#splash-screen');
  await splash.waitFor({ state: 'visible', timeout: 3000 });
  const splashText = await splash.innerText();
  const normalized = splashText.toLowerCase();
  if (!normalized.includes('austin buhl') || !normalized.includes('games')) {
    throw new Error(`Splash text missing: ${splashText}`);
  }

  await splash.waitFor({ state: 'hidden', timeout: 6000 });

  await page.getByRole('button', { name: 'Play' }).click();
  await page.getByRole('heading', { name: 'Choose Mode' }).waitFor();

  await page.getByRole('button', { name: 'Classic' }).click();
  await page.getByRole('button', { name: 'Start Match' }).click();

  const touchZone = page.locator('#touch-play-zone');
  await touchZone.waitFor({ state: 'visible', timeout: 3000 });
  await page.locator('#btn-pause').waitFor({ state: 'visible' });

  const serveBtn = page.locator('#btn-serve');
  if (await serveBtn.count()) {
    throw new Error('Serve button should be removed');
  }

  const box = await page.locator('#game-canvas').boundingBox();
  if (!box) throw new Error('Canvas missing');

  await page.touchscreen.tap(box.x + box.width * 0.25, box.y + box.height * 0.5);
  await page.touchscreen.tap(box.x + box.width * 0.5, box.y + box.height * 0.5);

  console.log('SMOKE TEST PASSED');
} finally {
  await context.close();
  await browser.close();
}
