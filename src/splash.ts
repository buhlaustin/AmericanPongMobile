const SPLASH_MIN_MS = 2200;

export function hideSplashScreen(): Promise<void> {
  return new Promise((resolve) => {
    const splash = document.getElementById('splash-screen');
    if (!splash) {
      resolve();
      return;
    }

    const started = performance.now();
    const elapsed = () => performance.now() - started;
    const remaining = Math.max(0, SPLASH_MIN_MS - elapsed());

    window.setTimeout(() => {
      splash.classList.add('hide');
      window.setTimeout(() => {
        splash.remove();
        resolve();
      }, 600);
    }, remaining);
  });
}
