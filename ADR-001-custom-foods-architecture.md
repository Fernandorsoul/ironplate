# ADR-001: Custom Foods Architecture

## Status: Accepted

## Context
O IronPlate tem um banco fixo de 20 alimentos em `src/constants/foods.ts`. Usuários precisam registrar alimentos não listados. A solução deve manter offline-first e não introduzir dependências externas.

## Decisão
Estender o storage existente com uma coleção `customFoods` separada, mesclada com `FOOD_DATABASE` na busca.

### Alternativas Consideradas
1. **Array único no AsyncStorage** — Rejeitado: mistura dados estáticos com dinâmicos, dificulta migração.
2. **Coleção separada + merge na busca** — Aceito: mantém banco original intacto, custom foods persistidos separadamente.
3. **SQLite** — Rejeitado: complexidade desnecessária para ~100 alimentos customizados.

## Consequências
- `storage.ts` ganha `saveCustomFoods` / `loadCustomFoods`
- `AppContext` ganha estado `customFoods` e `addCustomFood`
- `AddMealScreen` mergeia `FOOD_DATABASE + customFoods` na busca
- Tela de "Novo Alimento" com nome, categoria, macros/100g
