import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.buhlaustin.americanpong',
  appName: 'American Pong',
  webDir: 'dist',
  android: {
    allowMixedContent: false,
    backgroundColor: '#0a1628',
  },
  plugins: {
    SplashScreen: {
      launchAutoHide: false,
      backgroundColor: '#0a1628',
      showSpinner: false,
      androidSplashResourceName: 'splash',
    },
    StatusBar: {
      style: 'DARK',
      backgroundColor: '#0a1628',
    },
  },
};

export default config;
