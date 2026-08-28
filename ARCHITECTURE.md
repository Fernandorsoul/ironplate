# Arquitetura do IronPlate

## Visão Geral

IronPlate é um aplicativo React Native (Expo) para nutrição esportiva, seguindo arquitetura baseada em componentes com estado global via Context API.

## Diagrama de Arquitetura

```
┌─────────────────────────────────────────────────────────────┐
│                        App.tsx                               │
│  ┌─────────────────────────────────────────────────────┐   │
│  │                    AppProvider                       │   │
│  │  ┌───────────────────────────────────────────────┐  │   │
│  │  │              NavigationContainer               │  │   │
│  │  │  ┌─────────────────────────────────────────┐  │  │   │
│  │  │  │           AppNavigator                   │  │  │   │
│  │  │  │  ┌─────────┐ ┌─────────┐ ┌──────────┐  │  │  │   │
│  │  │  │  │  Login  │ │Register │ │Onboarding│  │  │  │   │
│  │  │  │  └─────────┘ └─────────┘ └──────────┘  │  │  │   │
│  │  │  │  ┌─────────────────────────────────┐   │  │  │   │
│  │  │  │  │          MainTabs               │   │  │  │   │
│  │  │  │  │  ┌─────┐ ┌──────┐ ┌──────┐    │   │  │  │   │
│  │  │  │  │  │Home │ │Plans │ │Weight│    │   │  │  │   │
│  │  │  │  │  └─────┘ └──────┘ └──────┘    │   │  │  │   │
│  │  │  │  └─────────────────────────────────┘   │  │  │   │
│  │  │  └─────────────────────────────────────────┘  │  │   │
│  │  └───────────────────────────────────────────────┘  │   │
│  └─────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

## Camadas

### 1. Apresentação (Screens + Components)

```
src/screens/          # Telas principais
src/components/       # Componentes reutilizáveis
```

**Responsabilidade:** UI, interações do usuário, navegação.

**Componentes Reutilizáveis:**
- `MacroCard` - Exibe progresso de macros
- `ActionButton` - Botão com ícone e label
- `MealCard` - Card de refeição com macros
- `ScreenHeader` - Header com botão voltar

### 2. Estado (Context API)

```
src/context/AppContext.tsx
```

**Responsabilidade:** Estado global, autenticação, persistência.

**Estado Gerenciado:**
- `userId` - ID do usuário autenticado
- `profile` - Perfil do usuário
- `targetMacros` - Macros alvo calculados
- `dailyLogs` - Logs diários
- `mealPlans` - Planos alimentares
- `weightHistory` - Histórico de peso
- `customFoods` - Alimentos customizados

**Funções:**
- `login(email, password)` - Autenticação
- `register(name, email, password)` - Cadastro
- `logout()` - Encerrar sessão
- `setProfile(profile)` - Atualizar perfil
- `addMealToToday(meal)` - Adicionar refeição
- `saveMealPlan(plan)` - Salvar plano

### 3. Serviços (Data Layer)

```
src/services/database.ts   # SQLite + fallback web
src/services/storage.ts    # AsyncStorage
```

**Responsabilidade:** Persistência, acesso a dados.

**Estratégia de Persistência:**
- **Mobile:** SQLite (expo-sqlite)
- **Web:** In-memory storage (fallback)
- **AsyncStorage:** Dados do perfil e configurações

### 4. Utilitários (Business Logic)

```
src/utils/calculations.ts    # Cálculos nutricionais
src/utils/dietGenerator.ts   # Geração de dietas
src/utils/dietPdfGenerator.ts # PDF de dietas
src/utils/portionDisplay.ts  # Medidas caseiras + gramas
src/utils/pdfGenerator.ts    # PDF de medidas
```

**Responsabilidade:** Lógica de negócio pura, cálculos.

`portionDisplay.ts` centraliza a resolução e a formatação das porções. O gerador persiste `quantity` e `unit` quando existe uma conversão conhecida, enquanto a camada de apresentação também consegue derivar a medida caseira a partir dos gramas para manter compatibilidade com planos antigos.

### 5. Hooks (Custom Hooks)

```
src/hooks/useMacros.ts       # Cálculo de macros
src/hooks/useWeightTrend.ts  # Tendência de peso
src/hooks/useFoodSearch.ts   # Busca de alimentos
```

**Responsabilidade:** Lógica reutilizável de estado.

### 6. Constantes (Configuration)

```
src/constants/theme.ts   # Tema visual
src/constants/taco.ts    # Tabela TACO
src/constants/foods.ts   # Foods legado
```

**Responsabilidade:** Dados estáticos, configurações.

## Fluxo de Dados

### Fluxo de Autenticação

```
┌─────────┐    ┌─────────┐    ┌─────────┐
│  Login  │───>│ Context │───>│ Storage │
│ Screen  │    │ .login()│    │ .save() │
└─────────┘    └────┬────┘    └─────────┘
                    │
                    ▼
              ┌─────────┐
              │ userId  │
              │ set     │
              └────┬────┘
                   │
                   ▼
             ┌──────────┐
             │ isAuth = │
             │   true   │
             └──────────┘
