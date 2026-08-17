import { defineConfig } from '@vesk/native'

export default defineConfig({
  appId: 'com.vesk.aero',
  appName: 'Aero',
  versionName: '1.0.0',
  versionCode: 1,
  compileSdk: 37,
  minSdk: 24,
  targetSdk: 36,
  orientation: 'portrait',
  root: 'Layout',
  page: 'Home',
  theme: 'dark',
  colors: {
    primary: '#22D3EE',
    background: '#0A0F16',
    surface: '#141B26',
    onPrimary: '#07131A',
    text: '#E7EDF5',
  },
  darkColors: {
    primary: '#22D3EE',
    background: '#0A0F16',
    surface: '#141B26',
    onPrimary: '#07131A',
    text: '#E7EDF5',
  },
  typography: {
    fontSize: 16,
  },
  back: {
    mode: 'stack',
    doubleBackToExit: true,
    exitDelayMs: 2000,
    exitRoutes: [],
  },
  permissions: [],
  edgeToEdge: {
    enabled: true,
    paddingBars: true,
    statusBarStyle: 'light',
    navigationBarStyle: 'dark',
  },
  device: 'phone',
})