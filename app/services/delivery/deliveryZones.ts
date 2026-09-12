/**
 * Pure zip code matching for the delivery checker. No server imports —
 * unit tested. Codes are normalised to uppercase with no whitespace so
 * "sw1a 1aa" and "SW1A1AA" compare equal; an entry ending in "*" matches
 * any code that starts with the rest ("331*" → 33101, 33199…).
 */

export const MAX_ZIP_LENGTH = 12;

export function normalizeZip(input: string): string {
  return String(input ?? "")
    .toUpperCase()
    .replace(/\s+/g, "")
    .slice(0, MAX_ZIP_LENGTH);
}

/** Parses a merchant-typed list: commas, semicolons, newlines, or spaces. */
export function parseZipList(text: string): string[] {
  const seen = new Set<string>();
  const entries: string[] = [];
  for (const raw of String(text ?? "").split(/[\s,;]+/)) {
    const entry = normalizeZip(raw);
    if (!entry || entry === "*") continue;
    if (!/^[A-Z0-9-]+\*?$/.test(entry)) continue;
    if (seen.has(entry)) continue;
    seen.add(entry);
    entries.push(entry);
  }
  return entries;
}

export function zipMatches(zip: string, entry: string): boolean {
  const code = normalizeZip(zip);
  if (!code) return false;
  if (entry.endsWith("*")) return code.startsWith(entry.slice(0, -1));
  if (code === entry) return true;
  // "33101-1234" (ZIP+4) still matches a plain "33101" entry
  const base = code.split("-")[0];
  return base !== code && base === entry;
}

/** The first zone (in the given order) with an entry matching the zip. */
export function matchZone<T extends { zipCodes: string[] }>(
  zones: T[],
  zip: string,
): T | null {
  for (const zone of zones) {
    if (zone.zipCodes.some((entry) => zipMatches(zip, entry))) return zone;
  }
  return null;
}
