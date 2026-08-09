export interface VeskColors {
  primary: string;
  background: string;
  surface: string;
  onPrimary: string;
  text: string;
}

export interface VeskTypography {
  fontFamily?: string;
  fontSize?: number;
}

export type VeskThemeMode = 'light' | 'dark' | 'system';

export interface VeskBack {
  mode?: 'stack' | 'system';
  doubleBackToExit?: boolean;
  exitDelayMs?: number;
}

export interface VeskRoute {
  path: string;
  component: string;
}

export interface VeskConfig {
  appId: string;
  appName: string;
  versionName: string;
  versionCode: number;
  compileSdk?: number;
  minSdk?: number;
  targetSdk?: number;
  orientation?: 'portrait' | 'landscape';
  root?: string;
  page?: string;
  theme?: VeskThemeMode;
  routes?: VeskRoute[];
  colors: VeskColors;
  darkColors: VeskColors;
  typography?: VeskTypography;
  back?: VeskBack;
}

// Identity helper giving full autocompletion and type checking in
// veskconfig.ts — mirror of defineConfig from vesk (web).
export function defineConfig(config: VeskConfig): VeskConfig {
  return config;
}