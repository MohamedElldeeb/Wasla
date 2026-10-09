export type Region = { governorate?: string; city?: string; district?: string };

/** "محافظة، مدينة، حي" per line (also accepts commas "," and Arabic comma "،"). */
export function parseRegions(text: string): Region[] {
  return text
    .split('\n')
    .map((line) => line.split(/[,،]/).map((p) => p.trim()))
    .filter((p) => p.some(Boolean))
    .map(([governorate, city, district]) => ({
      ...(governorate ? { governorate } : {}),
      ...(city ? { city } : {}),
      ...(district ? { district } : {}),
    }))
    .slice(0, 20);
}

export function regionsToText(regions: Region[] | undefined): string {
  return (regions ?? []).map((r) => [r.governorate, r.city, r.district].filter(Boolean).join('، ')).join('\n');
}
