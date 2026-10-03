import { VERSION_PATTERN } from './app-version.constants';

/** "1.0.03" → [1, 0, 3]; null when it is not a version at all. */
export function parseVersion(v: string | null | undefined): number[] | null {
  const s = (v ?? '').trim();
  if (!VERSION_PATTERN.test(s)) return null;
  const parts = s.split('.').map((n) => parseInt(n, 10));
  while (parts.length < 3) parts.push(0);
  return parts;
}

/** <0 when a is older than b, 0 when equal, >0 when newer. Both must parse. */
export function compareVersions(a: number[], b: number[]): number {
  for (let i = 0; i < 3; i++) {
    const diff = (a[i] ?? 0) - (b[i] ?? 0);
    if (diff !== 0) return diff;
  }
  return 0;
}
