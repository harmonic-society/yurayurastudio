import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.yurayura.studio',
  appName: 'Yura Yura STUDIO',
  webDir: 'dist/public',
  server: {
    androidScheme: 'https',
    cleartext: true,
    hostname: 'app.yurayurastudio.com'
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      backgroundColor: "#4F46E5",
      showSpinner: true,
      spinnerColor: "#FFFFFF"
    }
  }
};

export default config;
