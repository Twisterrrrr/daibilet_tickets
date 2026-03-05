export function normalizeTeplohodExternalId(input: string | number): string {
  const s = String(input).trim();
  const m = s.match(/(\d+)/);
  return m ? m[1] : s;
}

