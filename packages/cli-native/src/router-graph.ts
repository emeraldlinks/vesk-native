import { readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

export interface RouteNode {
  path: string;
  fullPath: string;
  fileName: string;
  isDynamic: boolean;
  paramName?: string;
  children: RouteNode[];
  layouts: RouteNode[];
}

export function buildRouteGraph(appDir: string): RouteNode[] {
  const routesDir = join(appDir, 'app');
  const routes: RouteNode[] = [];

  function walk(dir: string, parentPath: string): void {
    if (!statSync(dir).isDirectory()) return;
    const entries = readdirSync(dir).sort();
    for (const entry of entries) {
      const full = join(dir, entry);
      if (entry === 'layout.vsk') {
        continue;
      }
      if (entry.endsWith('.vsk')) {
        const rel = relative(routesDir, full);
        const path = '/' + rel.replace(/\.vsk$/, '').replace(/\/page$/, '') || '/';
        routes.push({
          path,
          fullPath: path,
          fileName: entry,
          isDynamic: false,
          children: [],
          layouts: [],
        });
      } else if (statSync(full).isDirectory()) {
        const seg = entry;
        const isDynamic = seg.startsWith('[') && seg.endsWith(']');
        const paramName = isDynamic ? seg.slice(1, -1) : undefined;
        const childPath = parentPath + (parentPath.endsWith('/') ? '' : '/') + (isDynamic ? `:${paramName}` : seg);
        walk(full, childPath);
      }
    }
  }

  walk(routesDir, '');
  return routes;
}
