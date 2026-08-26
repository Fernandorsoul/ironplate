// Food Search Service - Busca alimentos na internet
// Usa OpenFoodFacts API (gratuita, sem API key)

import { Food, Macros } from '../types';

interface OpenFoodFactsProduct {
  product_name: string;
  brands?: string;
  categories?: string;
  nutriments: {
    'energy-kcal_100g'?: number;
    'energy-kj_100g'?: number;
    proteins_100g?: number;
    carbohydrates_100g?: number;
    fat_100g?: number;
    fiber_100g?: number;
    sugars_100g?: number;
    'sodium_100g'?: number;
    'salt_100g'?: number;
  };
  image_front_small_url?: string;
  code?: string;
}

interface OpenFoodFactsResponse {
  count: number;
  page: number;
  page_size: number;
  products: OpenFoodFactsProduct[];
}

const API_BASE = 'https://world.openfoodfacts.org/cgi/search.pl';
const SEARCH_PARAMS = {
  search_simple: '1',
  action: 'process',
  json: '1',
  page_size: '20',
  fields: 'product_name,brands,categories,nutriments,image_front_small_url,code',
};

function mapCategory(categories: string): string {
  const cats = categories.toLowerCase();
  if (cats.includes('beverage') || cats.includes('drink') || cats.includes('bebida')) return 'Bebida';
  if (cats.includes('dairy') || cats.includes('milk') || cats.includes('laticínio')) return 'Leite e derivados';
  if (cats.includes('meat') || cats.includes('beef') || cats.includes('chicken')) return 'Carnes e derivados';
  if (cats.includes('fish') || cats.includes('seafood')) return 'Pescados e frutos do mar';
  if (cats.includes('fruit')) return 'Frutas e derivados';
  if (cats.includes('vegetable')) return 'Verduras, hortaliças e derivados';
  if (cats.includes('cereal') || cats.includes('bread') || cats.includes('pasta')) return 'Cereais e derivados';
  if (cats.includes('snack') || cats.includes('sweet')) return 'Industrializados';
  if (cats.includes('oil') || cats.includes('fat')) return 'Gorduras e óleos';
  if (cats.includes('nut') || cats.includes('seed')) return 'Nozes e sementes';
  if (cats.includes('coffee') || cats.includes('café')) return 'Bebida';
  return 'Outro';
}

function mapCategoryPt(productName: string, categories: string): string {
  const text = `${productName} ${categories}`.toLowerCase();
  if (text.includes('café') || text.includes('coffee') || text.includes('cappuccino') || text.includes('pingado')) return 'Bebida';
  if (text.includes('leite') || text.includes('milk') || text.includes('iogurte') || text.includes('yogurt')) return 'Leite e derivados';
  if (text.includes('frango') || text.includes('chicken') || text.includes('carne') || text.includes('beef') || text.includes('porco') || text.includes('pork')) return 'Carnes e derivados';
  if (text.includes('peixe') || text.includes('fish') || text.includes('salmão') || text.includes('atum')) return 'Pescados e frutos do mar';
  if (text.includes('banana') || text.includes('maçã') || text.includes('laranja') || text.includes('fruta')) return 'Frutas e derivados';
  if (text.includes('brócolis') || text.includes('cenoura') || text.includes('alface') || text.includes('tomate')) return 'Verduras, hortaliças e derivados';
  if (text.includes('arroz') || text.includes('feijão') || text.includes('pão') || text.includes('macarrão') || text.includes('aveia')) return 'Cereais e derivados';
  if (text.includes('azeite') || text.includes('óleo') || text.includes('manteiga')) return 'Gorduras e óleos';
  if (text.includes('amendoim') || text.includes('amêndoa') || text.includes('castanha')) return 'Nozes e sementes';
  if (text.includes('whey') || text.includes('protein') || text.includes('suplemento')) return 'Suplementos';
  return 'Industrializados';
}

function mapProductToFood(product: OpenFoodFactsProduct): Food | null {
  if (!product.product_name || !product.nutriments) return null;

  const n = product.nutriments;
  const calories = n['energy-kcal_100g'] || (n['energy-kj_100g'] ? Math.round(n['energy-kj_100g'] / 4.184) : 0);

  if (calories === 0 && !n.proteins_100g && !n.carbohydrates_100g && !n.fat_100g) return null;

  const macros: Macros = {
    calories: Math.round(calories * 10) / 10,
    protein: Math.round((n.proteins_100g || 0) * 10) / 10,
    carbs: Math.round((n.carbohydrates_100g || 0) * 10) / 10,
    fat: Math.round((n.fat_100g || 0) * 10) / 10,
  };

  const category = mapCategoryPt(product.product_name, product.categories || '');

  return {
    id: `off_${product.code || Date.now()}`,
    name: product.product_name,
    macros,
    category,
  };
}

export async function searchFoodOnline(query: string): Promise<Food[]> {
  if (!query.trim()) return [];

  try {
    const params = new URLSearchParams({
      ...SEARCH_PARAMS,
      search_terms: query.trim(),
    });

    const url = `${API_BASE}?${params.toString()}`;
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'IronPlate/1.0 (nutrition-app)',
      },
    });

    if (!response.ok) {
      console.error('OpenFoodFacts API error:', response.status);
      return [];
    }

    const data: OpenFoodFactsResponse = await response.json();

    if (!data.products || data.products.length === 0) return [];

    return data.products
      .map(mapProductToFood)
      .filter((f): f is Food => f !== null);
  } catch (error) {
    console.error('Error searching food online:', error);
    return [];
  }
}

export async function searchFoodByBarcode(barcode: string): Promise<Food | null> {
  try {
    const response = await fetch(
      `https://world.openfoodfacts.org/api/v0/product/${barcode}.json`,
      {
        headers: {
          'User-Agent': 'IronPlate/1.0 (nutrition-app)',
        },
      }
    );

    if (!response.ok) return null;

    const data = await response.json();
    if (!data.product) return null;

    return mapProductToFood(data.product);
  } catch (error) {
    console.error('Error fetching product by barcode:', error);
    return null;
  }
}
