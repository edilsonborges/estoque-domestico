export const CATEGORIES = [
  'Laticínios',
  'Carnes',
  'Frutas',
  'Verduras',
  'Grãos',
  'Bebidas',
  'Frios',
  'Doces',
  'Temperos',
  'Limpeza',
  'Outros',
] as const;

export type Category = (typeof CATEGORIES)[number];
