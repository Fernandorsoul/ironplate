# IronPlate - Nutrição para Atletas

[![CI - Tests](https://github.com/Fernandorsoul/ironplate/actions/workflows/ci.yml/badge.svg)](https://github.com/Fernandorsoul/ironplate/actions/workflows/ci.yml)

Aplicativo móvel de nutrição para atletas de **Bodybuilding** e **BJJ** (Brazilian Jiu-Jitsu), com geração automática de planos alimentares baseados em evidências científicas.

## Features Principais

### Planos Alimentares
- **Geração automática** de 3 opções de cardápio
- **Tabela TACO** (UNICAMP) como base de dados nutricional
- **Porções em medidas caseiras e gramas** nas dietas, refeições e PDFs
- **PDF exportável** com porções detalhadas nas duas formas
- **Análise de adequação** nutricional com score

#### Medidas caseiras e gramas

As porções dos planos alimentares são apresentadas simultaneamente em uma medida prática e no peso usado como referência nutricional. Exemplo:

```text
Banana, prata: aprox. 1 banana (120 g)
```

- As medidas caseiras são aproximadas; os gramas continuam sendo a referência para o cálculo dos macros.
- O mesmo formato é usado nos planos gerados, no plano ativo, na edição do plano, nas refeições diárias e no PDF exportado.
- Planos antigos que armazenam somente gramas também recebem a conversão durante a exibição.
- A implementação é compartilhada entre web, Android e iOS.

Consulte o [CHANGELOG.md](CHANGELOG.md) para ver o registro técnico da alteração.

### Tracking Nutricional
- **Contagem de macros** (proteína, carboidratos, gordura)
- **Registro de refeições** com timing (pré/pós treino)
- **Histórico diário** com totais automáticos

### Avaliação Antropométrica
- **Medidas corporais** seguindo padrão CREF/CRN
- **Dobras cutâneas** (9 pontos)
- **Circunferências** (membro superior, tronco, inferior)
- **Bioimpedância** (resistência, reactância, ângulo de fase)
- **PDF exportável** para profissionais

### Evolução
- **Gráficos de peso** corporal
- **Percentuais de variação** em todas as medidas
- **Comparação temporal** (7, 30, 90 dias)

### Autenticação
- **Login/Cadastro** com persistência
- **Perfil completo** (nome, email, telefone, data nascimento)
- **Edição de objetivo** (bulking, cutting, manutenção)

## Stack Técnica

| Tecnologia | Versão | Uso |
|------------|--------|-----|
| React Native | 0.86.2 | Framework mobile |
| Expo | 57.0.10 | Build e desenvolvimento |
| TypeScript | 6.0.3 | Type safety |
| React Navigation | 7.x | Navegação |
| AsyncStorage | 2.2.0 | Persistência offline |
| Victory Native | 41.26.0 | Gráficos |
| Playwright | 1.62.1 | Testes E2E |
| Jest | 29.x | Testes unitários |

## Como Rodar

### Pré-requisitos
- Node.js 18+
- npm ou yarn
- Expo CLI (opcional)

### Instalação
```bash
# Clonar repositório
git clone https://github.com/Fernandorsoul/ironplate.git
cd ironplate

# Instalar dependências
npm install

# Rodar na web
npm run web

# Rodar no Android
npm run android

# Rodar no iOS
npm run ios
```

### Testes
```bash
# Testes unitários (46 testes)
npm test

# Testes E2E (27 testes)
npm run test:e2e

# Smoke tests
npm run test:smoke
```

## Estrutura do Projeto

```
ironplate/
├── .github/
│   └── workflows/
│       └── ci.yml              # GitHub Actions CI/CD
├── __tests__/                   # Testes unitários Jest
│   ├── calculations.test.ts
│   ├── components.test.tsx
│   └── hooks.test.ts
├── e2e/                         # Testes E2E Playwright
│   ├── app.spec.ts
│   ├── integration.spec.ts
│   └── smoke.spec.ts
├── src/
│   ├── components/              # Componentes reutilizáveis
│   │   ├── ActionButton.tsx
│   │   ├── MacroCard.tsx
│   │   ├── MealCard.tsx
│   │   └── ScreenHeader.tsx
│   ├── constants/               # Configurações estáticas
│   │   ├── foods.ts             # Banco de alimentos legado
│   │   ├── portions.ts          # Conversões para medidas caseiras
│   │   ├── taco.ts              # Tabela TACO (UNICAMP)
│   │   └── theme.ts             # Cores, spacing, fontes
│   ├── context/                 # Estado global
│   │   └── AppContext.tsx
│   ├── hooks/                   # Custom hooks
│   │   ├── useFoodSearch.ts
│   │   ├── useMacros.ts
│   │   └── useWeightTrend.ts
│   ├── screens/                 # Telas do app
│   │   ├── HomeScreen.tsx
│   │   ├── AddMealScreen.tsx
│   │   ├── MealPlanScreen.tsx
│   │   ├── WeightScreen.tsx
│   │   ├── BodyMeasurementsScreen.tsx
│   │   ├── EvolutionScreen.tsx
│   │   ├── EditProfileScreen.tsx
│   │   └── ...
│   ├── services/                # Serviços de dados
│   │   ├── database.ts          # SQLite + fallback web
│   │   └── storage.ts           # AsyncStorage
│   ├── types/                   # Definições TypeScript
│   │   └── index.ts
│   └── utils/                   # Funções utilitárias
│       ├── calculations.ts      # Cálculos nutricionais
│       ├── dietGenerator.ts     # Gerador de dietas
│       ├── dietPdfGenerator.ts  # PDF de dietas
│       ├── portionDisplay.ts     # Formatação de medida caseira + gramas
│       └── pdfGenerator.ts      # PDF de medidas
├── App.tsx                      # Componente raiz
├── package.json
├── tsconfig.json
└── playwright.config.ts
```

## Cálculos Nutricionais

### Equações Base

| Cálculo | Fórmula | Referência |
|---------|---------|------------|
| **BMR** | Mifflin-St Jeor | 10×peso + 6.25×altura - 5×idade + 5 (M) / -161 (F) |
| **TDEE** | BMR × Fator Atividade | Sedentário 1.2, Ativo 1.725 |
| **Proteína** | Peso × Multiplicador | ISSN Position Stand |

### Multiplicadores de Proteína (g/kg)

| Objetivo | Bodybuilding | BJJ |
|----------|--------------|-----|
| Manutenção | 1.8 | 1.6 |
| Bulking | 2.0 | 1.8 |
| Cutting Conservador | 2.2 | 2.0 |
| Cutting Preparação | 2.4 | 2.2 |
| Pré-Competição | 2.8 | 2.5 |

### Déficit/Superávit Calórico

| Tipo | Déficit | Perda Esperada |
|------|---------|----------------|
| Cutting Conservador | -15% | 0.3-0.5%/sem |
| Preparação | -20% | 0.5-0.7%/sem |
| Pré-Competição | -25% | 0.7-1.0%/sem |
| Bulking | +15% | 0.3-0.5%/sem |

### Distribuição de Gordura

| Objetivo | % Calorias |
|----------|------------|
| Cutting Conservador | 25% |
| Preparação | 22% |
| Pré-Competição | 20% |
| Bulking | 28% |
| Manutenção | 25% |

## CI/CD

### GitHub Actions

O projeto possui pipeline CI/CD configurado:

```yaml
# .github/workflows/ci.yml
Jobs:
  - TypeScript Check
  - Unit Tests (46 testes)
  - E2E Tests (27 testes)
```

### Branch Protection

A branch `master` possui proteção:
- ✅ Status checks obrigatórios
- ✅ Force push bloqueado
- ✅ Admins seguem regras

## Contribuição

1. Fork o projeto
2. Crie uma branch (`git checkout -b feature/nova-feature`)
3. Commit suas mudanças (`git commit -m 'feat: nova feature'`)
4. Push para a branch (`git push origin feature/nova-feature`)
5. Abra um Pull Request

### Commits

Use [Conventional Commits](https://www.conventionalcommits.org/):
- `feat:` Nova feature
- `fix:` Bug fix
- `docs:` Documentação
- `test:` Testes
- `refactor:` Refatoração

## Licença

MIT License - veja [LICENSE](LICENSE) para detalhes.

## Contato

- **GitHub**: [Fernandorsoul](https://github.com/Fernandorsoul)
- **Projeto**: [ironplate](https://github.com/Fernandorsoul/ironplate)

---

Desenvolvido com a **RSoul Factory Meta-Framework**.
