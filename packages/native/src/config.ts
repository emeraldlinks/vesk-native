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
  // Routes where a double back press exits the app (default: the root page).
  // Interior pages not listed here always pop the navigation history first.
  exitRoutes?: string[];
}

export interface VeskRoute {
  path: string;
  component: string;
  // Marks this route as an exit page: a double back press exits the app.
  exitOnBack?: boolean;
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
  // Extra <uses-permission> entries emitted verbatim into AndroidManifest.xml
  // (e.g. "android.permission.RECORD_AUDIO"). Storage/media permissions are
  // still derived automatically from the elements the app actually uses.
  permissions?: string[];
  // Layout target: 'phone' (default) or 'tablet' (content constrained to a
  // centered 840dp column).
  device?: 'phone' | 'tablet';
}

// Identity helper giving full autocompletion and type checking in
// veskconfig.ts — mirror of defineConfig from vesk (web).
export function defineConfig(config: VeskConfig): VeskConfig {
  return config;
}