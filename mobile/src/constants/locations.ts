export const LOCATIONS = [
  'Geladeira',
  'Freezer',
  'Armário',
  'Despensa',
  'Balcão',
  'Outro',
] as const;

export type Location = (typeof LOCATIONS)[number];
