import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { LIBRARY_REGISTRY, parseLibrarySpec, resolveLibrary, withVersion, deriveLibraryPermissions } from '../packages/cli-native/src/vsklib.ts';
import type { VskLibRecord } from '../packages/cli-native/src/vsklib.ts';
import { TARGET_DIR } from './helpers.ts';

const SEMVER = /^\d+\.\d+(\.\d+)?(?:-[0-A-Za-z.-]+)?(?:\+[0-9A-Za-z.-]+)?$/;

describe('library registry integrity', () => {
  it('loads a non-empty registry with unique ids', () => {
    assert.ok(LIBRARY_REGISTRY.length > 0);
    const ids = LIBRARY_REGISTRY.map((r) => r.id);
    assert.equal(new Set(ids).size, ids.length);
  });

  it('every record has real Maven coordinates matching group/artifact/version', () => {
    for (const rec of LIBRARY_REGISTRY) {
      assert.ok(rec.group.length > 0 && rec.artifact.length > 0, rec.id);
      assert.ok(SEMVER.test(rec.version), `${rec.id}: ${rec.version}`);
      assert.ok(
        rec.gradle.includes(`${rec.group}:${rec.artifact}:${rec.version}`),
        `${rec.id}: gradle coords mismatch`,
      );
    }
  });

  it('component libraries declare markup tags', () => {
    for (const rec of LIBRARY_REGISTRY) {
      assert.ok(['utility', 'component'].includes(rec.libType), rec.id);
      if (rec.libType === 'component') assert.ok(Object.keys(rec.tags).length > 0, `${rec.id}: no tags`);
    }
    assert.ok(LIBRARY_REGISTRY.some((r) => r.libType === 'component'));
    assert.ok(LIBRARY_REGISTRY.some((r) => r.libType === 'utility'));
  });

  it('signatures carry typed params and permission strings are well-formed', () => {
    for (const rec of LIBRARY_REGISTRY) {
      for (const sig of Object.values(rec.signatures ?? {})) {
        assert.equal(sig.name.length > 0, true, rec.id);
        assert.ok(Array.isArray(sig.params));
      }
      for (const p of rec.permissions) {
        assert.ok(/^[a-z][a-z0-9_]*(\.[a-z0-9_]+)+$/i.test(p), `${rec.id}: ${p}`);
      }
    }
  });
});

describe('library spec parsing and resolution', () => {
  it('parses id, id@version and group:artifact forms', () => {
    assert.deepEqual(parseLibrarySpec('okhttp@4.12.0'), { id: 'okhttp', version: '4.12.0' });
    assert.deepEqual(parseLibrarySpec('coil'), { id: 'coil' });
    const byCoords = parseLibrarySpec('com.squareup.okhttp3:okhttp');
    assert.deepEqual(byCoords, { group: 'com.squareup.okhttp3', artifact: 'okhttp' });
  });

  it('rejects malformed specs', () => {
    assert.throws(() => parseLibrarySpec('@bad'), /invalid library spec/);
    assert.throws(() => parseLibrarySpec(''), /invalid library spec/);
  });

  it('resolves known ids and applies explicit versions', () => {
    const glide = resolveLibrary({ id: 'glide' });
    assert.equal(glide.id, 'glide');
    const pinned = withVersion(glide, '9.9.9');
    assert.equal(pinned.version, '9.9.9');
    assert.throws(() => resolveLibrary({ id: 'no-such-lib' }));
  });

  it('derives INTERNET permission for network library groups', () => {
    const perms = deriveLibraryPermissions({ group: 'com.squareup.okhttp3', permissions: [] });
    assert.ok(perms.includes('android.permission.INTERNET'));
    const none = deriveLibraryPermissions({ group: 'androidx.activity', permissions: [] });
    assert.deepEqual(none, []);
  });
});

describe('installed libraries (test-app/libraries.json)', () => {
  const file = join(TARGET_DIR, 'libraries.json');

  it('exists, is internally consistent, and matches the registry where a record exists', () => {
    assert.ok(existsSync(file), 'test-app/libraries.json missing');
    const parsed = JSON.parse(readFileSync(file, 'utf8')) as { version: number; libraries: Record<string, VskLibRecord> };
    assert.equal(parsed.version, 1);
    const byId = new Map(LIBRARY_REGISTRY.map((r) => [r.id, r]));
    const ids = Object.keys(parsed.libraries);
    assert.ok(ids.length > 0);
    for (const id of ids) {
      const installed = parsed.libraries[id];
      assert.ok(installed, id);
      assert.equal(
        installed.gradle.includes(`${installed.group}:${installed.artifact}:${installed.version}`),
        true,
        `${id}: gradle coords mismatch`,
      );
      for (const p of installed.permissions) {
        assert.ok(/^[a-z][a-z0-9_]*(\.[a-z0-9_]+)+$/i.test(p), `${id}: ${p}`);
      }
      const reg = byId.get(id);
      if (reg) {
        assert.equal(installed.group, reg.group, id);
        assert.equal(installed.artifact, reg.artifact, id);
        assert.equal(installed.version, reg.version, id);
        assert.deepEqual(deriveLibraryPermissions(installed), deriveLibraryPermissions(reg), id);
      }
    }
  });
});
