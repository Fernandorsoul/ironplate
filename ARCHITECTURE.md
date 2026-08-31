# Arquitetura do IronPlate

## Visão geral

O IronPlate usa React Native com Expo para compartilhar a interface entre web, Android e iOS. A aplicação cliente acessa funções HTTP serverless, que validam e persistem os dados no Neon Postgres.

```text
┌──────────────────────────────────────────────────────────────┐
│ Web, Android e iOS                                           │
│ React Native 0.86 + Expo 57 + React Navigation 7             │
├──────────────────────────────────────────────────────────────┤
│ Screens e Components                                         │
│            │                                                  │
│            v                                                  │
│ AppContext + hooks + regras puras de domínio                 │
│            │                                                  │
│            v                                                  │
│ services/database.ts + services/session.ts                    │
└────────────┬─────────────────────────────────────────────────┘
             │ HTTPS + Bearer JWT
             v
┌──────────────────────────────────────────────────────────────┐
│ Vercel Functions — /api/users/*                              │
│ CORS → rate limit → autenticação → Zod → handler             │
├──────────────────────────────────────────────────────────────┤
│ Drizzle ORM → Neon Postgres                                  │
└──────────────────────────────────────────────────────────────┘
```

## Navegação e apresentação

`App.tsx` escolhe o fluxo pelo estado da conta:

```text
Não autenticado
  PublicHome
    ├── LoginModal
    ├── RegisterModal
    ├── ForgotPassword
    └── PrivacyPolicy

Autenticado sem onboarding
  Onboarding
    └── BodyMeasurements

Autenticado com onboarding
  MainTabs
    ├── Home
    ├── MealPlan
    ├── Weight
    └── Workout
  + telas auxiliares no stack
```

No celular, `CollapsibleSideBar` é apresentado como barra inferior. Em larguras maiores, o mesmo componente funciona como navegação lateral. Os breakpoints compartilhados ficam em `src/constants/layout.ts`.

### Responsabilidades da interface

- `src/screens/`: composição de telas, navegação e interação do usuário.
- `src/components/`: cards, seletores, modais e controles reutilizáveis.
- `src/constants/theme.ts`: cores, espaçamentos, tipografia e raios.
- `src/types/navigation.ts`: contratos tipados das rotas.

## Estado da aplicação

`src/context/AppContext.tsx` é o orquestrador do estado global. Ele mantém:

- identidade e sessão da conta;
- perfil e metas nutricionais;
- logs diários com refeições e treinos;
- planos alimentares e plano ativo;
- histórico de peso;
- alimentos personalizados.

O Context não é a fonte de verdade permanente. Após login ou restauração de sessão, ele hidrata as coleções a partir da API. Toda mutação persistente chama primeiro ou em conjunto o serviço correspondente e mantém o estado em memória sincronizado.

## Persistência

### Fonte de verdade

O Neon Postgres armazena:

| Tabela | Conteúdo |
| --- | --- |
| `users` | Conta, perfil, objetivo, esporte e foto |
| `daily_logs` | Registro diário e peso associado ao dia |
| `meals` / `meal_foods` | Refeições registradas e respectivas porções |
| `workouts` | Treinos, intensidade, split e grupos musculares |
| `weight_history` | Histórico manual ou originado de balança |
| `custom_foods` | Alimentos cadastrados pelo usuário |
| `meal_plans` | Cardápios, macros, refeições serializadas e plano ativo |
| `body_measurements` | Dobras, circunferências, bioimpedância e resultados |
| `password_reset_tokens` | Hash, expiração e estado de uso do reset |

As relações sensíveis usam exclusão em cascata quando a conta é removida. O schema oficial fica em `api/db/schema.ts`.

### Sessão por plataforma

```text
Android/iOS: { userId, accessToken } → Expo SecureStore
Web:         { userId, accessToken } → memória do processo da página
```

A sessão web não é escrita em `localStorage`; recarregar a página exige novo login. `AsyncStorage` existe somente para limpar caches sensíveis criados por versões antigas.

### Migrations

- Drizzle Kit gera arquivos em `migrations/`.
- `npm run db:migrate` exige `DATABASE_URL_UNPOOLED`.
- A conexão pooled usada pela API não deve ser usada para migrations.
- O workflow de produção aplica migrations antes do deploy.

## API serverless

As funções ficam em `api/users/` e são expostas sob `/api/users/*`.

### Fluxo de uma requisição autenticada

```text
Cliente
  → validação de origem/CORS
  → rate limit
  → leitura e verificação do Bearer JWT
  → validação do payload com Zod
  → operação Drizzle/Neon
  → resposta JSON
```

Os endpoints cobrem cadastro, login, recuperação de senha, perfil, exportação e exclusão da conta, logs diários, peso, planos alimentares, alimentos personalizados e medidas corporais.

### Autenticação

