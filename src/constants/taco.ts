// Tabela TACO - Tabela Brasileira de Composição de Alimentos (UNICAMP)
// Fonte: NEPA-UNICAMP (4ª edição)
// Macros por 100g de alimento

import { Food } from '../types';

// ============================================================
// CATEGORIAS TACO
// ============================================================

export const TACO_CATEGORIES = [
  'Cereais e derivados',
  'Verduras, hortaliças e derivados',
  'Frutas e derivados',
  'Gorduras e óleos',
  'Pescados e frutos do mar',
  'Carnes e derivados',
  'Leite e derivados',
  'Bebidas',
  'Ovos e derivados',
  'Produtos açucarados',
  'Miscelâneas',
  'Leguminosas e derivados',
  'Nozes e sementes',
] as const;

export type TacoCategory = typeof TACO_CATEGORIES[number];

// ============================================================
// TABELA TACO COMPLETA (principais alimentos para atletas)
// ============================================================

export const TACO_DATABASE: Food[] = [
  // ────────────────────────────────────────────────────────
  // CEREAIS E DERIVADOS
  // ────────────────────────────────────────────────────────
  { id: 'taco_001', name: 'Arroz branco, cozido', macros: { calories: 128, protein: 2.5, carbs: 28.1, fat: 0.2 }, category: 'Cereais e derivados' },
  { id: 'taco_002', name: 'Arroz integral, cozido', macros: { calories: 124, protein: 2.6, carbs: 25.8, fat: 1.0 }, category: 'Cereais e derivados' },
  { id: 'taco_003', name: 'Aveia, flocos', macros: { calories: 394, protein: 13.9, carbs: 66.6, fat: 8.5 }, category: 'Cereais e derivados' },
  { id: 'taco_004', name: 'Macarrão, cozido', macros: { calories: 131, protein: 4.6, carbs: 25.4, fat: 1.1 }, category: 'Cereais e derivados' },
  { id: 'taco_005', name: 'Macarrão integral, cozido', macros: { calories: 124, protein: 5.0, carbs: 23.5, fat: 1.4 }, category: 'Cereais e derivados' },
  { id: 'taco_006', name: 'Pão de forma, integral', macros: { calories: 247, protein: 12.7, carbs: 41.0, fat: 3.4 }, category: 'Cereais e derivados' },
  { id: 'taco_007', name: 'Pão de forma, branco', macros: { calories: 280, protein: 9.4, carbs: 51.4, fat: 3.3 }, category: 'Cereais e derivados' },
  { id: 'taco_008', name: 'Pão francês', macros: { calories: 274, protein: 8.6, carbs: 51.7, fat: 3.1 }, category: 'Cereais e derivados' },
  { id: 'taco_009', name: 'Batata-doce, cozida', macros: { calories: 86, protein: 1.6, carbs: 20.1, fat: 0.1 }, category: 'Cereais e derivados' },
  { id: 'taco_010', name: 'Batata inglesa, cozida', macros: { calories: 52, protein: 1.2, carbs: 11.9, fat: 0.1 }, category: 'Cereais e derivados' },
  { id: 'taco_011', name: 'Mandioca (aipim), cozida', macros: { calories: 125, protein: 0.6, carbs: 30.1, fat: 0.2 }, category: 'Cereais e derivados' },
  { id: 'taco_012', name: 'Inhame, cozido', macros: { calories: 78, protein: 1.5, carbs: 18.5, fat: 0.1 }, category: 'Cereais e derivados' },
  { id: 'taco_013', name: 'Milho, grão, cozido', macros: { calories: 98, protein: 3.3, carbs: 18.7, fat: 1.2 }, category: 'Cereais e derivados' },
  { id: 'taco_014', name: 'Quinoa, cozida', macros: { calories: 120, protein: 4.4, carbs: 21.3, fat: 1.8 }, category: 'Cereais e derivados' },
  { id: 'taco_015', name: 'Batata-doce, assada', macros: { calories: 100, protein: 1.7, carbs: 23.4, fat: 0.1 }, category: 'Cereais e derivados' },

  // ────────────────────────────────────────────────────────
  // VERDURAS, HORTALIÇAS E DERIVADOS
  // ────────────────────────────────────────────────────────
  { id: 'taco_016', name: 'Brócolis, cozido', macros: { calories: 25, protein: 2.1, carbs: 4.4, fat: 0.3 }, category: 'Verduras, hortaliças e derivados' },
  { id: 'taco_017', name: 'Couve-flor, cozida', macros: { calories: 15, protein: 1.2, carbs: 2.9, fat: 0.1 }, category: 'Verduras, hortaliças e derivados' },
  { id: 'taco_018', name: 'Espinafre, cozido', macros: { calories: 18, protein: 2.0, carbs: 2.3, fat: 0.3 }, category: 'Verduras, hortaliças e derivados' },
  { id: 'taco_019', name: 'Abobrinha, cozida', macros: { calories: 15, protein: 1.1, carbs: 2.7, fat: 0.1 }, category: 'Verduras, hortaliças e derivados' },
  { id: 'taco_020', name: 'Cenoura, cozida', macros: { calories: 30, protein: 0.8, carbs: 6.7, fat: 0.1 }, category: 'Verduras, hortaliças e derivados' },
  { id: 'taco_021', name: 'Alface, crua', macros: { calories: 11, protein: 1.3, carbs: 1.7, fat: 0.1 }, category: 'Verduras, hortaliças e derivados' },
  { id: 'taco_022', name: 'Tomate, cru', macros: { calories: 15, protein: 0.8, carbs: 3.1, fat: 0.1 }, category: 'Verduras, hortaliças e derivados' },
  { id: 'taco_023', name: 'Cebola, crua', macros: { calories: 39, protein: 1.1, carbs: 8.9, fat: 0.1 }, category: 'Verduras, hortaliças e derivados' },
  { id: 'taco_024', name: 'Pimentão, cru', macros: { calories: 21, protein: 0.9, carbs: 4.9, fat: 0.1 }, category: 'Verduras, hortaliças e derivados' },
  { id: 'taco_025', name: 'Chuchu, cozido', macros: { calories: 19, protein: 0.5, carbs: 4.5, fat: 0.1 }, category: 'Verduras, hortaliças e derivados' },
  { id: 'taco_026', name: 'Repolho, cozido', macros: { calories: 18, protein: 1.0, carbs: 3.8, fat: 0.1 }, category: 'Verduras, hortaliças e derivados' },
  { id: 'taco_027', name: 'Vagem, cozida', macros: { calories: 25, protein: 1.7, carbs: 5.3, fat: 0.1 }, category: 'Verduras, hortaliças e derivados' },

  // ────────────────────────────────────────────────────────
  // FRUTAS E DERIVADOS
  // ────────────────────────────────────────────────────────
  { id: 'taco_028', name: 'Banana, prata', macros: { calories: 98, protein: 1.3, carbs: 26.0, fat: 0.1 }, category: 'Frutas e derivados' },
  { id: 'taco_029', name: 'Banana, nanica', macros: { calories: 92, protein: 1.4, carbs: 23.8, fat: 0.1 }, category: 'Frutas e derivados' },
  { id: 'taco_030', name: 'Maçã, com casca', macros: { calories: 63, protein: 0.3, carbs: 16.6, fat: 0.1 }, category: 'Frutas e derivados' },
  { id: 'taco_031', name: 'Laranja, pêra', macros: { calories: 46, protein: 0.9, carbs: 11.5, fat: 0.1 }, category: 'Frutas e derivados' },
  { id: 'taco_032', name: 'Mamão, formosa', macros: { calories: 45, protein: 0.8, carbs: 11.6, fat: 0.1 }, category: 'Frutas e derivados' },
  { id: 'taco_033', name: 'Melancia', macros: { calories: 33, protein: 0.6, carbs: 8.1, fat: 0.1 }, category: 'Frutas e derivados' },
  { id: 'taco_034', name: 'Abacaxi', macros: { calories: 48, protein: 0.9, carbs: 12.3, fat: 0.1 }, category: 'Frutas e derivados' },
  { id: 'taco_035', name: 'Manga, palmer', macros: { calories: 72, protein: 0.6, carbs: 19.4, fat: 0.1 }, category: 'Frutas e derivados' },
  { id: 'taco_036', name: 'Uva, itália', macros: { calories: 69, protein: 0.7, carbs: 18.5, fat: 0.1 }, category: 'Frutas e derivados' },
  { id: 'taco_037', name: 'Morango', macros: { calories: 33, protein: 0.9, carbs: 7.7, fat: 0.3 }, category: 'Frutas e derivados' },
  { id: 'taco_038', name: 'Abacate', macros: { calories: 96, protein: 1.2, carbs: 6.0, fat: 8.4 }, category: 'Frutas e derivados' },
  { id: 'taco_039', name: 'Maracujá, polpa', macros: { calories: 68, protein: 1.4, carbs: 14.2, fat: 2.1 }, category: 'Frutas e derivados' },
  { id: 'taco_040', name: 'Açaí, polpa', macros: { calories: 70, protein: 1.0, carbs: 6.2, fat: 5.1 }, category: 'Frutas e derivados' },

  // ────────────────────────────────────────────────────────
  // GORDURAS E ÓLEOS
  // ────────────────────────────────────────────────────────
  { id: 'taco_041', name: 'Azeite de oliva', macros: { calories: 884, protein: 0.0, carbs: 0.0, fat: 100.0 }, category: 'Gorduras e óleos' },
  { id: 'taco_042', name: 'Óleo de soja', macros: { calories: 884, protein: 0.0, carbs: 0.0, fat: 100.0 }, category: 'Gorduras e óleos' },
  { id: 'taco_043', name: 'Manteiga', macros: { calories: 726, protein: 0.4, carbs: 0.1, fat: 82.4 }, category: 'Gorduras e óleos' },
  { id: 'taco_044', name: 'Margarina', macros: { calories: 726, protein: 0.2, carbs: 0.0, fat: 82.0 }, category: 'Gorduras e óleos' },

  // ────────────────────────────────────────────────────────
  // PESCADOS E FRUTOS DO MAR
  // ────────────────────────────────────────────────────────
  { id: 'taco_045', name: 'Salmão, filé', macros: { calories: 170, protein: 19.3, carbs: 0.0, fat: 10.4 }, category: 'Pescados e frutos do mar' },
  { id: 'taco_046', name: 'Atum, fresco', macros: { calories: 118, protein: 26.2, carbs: 0.0, fat: 0.8 }, category: 'Pescados e frutos do mar' },
  { id: 'taco_047', name: 'Tilápia, filé', macros: { calories: 96, protein: 20.1, carbs: 0.0, fat: 1.7 }, category: 'Pescados e frutos do mar' },
  { id: 'taco_048', name: 'Sardinha, enlatada', macros: { calories: 208, protein: 24.6, carbs: 0.0, fat: 12.1 }, category: 'Pescados e frutos do mar' },
  { id: 'taco_049', name: 'Merluza, filé', macros: { calories: 87, protein: 17.7, carbs: 0.0, fat: 1.7 }, category: 'Pescados e frutos do mar' },
  { id: 'taco_050', name: 'Camarão, cozido', macros: { calories: 90, protein: 18.6, carbs: 0.7, fat: 1.4 }, category: 'Pescados e frutos do mar' },

  // ────────────────────────────────────────────────────────
  // CARNES E DERIVADOS
  // ────────────────────────────────────────────────────────
  { id: 'taco_051', name: 'Peito de frango, sem pele, grelhado', macros: { calories: 159, protein: 31.5, carbs: 0.0, fat: 3.2 }, category: 'Carnes e derivados' },
  { id: 'taco_052', name: 'Coxa de frango, sem pele, grelhada', macros: { calories: 177, protein: 28.6, carbs: 0.0, fat: 7.0 }, category: 'Carnes e derivados' },
  { id: 'taco_053', name: 'Carne bovina, patinho, grelhado', macros: { calories: 193, protein: 32.4, carbs: 0.0, fat: 6.7 }, category: 'Carnes e derivados' },
  { id: 'taco_054', name: 'Carne bovina, alcatra, grelhada', macros: { calories: 228, protein: 28.6, carbs: 0.0, fat: 12.6 }, category: 'Carnes e derivados' },
  { id: 'taco_055', name: 'Carne bovina, filé mignon, grelhado', macros: { calories: 218, protein: 30.2, carbs: 0.0, fat: 10.6 }, category: 'Carnes e derivados' },
  { id: 'taco_056', name: 'Carne bovina, acém, cozido', macros: { calories: 210, protein: 27.0, carbs: 0.0, fat: 11.3 }, category: 'Carnes e derivados' },
  { id: 'taco_057', name: 'Carne moída (bovina), refogada', macros: { calories: 231, protein: 26.4, carbs: 0.0, fat: 13.8 }, category: 'Carnes e derivados' },
  { id: 'taco_058', name: 'Lombo de porco, grelhado', macros: { calories: 196, protein: 28.9, carbs: 0.0, fat: 8.8 }, category: 'Carnes e derivados' },
  { id: 'taco_059', name: 'Peito de peru, sem pele', macros: { calories: 104, protein: 23.4, carbs: 0.7, fat: 0.6 }, category: 'Carnes e derivados' },
  { id: 'taco_060', name: 'Presunto, fatiado', macros: { calories: 129, protein: 17.5, carbs: 1.2, fat: 6.0 }, category: 'Carnes e derivados' },
  { id: 'taco_061', name: 'Linguiça de frango', macros: { calories: 214, protein: 15.3, carbs: 2.0, fat: 16.5 }, category: 'Carnes e derivados' },
  { id: 'taco_062', name: 'Hambúrguer bovino', macros: { calories: 258, protein: 17.2, carbs: 5.2, fat: 19.8 }, category: 'Carnes e derivados' },

  // ────────────────────────────────────────────────────────
  // OVOS E DERIVADOS
  // ────────────────────────────────────────────────────────
  { id: 'taco_063', name: 'Ovo de galinha, inteiro, cozido', macros: { calories: 146, protein: 13.3, carbs: 0.6, fat: 9.5 }, category: 'Ovos e derivados' },
  { id: 'taco_064', name: 'Ovo de galinha, clara, cozida', macros: { calories: 52, protein: 11.1, carbs: 0.7, fat: 0.2 }, category: 'Ovos e derivados' },
  { id: 'taco_065', name: 'Ovo de galinha, gema, cozida', macros: { calories: 321, protein: 15.9, carbs: 0.6, fat: 28.6 }, category: 'Ovos e derivados' },
  { id: 'taco_066', name: 'Ovo de galinha, mexido', macros: { calories: 168, protein: 12.7, carbs: 1.3, fat: 12.6 }, category: 'Ovos e derivados' },

  // ────────────────────────────────────────────────────────
  // LEITE E DERIVADOS
  // ────────────────────────────────────────────────────────
  { id: 'taco_067', name: 'Leite, integral', macros: { calories: 61, protein: 3.2, carbs: 4.8, fat: 3.3 }, category: 'Leite e derivados' },
  { id: 'taco_068', name: 'Leite, desnatado', macros: { calories: 36, protein: 3.4, carbs: 5.0, fat: 0.1 }, category: 'Leite e derivados' },
  { id: 'taco_069', name: 'Iogurte, natural', macros: { calories: 51, protein: 4.1, carbs: 3.6, fat: 1.5 }, category: 'Leite e derivados' },
  { id: 'taco_070', name: 'Iogurte, grego', macros: { calories: 97, protein: 9.0, carbs: 3.6, fat: 5.0 }, category: 'Leite e derivados' },
  { id: 'taco_071', name: 'Queijo, cottage', macros: { calories: 98, protein: 11.8, carbs: 3.4, fat: 4.3 }, category: 'Leite e derivados' },
  { id: 'taco_072', name: 'Queijo, minas frescal', macros: { calories: 264, protein: 17.4, carbs: 3.4, fat: 20.6 }, category: 'Leite e derivados' },
  { id: 'taco_073', name: 'Queijo, muçarela', macros: { calories: 330, protein: 22.6, carbs: 3.1, fat: 26.0 }, category: 'Leite e derivados' },
  { id: 'taco_074', name: 'Queijo, parmesão', macros: { calories: 453, protein: 35.8, carbs: 3.7, fat: 33.6 }, category: 'Leite e derivados' },
  { id: 'taco_075', name: 'Requeijão, cremoso', macros: { calories: 257, protein: 11.3, carbs: 3.5, fat: 22.6 }, category: 'Leite e derivados' },
  { id: 'taco_076', name: 'Whey protein (referência)', macros: { calories: 120, protein: 24.0, carbs: 3.0, fat: 1.5 }, category: 'Leite e derivados' },

  // ────────────────────────────────────────────────────────
  // LEGUMINOSAS E DERIVADOS
  // ────────────────────────────────────────────────────────
  { id: 'taco_077', name: 'Feijão, carioca, cozido', macros: { calories: 112, protein: 7.8, carbs: 18.8, fat: 0.5 }, category: 'Leguminosas e derivados' },
  { id: 'taco_078', name: 'Feijão, preto, cozido', macros: { calories: 114, protein: 8.9, carbs: 18.4, fat: 0.5 }, category: 'Leguminosas e derivados' },
  { id: 'taco_079', name: 'Lentilha, cozida', macros: { calories: 93, protein: 7.0, carbs: 15.3, fat: 0.4 }, category: 'Leguminosas e derivados' },
  { id: 'taco_080', name: 'Grão-de-bico, cozido', macros: { calories: 121, protein: 7.0, carbs: 18.0, fat: 2.4 }, category: 'Leguminosas e derivados' },
  { id: 'taco_081', name: 'Ervilha, cozida', macros: { calories: 73, protein: 5.4, carbs: 11.0, fat: 0.3 }, category: 'Leguminosas e derivados' },
  { id: 'taco_082', name: 'Soja, cozida', macros: { calories: 141, protein: 12.5, carbs: 9.9, fat: 6.4 }, category: 'Leguminosas e derivados' },

  // ────────────────────────────────────────────────────────
  // NOZES E SEMENTES
  // ────────────────────────────────────────────────────────
  { id: 'taco_083', name: 'Amêndoas', macros: { calories: 579, protein: 21.2, carbs: 21.7, fat: 50.6 }, category: 'Nozes e sementes' },
  { id: 'taco_084', name: 'Castanha-do-pará', macros: { calories: 656, protein: 14.5, carbs: 12.8, fat: 66.6 }, category: 'Nozes e sementes' },
  { id: 'taco_085', name: 'Castanha-de-caju', macros: { calories: 570, protein: 18.5, carbs: 29.1, fat: 46.3 }, category: 'Nozes e sementes' },
  { id: 'taco_086', name: 'Nozes', macros: { calories: 651, protein: 14.3, carbs: 15.2, fat: 63.7 }, category: 'Nozes e sementes' },
  { id: 'taco_087', name: 'Amendoim, torrado', macros: { calories: 571, protein: 25.6, carbs: 18.7, fat: 47.1 }, category: 'Nozes e sementes' },
  { id: 'taco_088', name: 'Chia', macros: { calories: 486, protein: 16.5, carbs: 42.1, fat: 30.7 }, category: 'Nozes e sementes' },
  { id: 'taco_089', name: 'Linhaça', macros: { calories: 534, protein: 18.3, carbs: 28.9, fat: 42.2 }, category: 'Nozes e sementes' },
  { id: 'taco_090', name: 'Pasta de amendoim', macros: { calories: 588, protein: 25.1, carbs: 20.0, fat: 50.4 }, category: 'Nozes e sementes' },
  { id: 'taco_091', name: 'Coco, ralado', macros: { calories: 406, protein: 3.6, carbs: 14.0, fat: 38.6 }, category: 'Nozes e sementes' },

  // ────────────────────────────────────────────────────────
  // PRODUTOS AÇUCARADOS (referência)
  // ────────────────────────────────────────────────────────
  { id: 'taco_092', name: 'Mel, de abelha', macros: { calories: 309, protein: 0.3, carbs: 84.4, fat: 0.0 }, category: 'Produtos açucarados' },
  { id: 'taco_093', name: 'Açúcar, cristal', macros: { calories: 387, protein: 0.0, carbs: 99.6, fat: 0.0 }, category: 'Produtos açucarados' },

  // ────────────────────────────────────────────────────────
  // BEBIDAS
  // ────────────────────────────────────────────────────────
  { id: 'taco_094', name: 'Suco de laranja, natural', macros: { calories: 36, protein: 0.5, carbs: 8.4, fat: 0.1 }, category: 'Bebidas' },
  { id: 'taco_095', name: 'Água de coco', macros: { calories: 22, protein: 0.3, carbs: 5.3, fat: 0.1 }, category: 'Bebidas' },
];

// ============================================================
// ÍNDICE POR CATEGORIA (para busca rápida)
// ============================================================

export const TACO_BY_CATEGORY: Record<string, Food[]> = {};
for (const food of TACO_DATABASE) {
  if (!TACO_BY_CATEGORY[food.category]) {
    TACO_BY_CATEGORY[food.category] = [];
  }
  TACO_BY_CATEGORY[food.category].push(food);
}

// ============================================================
// BUSCA POR NOME (case-insensitive, parcial)
// ============================================================

export function searchTACO(query: string): Food[] {
  const q = query.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  return TACO_DATABASE.filter(food =>
    food.name.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').includes(q)
  );
}

// ============================================================
// ALIMENTOS COMBINADOS (TACO + custom foods)
// ============================================================

export function getAllFoods(customFoods: Food[]): Food[] {
  return [...TACO_DATABASE, ...customFoods];
}
