import { SplashScreen } from '@capacitor/splash-screen';

const SPLASH_MIN_MS = 2400;
export const splashStartTime = performance.now();

export async function revealWebSplash(): Promise<void> {
  try {
    await SplashScreen.hide();
  } catch {
    /* web dev */
  }
}

export function hideSplashScreen(): Promise<void> {
  return new Promise((resolve) => {
    const splash = document.getElementById('splash-screen');
    if (!splash) {
      resolve();
      return;
    }

    const elapsed = performance.now() - splashStartTime;
    const remaining = Math.max(0, SPLASH_MIN_MS - elapsed);

    window.setTimeout(() => {
      splash.classList.add('hide');
      window.setTimeout(() => {
        splash.remove();
        resolve();
      }, 550);
    }, remaining);
  });
}
