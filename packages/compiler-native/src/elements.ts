export type ElementKind = 'container' | 'text' | 'button' | 'input';

const TEXT_TAGS = new Set([
  'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
  'p', 'span', 'label', 'strong', 'em', 'small',
  'blockquote', 'pre', 'code', 'a', 'abbr', 'b', 'i', 'u', 'mark', 'sub', 'sup', 'time',
]);

const CONTAINER_TAGS = new Set([
  'div', 'section', 'header', 'footer', 'main', 'nav', 'article', 'aside',
  'ul', 'ol', 'form', 'figure', 'details', 'summary', 'fieldset',
]);

export interface ElementInfo {
  kind: ElementKind;
  composable: string;
}

export function elementInfo(tag: string): ElementInfo {
  if (tag === 'button') return { kind: 'button', composable: 'Button' };
  if (tag === 'input' || tag === 'textarea') return { kind: 'input', composable: 'OutlinedTextField' };
  if (TEXT_TAGS.has(tag)) return { kind: 'text', composable: 'Text' };
  if (CONTAINER_TAGS.has(tag)) return { kind: 'container', composable: 'container' };
  return { kind: 'container', composable: 'container' };
}

export function isVoidTag(tag: string): boolean {
  return (
    tag === 'br' || tag === 'hr' || tag === 'img' || tag === 'meta' ||
    tag === 'link' || tag === 'input' || tag === 'wbr'
  );
}
