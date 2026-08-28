import { Food, FoodPortion, FoodPortionDef } from '../types';
import { findPortionsForFood } from '../constants/portions';

const PLURAL_MEASURES: Record<string, string> = {
  amêndoa: 'amêndoas',
  banana: 'bananas',
  batata: 'batatas',
  castanha: 'castanhas',
  clara: 'claras',
  colher: 'colheres',
  'colher de sopa': 'colheres de sopa',
  dente: 'dentes',
  fatia: 'fatias',
  filé: 'filés',
  lata: 'latas',
  ml: 'ml',
  morango: 'morangos',
  noz: 'nozes',
  ovo: 'ovos',
  pote: 'potes',
  porção: 'porções',
  quadradinho: 'quadradinhos',
  scoop: 'scoops',
  tomate: 'tomates',
  unidade: 'unidades',
  uva: 'uvas',
  xícara: 'xícaras',
};

function formatDecimal(value: number, maximumFractionDigits = 2): string {
  const rounded = Number(value.toFixed(maximumFractionDigits));
  return rounded.toString().replace('.', ',');
}

function getPortionDefinitions(food: Food): FoodPortionDef[] | undefined {
  return food.portions?.length ? food.portions : findPortionsForFood(food.name);
}

function getPreferredDefinition(portion: Pick<FoodPortion, 'food' | 'unit'>): FoodPortionDef | undefined {
  const definitions = getPortionDefinitions(portion.food);
  if (!definitions?.length) return undefined;

  if (portion.unit && portion.unit !== 'g') {
    const matchingDefinition = definitions.find(definition => definition.unit === portion.unit);
    if (matchingDefinition) return matchingDefinition;
  }

  return definitions.find(definition => definition.unit !== 'g') || definitions[0];
}

function getMeasureName(definition: FoodPortionDef): string {
  const labelMeasure = definition.label?.match(/^1\s*([^=(]+?)(?:\s*\(|\s*=)/i)?.[1]?.trim();
  if (labelMeasure) return labelMeasure;

  const unitLabels: Record<FoodPortionDef['unit'], string> = {
    unidade: 'unidade',
    fatia: 'fatia',
    colher: 'colher',
    xicara: 'xícara',
    ml: 'ml',
    g: 'g',
    dente: 'dente',
  };
  return unitLabels[definition.unit];
}

function pluralizeMeasure(measure: string, quantity: number): string {
  if (Math.abs(quantity) <= 1) return measure;
  return PLURAL_MEASURES[measure] || `${measure}s`;
}

export function getPortionQuantity(food: Food, grams: number): Pick<FoodPortion, 'quantity' | 'unit'> {
  const definition = getPortionDefinitions(food)?.find(item => item.unit !== 'g');
  if (!definition || definition.gramsPerUnit <= 0) return {};

  return {
    quantity: Number((grams / definition.gramsPerUnit).toFixed(2)),
    unit: definition.unit,
  };
}

/**
 * Formats a portion with a practical household measure and its exact weight.
 * Household conversions are approximate; grams remain the nutritional reference.
 */
export function formatPortionAmount(portion: Pick<FoodPortion, 'food' | 'grams' | 'quantity' | 'unit'>): string {
  const gramsLabel = `${formatDecimal(portion.grams, 1)} g`;
  const definition = getPreferredDefinition(portion);

  if (definition && definition.gramsPerUnit > 0 && definition.unit !== 'g') {
    const quantity = portion.grams / definition.gramsPerUnit;
    const measure = pluralizeMeasure(getMeasureName(definition), quantity);
    return `aprox. ${formatDecimal(quantity)} ${measure} (${gramsLabel})`;
  }

  if (portion.quantity && portion.unit && portion.unit !== 'g') {
    const unit = portion.unit === 'xicara' ? 'xícara' : portion.unit;
    return `aprox. ${formatDecimal(portion.quantity)} ${pluralizeMeasure(unit, portion.quantity)} (${gramsLabel})`;
  }

  return gramsLabel;
}

export function formatFoodPortion(portion: Pick<FoodPortion, 'food' | 'grams' | 'quantity' | 'unit'>): string {
  return `${portion.food.name}: ${formatPortionAmount(portion)}`;
}
