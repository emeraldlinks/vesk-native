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
    exitRoutes: [],
  },
  media: {
    // Playback broadcasts as a system media session + notification; flip to
    // false to keep audio/video in-app only.
    broadcast: true,
  },
  screens: {
    // Props are injected into the route's page component (typed props on the
    // component: component Home(props: { promo: string, cta: string })).
    '/': {
      props: {
        promo: 'Members save 20% today',
        cta: 'Shop the drop',
      },
    },
  },
  permissions: [],
  edgeToEdge: {
    enabled: true,
    paddingBars: true,
    statusBarStyle: 'light',
    navigationBarStyle: 'light',
  },
  device: 'phone',
})