import { defineConfig } from 'vesk-native'

export default defineConfig({
  appId: 'com.vesk.demo3',
  appName: 'Vesk Demo 3',
  versionName: '0.4.0',
  versionCode: 4,
  compileSdk: 37,
  minSdk: 24,
  targetSdk: 36,
  orientation: 'portrait',
  root: 'Layout',
  page: 'Home',
  theme: 'light',
  colors: {
    primary: '#3B82F6',
    background: '#FFFFFF',
    surface: '#FFFFFF',
    onPrimary: '#FFFFFF',
    text: '#1F2937',
  },
  darkColors: {
    primary: '#60A5FA',
    background: '#0F172A',
    surface: '#1E293B',
    onPrimary: '#0F172A',
    text: '#E2E8F0',
  },
  typography: {
    fontSize: 16,
  },
  back: {
    mode: 'stack',
    doubleBackToExit: true,
    exitDelayMs: 2000,
  },
})