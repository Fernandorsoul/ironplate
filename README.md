# IronPlate - Nutrição para Atletas

Aplicativo móvel de nutrição para atletas de **Bodybuilding** e **BJJ** (Brazilian Jiu-Jitsu).

## Features

- **Planos Alimentares** - Criação automática e personalizada de dietas
- **Contagem de Macros** - Tracking de proteína, carboidrato e gordura
- **Treinos Integrados** - Vincule nutrição com seu plano de treino
- **Pesagem Corporal** - Gráficos de evolução de peso
- **Refeições Pré/Pós Treino** - Timing nutricional otimizado
- **Calculadora de Calorias** - TDEE, metabolismo basal e fator de atividade

## Stack Técnica

- **React Native** com Expo
- **TypeScript** para type safety
- **AsyncStorage** para persistência offline
- **React Navigation** para navegação

## Como Rodar

```bash
# Instalar dependências
npm install

# Rodar no Expo
npx expo start

# Rodar no Android
npx expo start --android

# Rodar no iOS
npx expo start --ios
```

## Estrutura

```
src/
├── components/     # Componentes reutilizáveis
├── constants/      # Tema, cores, banco de alimentos
├── context/        # Context API (estado global)
├── hooks/          # Custom hooks
├── screens/        # Telas do app
├── services/       # Serviços (storage, API)
├── types/          # Definições TypeScript
└── utils/          # Funções utilitárias (cálculos)
```

## Cálculos Nutricionais

- **BMR**: Equação Mifflin-St Jeor
- **TDEE**: BMR × Fator de Atividade
- **Proteína**: 2g/kg (bodybuilding) | 1.8g/kg (BJJ)
- **Gordura**: 25% das calorias totais
- **Carboidratos**: Calorias restantes

## Metas por Objetivo

| Objetivo | Calorias |
|----------|----------|
| Bulking  | TDEE + 15% |
| Cutting  | TDEE - 15% |
| Manutenção | TDEE |

---

Desenvolvido com a **RsoulFactory Meta-Framework**.