```

### Fluxo de Geração de Dieta

```
┌──────────────┐    ┌──────────────┐    ┌──────────────┐
│ MealPlan     │───>│ dietGenerator│───>│ MealPlan[]   │
│ Screen       │    │ .generate()  │    │ (3 opções)   │
└──────────────┘    └──────────────┘    └──────────────┘
                                              │
                                              ▼
                                       ┌──────────────┐
                                       │ TACO_DATABASE │
                                       │ (alimentos)   │
                                       └──────────────┘
```

### Fluxo de Persistência

```
┌─────────┐    ┌─────────┐    ┌─────────┐
│ Screen  │───>│ Context │───>│ Service │
│ Action  │    │ .func() │    │ .save() │
└─────────┘    └─────────┘    └────┬────┘
                                   │
                    ┌──────────────┼──────────────┐
                    ▼              ▼              ▼
              ┌─────────┐   ┌─────────┐   ┌─────────┐
              │  SQLite │   │  Async  │   │ Memory  │
              │ (mobile)│   │ Storage │   │  (web)  │
              └─────────┘   └─────────┘   └─────────┘
```

## Decisões de Arquitetura

### ADR-001: Context API vs Redux

**Decisão:** Usar Context API

**Justificativa:**
- Menor bundle size
- Menos boilerplate
- Suficiente para escopo do app
- Nativo do React

### ADR-002: AsyncStorage vs SQLite

**Decisão:** Ambos (AsyncStorage para config, SQLite para dados)

**Justificativa:**
- AsyncStorage: Simples, offline-first
- SQLite: Queries complexas, relacionamentos
- Fallback web: In-memory storage

### ADR-003: Tabela TACO como Fonte Única

**Decisão:** Usar TACO (UNICAMP) como base nutricional

**Justificativa:**
- Dados brasileiros confiáveis
- Padronizado
- Referência acadêmica

## Padrões de Código

### Componentes

```typescript
// Componente funcional com TypeScript
interface Props {
  title: string;
  onPress: () => void;
}

export function MyComponent({ title, onPress }: Props) {
  return (
    <TouchableOpacity onPress={onPress}>
      <Text>{title}</Text>
    </TouchableOpacity>
  );
}
```

### Hooks

```typescript
// Hook com lógica pura
export function useMyHook(data: Data[]): Result {
  return useMemo(() => {
    // lógica
    return result;
  }, [data]);
}
```

### Services

```typescript
// Service com fallback web
export async function saveData(data: Data): Promise<void> {
  if (isWeb) {
    // fallback web
    return;
  }
  // lógica mobile
}
```

## Dependências Críticas

| Dependência | Uso | Risco |
|-------------|-----|-------|
| expo-sqlite | Persistência mobile | Baixo |
| @react-navigation | Navegação | Baixo |
| victory-native | Gráficos | Médio (web compat) |
| @react-native-async-storage | Config storage | Baixo |

## Segurança

- **Autenticação:** Hash SHA256 com salt
- **Persistência:** Dados locais (offline-first)
- **Senhas:** Nunca armazenadas em texto plano

## Performance

- **Lazy loading:** Screens carregadas sob demanda
- **Memoização:** Hooks use useMemo/useCallback
- **Bundle size:** Tree shaking automático (Expo)

## Monitoramento

- **Testes Unitários:** 46 testes (Jest)
- **Testes E2E:** 27 testes (Playwright)
- **CI/CD:** GitHub Actions
- **Branch Protection:** Status checks obrigatórios