- Senhas são derivadas com `scrypt` e salt aleatório.
- Tokens de acesso são JWT HS256 assinados por `JWT_SECRET`.
- O reset usa código aleatório; apenas o hash é persistido.
- Códigos de reset expiram, são de uso único e são invalidados atomicamente.
- O email é enviado pelo Resend usando a origem canônica definida em `APP_URL`.

## Pipeline nutricional

### Cálculos

`src/utils/calculations.ts` concentra as funções puras:

1. BMR pela equação de Mifflin–St Jeor.
2. TDEE pelo fator de atividade.
3. Ajuste calórico pelo objetivo.
4. Proteína por peso e perfil esportivo.
5. Gordura por percentual da meta.
6. Carboidrato com as calorias restantes e piso prático protegido.

O gasto diário mostrado na Home combina uma base sedentária com o gasto estimado dos treinos registrados por MET, peso, duração e intensidade. É uma estimativa diferente da meta calculada pelo TDEE.

### Geração de plano alimentar

```text
Perfil
  → calcular meta e macros
  → distribuir macros entre os horários
  → escolher uma receita cadastrada para cada horário
  → otimizar as porções dentro dos limites de cada ingrediente
  → recalcular totais
  → validar refeição e plano completos
  → aprovar ou interromper a geração
```

As receitas em `src/utils/dietGenerator.ts` representam refeições culinariamente coerentes, como café da manhã, almoço, pré-treino, pós-treino e ceia. A validação impede ingredientes ausentes, porções fora do intervalo, alimentos inesperados, macros inválidos e planos fora das faixas definidas.

### Fontes de alimentos

| Origem | Caminho | Uso |
| --- | --- | --- |
| TACO | `src/constants/taco.ts` | Catálogo interno e geração dos planos |
| Open Food Facts | `src/services/foodSearch.ts` | Busca online por texto e consulta programática por código de barras |
| Usuário | `custom_foods` | Alimentos personalizados persistidos |

Produtos externos são mapeados para macros por 100 g. A consulta por código de barras existe no serviço, mas ainda não está ligada a um scanner ou campo na interface. Esses produtos não entram automaticamente no catálogo TACO nem passam por validação de IA. A interface deve manter a origem e a necessidade de conferência claras para o usuário.

## Balanças e medidas

`src/services/bluetoothScale.ts` usa `react-native-ble-plx` somente em builds nativos. A camada contém parsers específicos e fallbacks heurísticos para protocolos BLE; compatibilidade real depende do firmware e precisa ser confirmada em aparelho físico.

O peso recebido ou digitado é persistido em `weight_history`. Medidas corporais completas usam o endpoint e a tabela próprios. Na web, o serviço BLE retorna erro explícito e o registro manual continua disponível.

## Exportações

- Planos alimentares: HTML no web; PDF e compartilhamento nativo com `expo-print` e `expo-sharing`.
- Medidas corporais: fluxo equivalente com template próprio.
- Dados da conta: endpoint autenticado que reúne as coleções persistidas.

Dados inseridos em HTML passam por escape antes da geração para evitar injeção no documento exportado.

## Segurança e privacidade

- Neon como fonte de verdade; dados de saúde não são mantidos em cache local permanente.
- Autorização Bearer obrigatória nos endpoints privados.
- Validação de `userId` e payloads na API.
- CORS com allowlist e tratamento de ambiente local.
- Rate limiting específico para autenticação, cadastro e recuperação de senha.
- Headers de segurança definidos em `vercel.json`.
- Exportação e exclusão da conta disponíveis ao titular.
- Documentação LGPD em `docs/lgpd/`.

## Testes e qualidade

| Camada | Ferramenta | Escopo |
| --- | --- | --- |
| Unidade/integração | Jest + Testing Library | Cálculos, geração, persistência, componentes e segurança |
| End-to-end | Playwright | Fluxos web principais e smoke tests |
| Tipagem | TypeScript | Aplicativo e API |
| Estática | ESLint | Código e regras de segurança |
| Banco | Drizzle Kit | Consistência do schema e migrations |

O CI executa essas verificações em pull requests. Contagens de testes não são mantidas neste documento para evitar números obsoletos.

## Deploy

O `expo export` gera os artefatos estáticos. A Vercel publica o frontend e encaminha `/api/*` às funções Node configuradas em `vercel.json`.

O deploy automático de produção ocorre ao publicar uma GitHub Release direcionada à `master`. A branch de integração do trabalho diário é `dev`.

## Decisões e limites atuais

- Context API permanece suficiente para o estado global atual.
- Neon é a única fonte de verdade dos dados do usuário.
- TACO é a fonte interna dos planos; Open Food Facts complementa a busca de produtos.
- Não existe ingestão automática por IA nesta versão.
- BLE, notificações de compartilhamento e PDFs nativos exigem testes em dispositivo ou build nativo.
- As telas são importadas estaticamente; o projeto não declara lazy loading de screens.
