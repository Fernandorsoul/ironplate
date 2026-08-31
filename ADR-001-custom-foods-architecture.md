# ADR-001: Arquitetura de alimentos personalizados

## Status

**Substituído.** A decisão original offline-first foi superada pela adoção da API e do Neon como fonte de verdade.

## Contexto original

O catálogo estático não cobria todos os alimentos usados pelos atletas. A primeira solução manteve uma coleção separada em AsyncStorage e a mesclou ao catálogo interno durante a busca.

## Decisão vigente

Alimentos personalizados são persistidos na tabela `custom_foods`, sempre associados ao usuário autenticado.

```text
AddFoodScreen
  → AppContext.addCustomFood
  → services/database.saveCustomFood
  → POST /api/users/custom-foods
  → Neon custom_foods
```

Após login, `AppContext` busca a coleção pela API. `AddMealScreen` mescla os alimentos personalizados em memória com o catálogo TACO para busca e seleção.

## Alternativas consideradas

1. Misturar dados estáticos e personalizados em um único array local — rejeitado por dificultar origem e sincronização.
2. Coleção separada somente em AsyncStorage — adotada inicialmente e depois substituída por não sincronizar dispositivos e manter dados no aparelho.
3. SQLite local — não adotado; adicionaria outra fonte de verdade e complexidade de sincronização.
4. Tabela por usuário no Neon — decisão atual, alinhada às demais coleções persistentes.

## Consequências

- O usuário precisa estar autenticado para criar alimentos.
- Os dados acompanham a conta entre sessões e dispositivos.
- A API valida identidade e macros antes da persistência.
- AsyncStorage não armazena a coleção atual; o serviço de storage apenas limpa caches legados.
- A busca online da Open Food Facts é complementar e não persiste resultados automaticamente como alimento personalizado.

## Arquivos relacionados

- `api/db/schema.ts`
- `api/users/custom-foods.ts`
- `src/context/AppContext.tsx`
- `src/services/database.ts`
- `src/screens/AddFoodScreen.tsx`
- `src/screens/AddMealScreen.tsx`
