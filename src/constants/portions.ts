import { FoodPortionDef } from '../types';

// Common portion definitions for Brazilian foods
// Maps food name patterns to their portion definitions
export const PORTION_DEFINITIONS: Record<string, FoodPortionDef[]> = {
  // Eggs
  'ovo': [{ unit: 'unidade', gramsPerUnit: 50, label: '1 ovo (~50g)' }],
  'ovos': [{ unit: 'unidade', gramsPerUnit: 50, label: '1 ovo (~50g)' }],

  // Bread
  'pão': [{ unit: 'fatia', gramsPerUnit: 50, label: '1 fatia (~50g)' }],
  'pao': [{ unit: 'fatia', gramsPerUnit: 50, label: '1 fatia (~50g)' }],
  'pão de forma': [{ unit: 'fatia', gramsPerUnit: 25, label: '1 fatia (~25g)' }],
  'pão integral': [{ unit: 'fatia', gramsPerUnit: 50, label: '1 fatia (~50g)' }],

  // Fruits
  'banana': [{ unit: 'unidade', gramsPerUnit: 120, label: '1 banana (~120g)' }],
  'maçã': [{ unit: 'unidade', gramsPerUnit: 180, label: '1 maçã (~180g)' }],
  'maca': [{ unit: 'unidade', gramsPerUnit: 180, label: '1 maçã (~180g)' }],
  'laranja': [{ unit: 'unidade', gramsPerUnit: 150, label: '1 laranja (~150g)' }],
  'mamão': [{ unit: 'fatia', gramsPerUnit: 100, label: '1 fatia (~100g)' }],
  'mamao': [{ unit: 'fatia', gramsPerUnit: 100, label: '1 fatia (~100g)' }],
  'abacaxi': [{ unit: 'fatia', gramsPerUnit: 100, label: '1 fatia (~100g)' }],
  'melancia': [{ unit: 'fatia', gramsPerUnit: 200, label: '1 fatia (~200g)' }],
  'morango': [{ unit: 'unidade', gramsPerUnit: 12, label: '1 morango (~12g)' }],
  'uva': [{ unit: 'unidade', gramsPerUnit: 5, label: '1 uva (~5g)' }],

  // Dairy
  'queijo': [{ unit: 'fatia', gramsPerUnit: 30, label: '1 fatia (~30g)' }],
  'queijo mussarela': [{ unit: 'fatia', gramsPerUnit: 30, label: '1 fatia (~30g)' }],
  'queijo minas': [{ unit: 'fatia', gramsPerUnit: 30, label: '1 fatia (~30g)' }],
  'leite': [{ unit: 'ml', gramsPerUnit: 1, label: '1ml = 1g' }],
  'iogurte': [{ unit: 'unidade', gramsPerUnit: 170, label: '1 pote (~170g)' }],

  // Grains
  'arroz': [{ unit: 'colher', gramsPerUnit: 100, label: '1 colher (~100g)' }],
  'feijão': [{ unit: 'colher', gramsPerUnit: 100, label: '1 colher (~100g)' }],
  'feijao': [{ unit: 'colher', gramsPerUnit: 100, label: '1 colher (~100g)' }],
  'aveia': [{ unit: 'colher', gramsPerUnit: 20, label: '1 colher (~20g)' }],
  'macarrão': [{ unit: 'xicara', gramsPerUnit: 200, label: '1 xícara (~200g)' }],
  'macarrao': [{ unit: 'xicara', gramsPerUnit: 200, label: '1 xícara (~200g)' }],

  // Meat
  'frango': [{ unit: 'unidade', gramsPerUnit: 150, label: '1 filé (~150g)' }],
  'peito de frango': [{ unit: 'unidade', gramsPerUnit: 150, label: '1 filé (~150g)' }],
  'carne': [{ unit: 'unidade', gramsPerUnit: 150, label: '1 porção (~150g)' }],
  'carne moída': [{ unit: 'colher', gramsPerUnit: 100, label: '1 colher (~100g)' }],
  'carne moida': [{ unit: 'colher', gramsPerUnit: 100, label: '1 colher (~100g)' }],
  'peixe': [{ unit: 'unidade', gramsPerUnit: 150, label: '1 filé (~150g)' }],
  'sardinha': [{ unit: 'unidade', gramsPerUnit: 40, label: '1 lata (~40g)' }],

  // Vegetables
  'batata': [{ unit: 'unidade', gramsPerUnit: 150, label: '1 batata (~150g)' }],
  'batata doce': [{ unit: 'unidade', gramsPerUnit: 150, label: '1 batata (~150g)' }],
  'tomate': [{ unit: 'unidade', gramsPerUnit: 100, label: '1 tomate (~100g)' }],
  'cebola': [{ unit: 'unidade', gramsPerUnit: 100, label: '1 cebola (~100g)' }],
  'alho': [{ unit: 'dente', gramsPerUnit: 5, label: '1 dente (~5g)' }],
  'cenoura': [{ unit: 'unidade', gramsPerUnit: 100, label: '1 cenoura (~100g)' }],
  'brócolis': [{ unit: 'xicara', gramsPerUnit: 90, label: '1 xícara (~90g)' }],
  'brocolis': [{ unit: 'xicara', gramsPerUnit: 90, label: '1 xícara (~90g)' }],
  'alface': [{ unit: 'xicara', gramsPerUnit: 30, label: '1 xícara (~30g)' }],
  'pepino': [{ unit: 'unidade', gramsPerUnit: 100, label: '1 pepino (~100g)' }],

  // Nuts
  'amendoim': [{ unit: 'colher', gramsPerUnit: 15, label: '1 colher (~15g)' }],
  'castanha': [{ unit: 'unidade', gramsPerUnit: 3, label: '1 castanha (~3g)' }],
  'castanha de caju': [{ unit: 'unidade', gramsPerUnit: 3, label: '1 castanha (~3g)' }],
  'noz': [{ unit: 'unidade', gramsPerUnit: 6, label: '1 noz (~6g)' }],
  'amêndoa': [{ unit: 'unidade', gramsPerUnit: 1, label: '1 amêndoa (~1g)' }],
  'amendoa': [{ unit: 'unidade', gramsPerUnit: 1, label: '1 amêndoa (~1g)' }],

  // Beverages
  'café': [{ unit: 'ml', gramsPerUnit: 1, label: '1ml = 1g' }],
  'cafe': [{ unit: 'ml', gramsPerUnit: 1, label: '1ml = 1g' }],
  'suco': [{ unit: 'ml', gramsPerUnit: 1, label: '1ml = 1g' }],
  'refrigerante': [{ unit: 'ml', gramsPerUnit: 1, label: '1ml = 1g' }],
  'cerveja': [{ unit: 'ml', gramsPerUnit: 1, label: '1ml = 1g' }],
  'vinho': [{ unit: 'ml', gramsPerUnit: 1, label: '1ml = 1g' }],
  'água': [{ unit: 'ml', gramsPerUnit: 1, label: '1ml = 1g' }],
  'agua': [{ unit: 'ml', gramsPerUnit: 1, label: '1ml = 1g' }],

  // Oils and fats
  'azeite': [{ unit: 'colher', gramsPerUnit: 10, label: '1 colher (~10g)' }],
  'óleo': [{ unit: 'colher', gramsPerUnit: 10, label: '1 colher (~10g)' }],
  'oleo': [{ unit: 'colher', gramsPerUnit: 10, label: '1 colher (~10g)' }],
  'manteiga': [{ unit: 'colher', gramsPerUnit: 10, label: '1 colher (~10g)' }],
  'margarina': [{ unit: 'colher', gramsPerUnit: 10, label: '1 colher (~10g)' }],

  // Sweets
  'chocolate': [{ unit: 'fatia', gramsPerUnit: 25, label: '1 quadradinho (~25g)' }],
  'mel': [{ unit: 'colher', gramsPerUnit: 20, label: '1 colher (~20g)' }],
  'açúcar': [{ unit: 'colher', gramsPerUnit: 8, label: '1 colher (~8g)' }],
  'acucar': [{ unit: 'colher', gramsPerUnit: 8, label: '1 colher (~8g)' }],

  // Supplements
  'whey': [{ unit: 'colher', gramsPerUnit: 30, label: '1 scoop (~30g)' }],
  'whey protein': [{ unit: 'colher', gramsPerUnit: 30, label: '1 scoop (~30g)' }],
  'proteína': [{ unit: 'colher', gramsPerUnit: 30, label: '1 scoop (~30g)' }],
  'proteina': [{ unit: 'colher', gramsPerUnit: 30, label: '1 scoop (~30g)' }],
  'creatina': [{ unit: 'colher', gramsPerUnit: 5, label: '1 colher (~5g)' }],
};

/**
 * Find matching portion definitions for a food name
 */
export function findPortionsForFood(foodName: string): FoodPortionDef[] | undefined {
  const lowerName = foodName.toLowerCase().trim();

  // Try exact match first
  if (PORTION_DEFINITIONS[lowerName]) {
    return PORTION_DEFINITIONS[lowerName];
  }

  // Try partial match (longest match first)
  const sortedKeys = Object.keys(PORTION_DEFINITIONS).sort((a, b) => b.length - a.length);
  for (const key of sortedKeys) {
    if (lowerName.includes(key)) {
      return PORTION_DEFINITIONS[key];
    }
  }

  return undefined;
}
