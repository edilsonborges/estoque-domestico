export const UNITS = [
  'un',
  'kg',
  'g',
  'L',
  'ml',
  'pct',
  'cx',
  'dz',
] as const;

export type Unit = (typeof UNITS)[number];
