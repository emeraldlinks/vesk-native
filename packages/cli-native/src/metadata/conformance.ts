// Conformance gate for the Kotlin-metadata binding generator: regenerate the
// coil + ycharts + glide bindings from the real published artifacts and assert
// the surface the demo depends on. Run with:
//   npx tsx packages/cli-native/src/metadata/conformance.ts
// Fails (exit 1) when a binding the .vsk surface relies on is not generated.
import { generateLibraryBinding } from './binding-gen.js';
import { deriveLibraryPermissions } from '@cli-native/vsklib';

function fail(msg: string): never {
  console.error(`  [conformance] FAIL: ${msg}`);
  process.exit(1);
}

function assert(cond: boolean, msg: string): asserts cond {
  if (!cond) fail(msg);
}

async function main(): Promise<void> {
  const coil = await generateLibraryBinding({ group: 'io.coil-kt', artifact: 'coil-compose-base', version: '2.7.0' });
  console.log('=== coil-compose-base 2.7.0 ===');
  console.log('stats', JSON.stringify(coil.stats));
  assert(coil.stats.facades >= 5, `coil should expose >= 5 file facades, got ${coil.stats.facades}`);
  assert(coil.record.multiplatform === false, `coil 2.x (io.coil-kt) is android-only — multiplatform must be false, got ${coil.record.multiplatform}`);
  const coilTags = Object.keys(coil.record.tags ?? {});
  for (const t of ['AsyncImage', 'SubcomposeAsyncImage']) {
    assert(coilTags.includes(t), `coil binding missing tag <${t}> (got: ${coilTags.join(', ')})`);
  }
  const image = coil.record.tags?.['AsyncImage'];
  assert(image !== undefined && image.attrs['model'] === 'model', 'coil AsyncImage must map model -> model');
  assert(image !== undefined && image.attrs['contentDescription'] === 'contentDescription', 'coil AsyncImage must map contentDescription');
  assert(coil.skipped.filter((s) => s.includes('no JVM method')).length === 0, 'coil should not report unbound JVM methods');
  const coilSigs = coil.record.signatures;
  assert(coilSigs !== undefined, 'coil binding must expose a signatures map');
  assert(
    coil.record.exports.every((n) => coilSigs[n] !== undefined),
    `coil function exports must stay signature-backed (got: ${coil.record.exports.join(', ')})`,
  );

  const yc = await generateLibraryBinding({ group: 'co.yml', artifact: 'ycharts', version: '2.1.0' });
  console.log('=== ycharts 2.1.0 ===');
  console.log('stats', JSON.stringify(yc.stats));
  assert(yc.stats.facades >= 20, `ycharts should expose >= 20 file facades, got ${yc.stats.facades}`);
  const ycTags = Object.keys(yc.record.tags ?? {});
  for (const t of ['LineChart', 'BarChart', 'GroupBarChart', 'PieChart', 'WaveChart', 'XAxis', 'YAxis']) {
    assert(ycTags.includes(t), `ycharts binding missing tag <${t}> (got: ${ycTags.join(', ')})`);
  }
  assert(yc.record.minSdk === 26, `ycharts AAR manifest minSdk should be 26, got ${yc.record.minSdk}`);
  assert(yc.record.multiplatform === false, `ycharts is JVM-only — multiplatform must be false, got ${yc.record.multiplatform}`);
  assert(yc.skipped.filter((s) => s.includes('no JVM method') && s.includes('.charts.')).length === 0, 'ycharts should not report unbound chart JVM methods');

  const ycSigs = yc.record.signatures ?? {};
  const lcd = ycSigs['LineChartData'];
  assert(lcd !== undefined, 'ycharts binding missing signature LineChartData');
  assert(lcd.isConstructor === true, 'LineChartData signature must be a constructor');
  assert(lcd.params[0]?.name === 'linePlotData', 'LineChartData first param must be linePlotData');
  assert(lcd.params[0]?.shape === 'object', 'LineChartData linePlotData param must be an object shape');
  assert(
    lcd.params[0]?.typeName === 'co.yml.charts.ui.linechart.model.LinePlotData',
    `LineChartData linePlotData typeName must be LinePlotData, got ${lcd.params[0]?.typeName}`,
  );
  assert(lcd.defaultParams.includes('xAxisData'), 'LineChartData defaultParams must include xAxisData');
  assert(lcd.returnShape === 'object', 'LineChartData must return an object shape');

  const point = ycSigs['Point'];
  assert(point !== undefined, 'ycharts binding missing signature Point');
  assert(point.params[0]?.shape === 'number', 'Point x param must be a number shape');
  assert(
    point.params[2]?.name === 'description' && point.params[2]?.shape === 'string',
    'Point description param must be a defaultable string shape',
  );

  const gravity = ycSigs['Gravity'];
  assert(gravity !== undefined && gravity.isEnum === true, 'Gravity must be exported as an enum');
  const plotType = ycSigs['PlotType'];
  assert(plotType !== undefined && plotType.isEnum === true, 'PlotType sealed interface must be exported as a sealed-enum');
  assert(
    plotType.enumValues?.length === 5 && plotType.enumValues.includes('Line') && plotType.enumValues.includes('Wave'),
    `PlotType sealed-enum members must be the 5 nested chart objects, got ${plotType.enumValues?.join(', ')}`,
  );
  assert(
    ycSigs['LinePlotData']?.params[0]?.shape === 'enum' && ycSigs['LinePlotData']?.params[0]?.typeName === 'co.yml.charts.common.model.PlotType',
    'LinePlotData plotType param must resolve to the PlotType sealed-enum',
  );

  const lineChart = yc.record.tags?.['LineChart'];
  const lcdAttr = lineChart?.attrShapes?.['lineChartData'];
  assert(lcdAttr !== undefined, 'LineChart tag must carry attrShapes for lineChartData');
  assert(lcdAttr.shape === 'object', 'LineChart lineChartData attr shape must be object');
  assert(
    lcdAttr.typeName === 'co.yml.charts.ui.linechart.model.LineChartData',
    `LineChart lineChartData typeName must be LineChartData, got ${lcdAttr.typeName}`,
  );
  const glide = await generateLibraryBinding({ group: 'com.github.bumptech.glide', artifact: 'compose', version: '1.0.0-beta01' });
  console.log('=== glide compose 1.0.0-beta01 ===');
  console.log('stats', JSON.stringify(glide.stats));
  const glideTags = Object.keys(glide.record.tags ?? {});
  for (const t of ['GlideImage', 'GlideSubcomposition']) {
    assert(glideTags.includes(t), `glide binding missing tag <${t}> (got: ${glideTags.join(', ')})`);
  }
  const glideImage = glide.record.tags?.['GlideImage'];
  assert(glideImage !== undefined && glideImage.attrs['model'] === 'model', 'glide GlideImage must map model -> model');
  assert(glideImage !== undefined && glideImage.attrs['contentDescription'] === 'contentDescription', 'glide GlideImage must map contentDescription');
  assert(
    glideImage?.optIn?.includes('com.bumptech.glide.integration.compose.ExperimentalGlideComposeApi') === true,
    'glide GlideImage must propagate its ExperimentalGlideComposeApi opt-in marker',
  );
  assert(glide.record.multiplatform === false, `glide-compose is android-only — multiplatform must be false, got ${glide.record.multiplatform}`);

  // coil3 publishes Kotlin Multiplatform metadata (commonMain-usable); coil 2.x
  // does not. The demo's Lib page uses both — pages importing coil3 can go to
  // commonMain, pages importing coil 2.x must stay in androidMain.
  const coil3 = await generateLibraryBinding({ group: 'io.coil-kt.coil3', artifact: 'coil-compose', version: '3.0.4' });
  console.log('=== coil3 coil-compose 3.0.4 ===');
  console.log('stats', JSON.stringify(coil3.stats));
  assert(coil3.record.multiplatform === true, `coil3 publishes common metadata — multiplatform must be true, got ${coil3.record.multiplatform}`);

  // Network clients ship without declaring INTERNET in their own AAR manifest;
  // the coordinate rules must derive it at add/update time so the manifest
  // never needs a manual permission after `vesk add`.
  const coilPerms = deriveLibraryPermissions({ group: coil.record.group, permissions: coil.record.permissions });
  assert(coilPerms.includes('android.permission.INTERNET'), 'coil is a network image loader — INTERNET must be derived');
  const glidePerms = deriveLibraryPermissions({ group: glide.record.group, permissions: glide.record.permissions });
  assert(glidePerms.includes('android.permission.INTERNET'), 'glide is a network image loader — INTERNET must be derived');

  console.log('\n  [conformance] OK — coil + ycharts + glide bindings regenerate to the expected surface.');
}

main().catch((e) => {
  console.error('  [conformance] FAILED:', e);
  process.exit(1);
});
