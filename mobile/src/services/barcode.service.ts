import axios from 'axios';

const offClient = axios.create({
  baseURL: 'https://world.openfoodfacts.net/api/v2',
  timeout: 5000,
});

interface OpenFoodFactsProduct {
  product_name?: string;
  product_name_pt?: string;
  categories_tags?: string[];
  quantity?: string;
  brands?: string;
}

interface OpenFoodFactsResponse {
  status: 0 | 1;
  product?: OpenFoodFactsProduct;
}

export interface BarcodeProductResult {
  found: boolean;
  nome?: string;
  categoria?: string;
  quantidade?: string;
  unidade?: string;
  marca?: string;
  barcode: string;
}

const CATEGORY_MAP: Record<string, string> = {
  dairies: 'Laticínios',
  milks: 'Laticínios',
  cheeses: 'Laticínios',
  yogurts: 'Laticínios',
  butters: 'Laticínios',
  creams: 'Laticínios',
  meats: 'Carnes',
  poultry: 'Carnes',
  beef: 'Carnes',
  pork: 'Carnes',
  fish: 'Carnes',
  seafood: 'Carnes',
  sausages: 'Carnes',
  fruits: 'Frutas',
  'fruit-juices': 'Frutas',
  vegetables: 'Verduras',
  salads: 'Verduras',
  cereals: 'Grãos',
  rice: 'Grãos',
  pasta: 'Grãos',
  beans: 'Grãos',
  breads: 'Grãos',
  flours: 'Grãos',
  beverages: 'Bebidas',
  drinks: 'Bebidas',
  juices: 'Bebidas',
  waters: 'Bebidas',
  sodas: 'Bebidas',
  coffees: 'Bebidas',
  teas: 'Bebidas',
  frozen: 'Frios',
  'frozen-foods': 'Frios',
  'deli-meats': 'Frios',
  chocolates: 'Doces',
  sweets: 'Doces',
  candies: 'Doces',
  sugars: 'Doces',
  biscuits: 'Doces',
  cookies: 'Doces',
  'ice-creams': 'Doces',
  spices: 'Temperos',
  sauces: 'Temperos',
  condiments: 'Temperos',
  seasonings: 'Temperos',
  vinegars: 'Temperos',
  oils: 'Temperos',
  cleaning: 'Limpeza',
  'cleaning-products': 'Limpeza',
  detergents: 'Limpeza',
};

function mapCategory(tags?: string[]): string {
  if (!tags || tags.length === 0) return 'Outros';

  for (const tag of tags) {
    const normalized = tag.replace(/^[a-z]{2}:/, '');
    for (const [keyword, category] of Object.entries(CATEGORY_MAP)) {
      if (normalized.includes(keyword)) {
        return category;
      }
    }
  }

  return 'Outros';
}

const QTY_REGEX = /(\d+(?:[.,]\d+)?)\s*(kg|g|ml|l|un|pct|cx|dz)\b/i;

const UNIT_NORMALIZE: Record<string, string> = {
  kg: 'kg',
  g: 'g',
  ml: 'ml',
  l: 'L',
  un: 'un',
  pct: 'pct',
  cx: 'cx',
  dz: 'dz',
};

function parseQuantity(raw?: string): { quantidade?: string; unidade?: string } {
  if (!raw) return {};

  const match = raw.match(QTY_REGEX);
  if (!match) return {};

  const quantidade = match[1].replace(',', '.');
  const unidade = UNIT_NORMALIZE[match[2].toLowerCase()];

  return unidade ? { quantidade, unidade } : {};
}

export async function lookupBarcode(barcode: string): Promise<BarcodeProductResult> {
  try {
    const { data } = await offClient.get<OpenFoodFactsResponse>(
      `/product/${barcode}`,
    );

    if (data.status !== 1 || !data.product) {
      return { found: false, barcode };
    }

    const p = data.product;
    const nome = p.product_name_pt || p.product_name;
    const categoria = mapCategory(p.categories_tags);
    const { quantidade, unidade } = parseQuantity(p.quantity);

    return {
      found: true,
      barcode,
      nome: nome || undefined,
      categoria,
      quantidade,
      unidade,
      marca: p.brands || undefined,
    };
  } catch {
    return { found: false, barcode };
  }
}
