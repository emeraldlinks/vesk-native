// Bulk-add real libraries to the builtin registry. Every record is generated
// from the artifact's actual published Kotlin metadata via generateLibraryBinding
// (no signature is guessed). Run with:
//   npx tsx packages/cli-native/src/metadata/add-to-registry.ts
// It processes each candidate, writes packages/cli-native/registry/<category>/<id>.vsklib,
// and reports per-library stats. Libraries that yield no class surface are skipped.
import { generateLibraryBinding } from './binding-gen.js';
import { writeVsklibRecordFile } from '@cli-native/vsklib-registry';
import { join } from 'node:path';

interface Cand {
  id: string;
  group: string;
  artifact: string;
  version: string;
  category: string;
  name: string;
  description: string;
}

// Real, published coordinates only. Categories map to registry/<category>/ subdirs.
const CANDIDATES: Cand[] = [
  // ----- utilities -----
  { id: 'core-ktx', group: 'androidx.core', artifact: 'core-ktx', version: '1.13.1', category: 'utilities', name: 'AndroidX Core KTX', description: 'Kotlin extensions for Android framework APIs (Context, resources, permissions).' },
  { id: 'coroutines', group: 'org.jetbrains.kotlinx', artifact: 'kotlinx-coroutines-android', version: '1.7.3', category: 'utilities', name: 'kotlinx.coroutines', description: 'Coroutines for Android — async/await, flows, scopes.' },
  { id: 'datetime', group: 'org.jetbrains.kotlinx', artifact: 'kotlinx-datetime', version: '0.6.0', category: 'utilities', name: 'kotlinx-datetime', description: 'Multiplatform date/time (Instant, LocalDate, Clock).' },
  { id: 'immutable-collections', group: 'org.jetbrains.kotlinx', artifact: 'kotlinx-collections-immutable', version: '0.3.7', category: 'utilities', name: 'kotlinx.collections.immutable', description: 'Persistent immutable collections (persistentListOf, persistentMapOf).' },
  { id: 'lifecycle-runtime', group: 'androidx.lifecycle', artifact: 'lifecycle-runtime-ktx', version: '2.8.2', category: 'utilities', name: 'AndroidX Lifecycle (runtime)', description: 'Lifecycle, ViewModel, LiveData, RepeatOnLifecycle.' },
  { id: 'viewmodel-compose', group: 'androidx.lifecycle', artifact: 'lifecycle-viewmodel-compose', version: '2.8.2', category: 'utilities', name: 'AndroidX Lifecycle ViewModel Compose', description: 'viewModel() composable + Flow collection in Compose.' },
  { id: 'navigation', group: 'androidx.navigation', artifact: 'navigation-compose', version: '2.7.7', category: 'utilities', name: 'AndroidX Navigation Compose', description: 'Type-safe Compose navigation (NavHost, navArgument).' },
  { id: 'activity-compose', group: 'androidx.activity', artifact: 'activity-compose', version: '1.9.2', category: 'utilities', name: 'AndroidX Activity Compose', description: 'rememberLauncherForActivityResult, BackHandler, edge-to-edge.' },
  { id: 'foundation', group: 'androidx.compose.foundation', artifact: 'foundation', version: '1.6.8', category: 'utilities', name: 'Compose Foundation', description: 'Scroll, clickable, layout, gestures, lazy lists base.' },
  { id: 'constraintlayout-compose', group: 'androidx.constraintlayout', artifact: 'constraintlayout-compose', version: '1.1.0', category: 'utilities', name: 'ConstraintLayout Compose', description: 'Declarative ConstraintLayout for Compose.' },
  { id: 'material3', group: 'androidx.compose.material3', artifact: 'material3', version: '1.2.1', category: 'utilities', name: 'Material 3', description: 'Material Design 3 components (Button, Card, Surface, Scaffold, TopAppBar).' },
  { id: 'material', group: 'androidx.compose.material', artifact: 'material', version: '1.6.8', description: 'Material Design 2 components (Button, Card, Text, Scaffold).', category: 'utilities', name: 'Material (M2)' },
  { id: 'foundation-layout', group: 'androidx.compose.foundation', artifact: 'foundation-layout', version: '1.6.8', category: 'utilities', name: 'Compose Foundation Layout', description: 'LazyColumn/Row, BoxWithConstraints, Spacer, lazy grids.' },
  { id: 'ui', group: 'androidx.compose.ui', artifact: 'ui', version: '1.6.8', category: 'utilities', name: 'Compose UI', description: 'Base Compose UI primitives (Box, Column, Row, Text, Modifier, Alignment).' },
  { id: 'preference-ktx', group: 'androidx.preference', artifact: 'preference-ktx', version: '1.2.1', category: 'utilities', name: 'AndroidX Preference KTX', description: 'SharedPreferences + Preference UI helpers.' },
  { id: 'security-crypto', group: 'androidx.security', artifact: 'security-crypto', version: '1.0.0', category: 'utilities', name: 'AndroidX Security Crypto', description: 'EncryptedSharedPreferences / EncryptedFile.' },
  { id: 'browser', group: 'androidx.browser', artifact: 'browser', version: '1.8.0', category: 'utilities', name: 'AndroidX Browser', description: 'Custom Tabs for in-app web links.' },

  // ----- animations -----
  { id: 'animation', group: 'androidx.compose.animation', artifact: 'animation', version: '1.6.8', category: 'animations', name: 'Compose Animation', description: 'AnimatedVisibility, AnimatedContent, Crossfade, Transition.' },
  { id: 'animation-core', group: 'androidx.compose.animation', artifact: 'animation-core', version: '1.6.8', category: 'animations', name: 'Compose Animation Core', description: 'Animatable, animate*AsState, Easing, InfiniteTransition.' },
  { id: 'animation-graphics', group: 'androidx.compose.animation', artifact: 'animation-graphics', version: '1.6.8', category: 'animations', name: 'Compose Animation Graphics', description: 'AnimatedVectorPainter / animated vector drawables.' },
  { id: 'material-ripple', group: 'androidx.compose.material', artifact: 'material-ripple', version: '1.6.8', category: 'animations', name: 'Compose Material Ripple', description: 'rememberRipple, ripple indication.' },
  { id: 'shimmer', group: 'com.valentinilk.shimmer', artifact: 'compose-shimmer', version: '1.3.1', category: 'animations', name: 'Compose Shimmer', description: 'Shimmer loading placeholder composable.' },

  // ----- icons -----
  { id: 'material-icons', group: 'androidx.compose.material', artifact: 'material-icons-core', version: '1.6.8', category: 'icons', name: 'Material Icons Core', description: 'Core Material icon set (Icons.Filled/Outlined/...) + ImageVector.' },
  { id: 'material-icons-extended', group: 'androidx.compose.material', artifact: 'material-icons-extended', version: '1.6.8', category: 'icons', name: 'Material Icons Extended', description: 'Extended Material icon set (thousands of icons).' },
  { id: 'icons-feather', group: 'br.com.devsrsouza.compose.icons', artifact: 'feather', version: '1.0.0', category: 'icons', name: 'Compose Icons — Feather', description: 'Feather icon pack as composable ImageVectors.' },
  { id: 'icons-font-awesome', group: 'br.com.devsrsouza.compose.icons', artifact: 'font-awesome', version: '1.0.0', category: 'icons', name: 'Compose Icons — Font Awesome', description: 'Font Awesome icon pack as composable ImageVectors.' },
  { id: 'icons-lucide', group: 'com.composables', artifact: 'icons-lucide-cmp', version: '2.2.1', category: 'icons', name: 'Compose Icons — Lucide', description: 'Lucide icon pack (1665 icons) as ImageVector extension properties on Lucide.' },

  // ----- device / native SDKs -----
  { id: 'play-services-location', group: 'com.google.android.gms', artifact: 'play-services-location', version: '21.3.0', category: 'device', name: 'Play Services Location', description: 'FusedLocationProviderClient, geofences, activity recognition.' },
  { id: 'play-services-maps', group: 'com.google.android.gms', artifact: 'play-services-maps', version: '18.2.0', category: 'device', name: 'Play Services Maps', description: 'Google Maps SDK for Android.' },
  { id: 'play-services-auth', group: 'com.google.android.gms', artifact: 'play-services-auth', version: '20.7.0', category: 'device', name: 'Play Services Auth', description: 'Google Sign-In / One Tap credentials.' },
  { id: 'firebase-messaging', group: 'com.google.firebase', artifact: 'firebase-messaging', version: '23.4.1', category: 'device', name: 'Firebase Cloud Messaging', description: 'Push notifications (FCM) tokens + messaging.' },
  { id: 'firebase-analytics', group: 'com.google.firebase', artifact: 'firebase-analytics', version: '21.6.2', category: 'device', name: 'Firebase Analytics', description: 'App analytics event logging.' },
  { id: 'billing', group: 'com.android.billingclient', artifact: 'billing', version: '6.2.1', category: 'device', name: 'Google Play Billing', description: 'In-app purchases / subscriptions (BillingClient).' },
  { id: 'camera-camera2', group: 'androidx.camera', artifact: 'camera-camera2', version: '1.3.4', category: 'device', name: 'CameraX Camera2', description: 'Camera2 bindings for CameraX pipelines.' },
  { id: 'camera-lifecycle', group: 'androidx.camera', artifact: 'camera-lifecycle', version: '1.3.4', category: 'device', name: 'CameraX Lifecycle', description: 'Lifecycle-aware CameraX use cases (Preview/ImageCapture).' },
  { id: 'media3-exoplayer', group: 'androidx.media3', artifact: 'media3-exoplayer', version: '1.3.1', category: 'device', name: 'Media3 ExoPlayer', description: 'Adaptive media player (ExoPlayer).' },
  { id: 'mlkit-barcode', group: 'com.google.mlkit', artifact: 'barcode-scanning', version: '17.3.0', category: 'device', name: 'ML Kit Barcode Scanning', description: 'On-device barcode / QR scanning.' },
  { id: 'in-app-review', group: 'com.google.android.play', artifact: 'review', version: '2.0.1', category: 'device', name: 'Play In-App Review', description: 'Google Play in-app review flow.' },
  { id: 'biometric', group: 'androidx.biometric', artifact: 'biometric', version: '1.1.0', category: 'device', name: 'AndroidX Biometric', description: 'BiometricPrompt (fingerprint/face) authentication.' },
];

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const list = args.length ? CANDIDATES.filter((c) => args.includes(c.id) || args.includes(c.category)) : CANDIDATES;
  let ok = 0;
  let skipped = 0;
  let failed = 0;
  for (const c of list) {
    try {
      const r = await generateLibraryBinding({ group: c.group, artifact: c.artifact, version: c.version });
      if (r.stats.classes === 0) {
        console.log(`  SKIP ${c.id} (${c.category}): metadata yielded no binding surface`);
        skipped++;
        continue;
      }
      const rec = { ...r.record, id: c.id, name: c.name, description: c.description, curated: true, essential: false };
      const dir = join('packages/cli-native/registry', c.category);
      writeVsklibRecordFile(join(dir, `${c.id}.vsklib`), rec);
      ok++;
      console.log(`  OK   ${c.id} (${c.category}) classes=${r.stats.classes} facades=${r.stats.facades} composables=${r.stats.composables} exports=${r.stats.exports} signatures=${Object.keys(r.record.signatures ?? {}).length} skipped=${r.skipped.length}`);
    } catch (e) {
      failed++;
      console.log(`  FAIL ${c.id} (${c.category}): ${(e as Error).message}`);
    }
  }
  console.log(`\n  [add-to-registry] ok=${ok} skipped=${skipped} failed=${failed} (of ${list.length} candidates)`);
}

void main();
