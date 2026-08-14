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

// ---------------------------------------------------------------------------
// Release signing + bundling (all values verified against the 2026 Android
// and Apple release requirements; nothing is invented).
//
// Android: upload-key keystore for Play App Signing (AAB is mandatory for new
// apps since Aug 2021). Requirements enforced by Google Play:
//   - keystore in Java keystore format (.jks / .keystore)
//   - RSA key of 2048 bits or more
//   - certificate validity ending AFTER 2033-10-22 (25+ years recommended)
// Passwords are never written into generated build files from plain values;
// reference them via env-var strings (`env:NAME`) or leave unset to fall back
// to the debug keystore (dev flow).
//
// iOS: Apple Distribution certificate + provisioning profile (manual style)
// or Xcode-managed automatic signing (requires the 10-char team id). Since
// April 28 2026 App Store Connect uploads must be built with Xcode 26+ using
// the iOS 26 SDK. Export methods use the current names ('app-store-connect',
// 'ad-hoc', 'development', 'enterprise'); bitcode is dead since Xcode 14 and
// is not offered.
// ---------------------------------------------------------------------------

export interface VeskAndroidSigning {
  /** Path to the upload-key keystore (.jks/.keystore), absolute or relative
   *  to the app directory. */
  storeFile?: string;
  /** Keystore password. Use `env:NAME` to read from an environment variable
   *  instead of committing a secret. */
  storePassword?: string;
  /** Key alias inside the keystore. */
  keyAlias?: string;
  /** Key password. Use `env:NAME` to read from an environment variable. */
  keyPassword?: string;
}

export interface VeskIosSigning {
  /** 10-character Apple Developer team id (DEVELOPMENT_TEAM). */
  teamId: string;
  /** 'automatic' (Xcode-managed profiles, needs `-allowProvisioningUpdates`
   *  and optionally an App Store Connect API key) or 'manual' (explicit
   *  distribution certificate + provisioning profile). */
  style?: 'automatic' | 'manual';
  /** Manual style: path to the distribution certificate (.p12). */
  certificatePath?: string;
  /** Manual style: .p12 password. Use `env:NAME` to read from the
   *  environment instead of committing a secret. */
  certificatePassword?: string;
  /** Manual style: provisioning profile name or UUID for this bundle id.
   *  When omitted, the profile is located in `profilesDir` by matching the
   *  embedded bundle id. */
  provisioningProfile?: string;
  /** Manual style: directory of .mobileprovision files (default: the app's
   *  ios/profiles directory). */
  profilesDir?: string;
  /** Automatic style on CI: App Store Connect API key (JWT) so xcodebuild
   *  can create/refresh profiles unattended. */
  appStoreConnectApiKey?: {
    /** Path to the .p8 API key file. */
    keyPath: string;
    /** Key id (from App Store Connect Users and Access). */
    keyId: string;
    /** Issuer id (from App Store Connect Users and Access). */
    issuerId: string;
  };
}

export interface VeskIosBundle {
  /** Distribution method for `-exportOptionsPlist`. 'app-store-connect'
   *  covers App Store + TestFlight; 'ad-hoc' registered devices; 'development'
   *  debug installs; 'enterprise' in-house (enterprise program only). */
  method?: 'app-store-connect' | 'ad-hoc' | 'development' | 'enterprise';
  /** 'export' writes the .ipa locally; 'upload' lets Xcode push it to App
   *  Store Connect via the REST flow. */
  destination?: 'export' | 'upload';
  /** Include dSYMs in the .ipa for symbolication (default true). */
  uploadSymbols?: boolean;
  /** Xcode 26+ scheme used for archive/export. */
  scheme?: string;
}

export interface VeskSigning {
  android?: VeskAndroidSigning;
  ios?: VeskIosSigning;
}

export interface VeskBundle {
  /** Android artifacts to produce on `vesk bundle` (default ['aab','apk']). */
  android?: Array<'aab' | 'apk'>;
  ios?: VeskIosBundle;
}

export interface VeskMedia {
  // Broadcast playback as a system media session + notification (lock screen,
  // media buttons, headset). On by default; set false to opt out.
  broadcast?: boolean;
}

export interface VeskScreen {
  // Props passed to the route's page component when it renders. Values are
  // coerced to the component's declared types (`component Page(props: {...})`)
  // or passed as-is for untyped `component Page(props)` (fields inferred from
  // usage). Pages can also declare in-file defaults — `export const pageProps
  // = { ... }` — config values override them, so nothing HAS to live here.
  props?: Record<string, unknown>;
}

export interface VeskRoute {
  path: string;
  component: string;
  // Marks this route as an exit page: a double back press exits the app.
  exitOnBack?: boolean;
}

export type VeskSystemBarStyle = 'auto' | 'light' | 'dark';

export interface VeskEdgeToEdge {
  // Draw the app content behind the system bars (Android's modern default).
  // Set false for the classic layout: the system bars reserve their own
  // space and content never draws behind them. On Android 15+ (targetSdk 35)
  // the OS forces edge-to-edge regardless; the framework then still pads the
  // content so nothing is hidden under the bars.
  enabled?: boolean;
  // Reserve space for the status and navigation bars with insets padding so
  // content never sits underneath them. Set false for full-bleed layouts
  // (content draws behind the bars and handles insets per-element). Ignored
  // when `enabled` is false on Android < 15, where the classic window already
  // keeps content out of the bars.
  paddingBars?: boolean;
  // System bar appearance. 'auto' picks per theme (dark bars in dark mode,
  // light bars in light mode); 'light' forces light bars (dark icons);
  // 'dark' forces dark bars (light icons). Scrim colors come from `colors`
  // and `darkColors`. Ignored when `enabled` is false.
  statusBarStyle?: VeskSystemBarStyle;
  navigationBarStyle?: VeskSystemBarStyle;
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
  media?: VeskMedia;
  // System bar / edge-to-edge behavior.
  edgeToEdge?: VeskEdgeToEdge;
  // Per-screen config: keyed by route path ('/media'), values are passed to
  // the route's page component as props.
  screens?: Record<string, VeskScreen>;
  // Extra <uses-permission> entries emitted verbatim into AndroidManifest.xml
  // (e.g. "android.permission.CAMERA"). Storage/media/recording permissions
  // are still derived automatically from the elements and device APIs the app
  // actually uses.
  permissions?: string[];
  // Layout target: 'phone' (default) or 'tablet' (content constrained to a
  // centered 840dp column).
  device?: 'phone' | 'tablet';
  // Release signing (Android upload key / iOS certificate + team) — drives
  // the generated build files and `vesk bundle` on both platforms.
  signing?: VeskSigning;
  // Release packaging options (artifacts, iOS export method).
  bundle?: VeskBundle;
}

// Identity helper giving full autocompletion and type checking in
// veskconfig.ts — mirror of defineConfig from vesk (web).
export function defineConfig(config: VeskConfig): VeskConfig {
  return config;
}