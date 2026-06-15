import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.stellaris.pos',
  appName: 'Stellaris',
  webDir: 'dist',
  server: {
    androidScheme: 'https'
  }
};

export default config;
