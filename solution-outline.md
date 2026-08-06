# Solution Outline — IronPlate P0 Features

## Arquitetura Geral
- **Estado**: Context API existente (`AppContext`) — estender, não substituir
- **Persistência**: AsyncStorage existente — adicionar chaves conforme necessário
- **Navegação**: React Navigation existente — adicionar telas ao Stack
- **Padrão de componente**: Screen → ScrollView → Cards (consistente com código existente)

## Feature 1: Custom Foods (US-01)

### Novos arquivos
- `src/screens/AddFoodScreen.tsx` — formulário de novo alimento

### Modificações
- `src/services/storage.ts` — adicionar `saveCustomFoods`, `loadCustomFoods`
- `src/context/AppContext.tsx` — adicionar `customFoods`, `addCustomFood`
- `src/screens/AddMealScreen.tsx` — merge `FOOD_DATABASE + customFoods` na busca
- `App.tsx` — adicionar rota `AddFood`

### Schema do CustomFood
```typescript
// Usa interface Food existente com campo adicional isCustom
interface CustomFood extends Food {
  isCustom: true;
}
```

## Feature 2: Victory Native Chart (US-02)

### Modificações
- `src/screens/WeightScreen.tsx` — substituir `chartBars` por VictoryChart

### Componentes Victory usados
- `VictoryChart` — container
- `VictoryLine` — linha de tendência
- `VictoryScatter` — pontos interativos
- `VictoryVoronoiContainer` — tooltip ao toque
- `VictoryTheme` — tema escuro consistente

## Feature 3: Editable Meal Plan (US-03)

### Novos arquivos
- `src/screens/EditMealPlanScreen.tsx` — edição de plano existente

### Modificações
- `src/screens/MealPlanScreen.tsx` — botão "Editar" nos planos
- `App.tsx` — adicionar rota `EditMealPlan`

### Funcionalidade
- Adicionar refeição ao plano (reusa lógica de AddMeal)
- Remover refeição do plano
- Recálculo automático de totais

## Feature 4: Delete Meal (US-04)

### Modificações
- `src/screens/HomeScreen.tsx` — botão delete em cada mealCard
- `src/context/AppContext.tsx` — adicionar `removeMealFromToday`

### UX
- Botão "✕" em cada refeição na HomeScreen
- Alert de confirmação antes de excluir
- Recálculo de `totalMacros` do dia

## Estratégia de Teste
- Smoke test manual: cada feature isolada
- Validação offline: AsyncStorage persiste corretamente
- Validação de cálculo: macros recalculam ao adicionar/remover
- Validação de navegação: todas as rotas funcionam

## Próximo Agente
**tech-lead** — quebrar em tarefas com estimativas e dependências
