import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.stellaris.pos',
  appName: 'Stellaris',
  webDir: 'dist',
  server: {
    androidScheme: 'http'
  }
};

export default config;
