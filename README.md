# IronPlate

[![CI - Tests](https://github.com/Fernandorsoul/ironplate/actions/workflows/ci.yml/badge.svg)](https://github.com/Fernandorsoul/ironplate/actions/workflows/ci.yml)

Aplicativo multiplataforma de nutrição e acompanhamento esportivo para web, Android e iOS. O IronPlate reúne planejamento alimentar, controle de macronutrientes, treinos, peso, medidas corporais e evolução em uma única conta.

> O IronPlate é uma ferramenta de apoio. Os cálculos e dados nutricionais são estimativas e não substituem avaliação individual de nutricionista, médico ou outro profissional habilitado.

## O que está disponível

### Alimentação e dietas

- Cálculo de BMR, TDEE, meta calórica, proteína, carboidratos e gorduras a partir do perfil e do objetivo.
- Geração de três opções de plano alimentar, incluindo alternativa econômica.
- Refeições formadas por receitas coerentes para atletas, em vez de combinações aleatórias de alimentos.
- Ajuste de porções por meta e validação obrigatória de composição, limites e macros antes de exibir um plano.
- Medidas caseiras aproximadas acompanhadas do peso em gramas usado nos cálculos.
- Ativação, edição, exclusão e exportação do plano alimentar.
- Análise de adequação nutricional e sugestões de substituição.

### Catálogo de alimentos

- Catálogo brasileiro baseado na TACO para os alimentos internos.
- Busca de produtos na Open Food Facts por texto.
- O serviço possui consulta por código de barras, mas ainda não há scanner ou campo de código exposto na interface.
- Cadastro de alimentos personalizados na conta do usuário.
- Dados externos são exibidos conforme fornecidos pela fonte e devem ser conferidos no rótulo antes do uso.
- O projeto não usa IA para cadastrar automaticamente alimentos nesta versão.

### Acompanhamento do atleta

- Dashboard diário com calorias, macros, gasto estimado, refeições e treinos.
- Ações rápidas responsivas: duas colunas no celular e quatro em telas maiores.
- Registro manual de peso e suporte experimental a balanças BLE em builds nativos.
- Histórico de peso, medidas corporais, dobras, circunferências e bioimpedância.
- Fichas de treino por modalidade, intensidade e grupos musculares editáveis.
- Resumo semanal e telas de evolução.

### Conta, privacidade e site público

- Login e cadastro em modais responsivos na página pública.
- Recuperação de senha por código de uso único enviado por email.
- Sessão nativa protegida pelo Expo SecureStore.
- Exportação dos dados da conta, exclusão de conta e Política de Privacidade.
- Seção pública de novidades com um resumo das releases recentes.

## Plataformas

| Plataforma | Execução | Observações |
| --- | --- | --- |
| Web | Expo Web + Vercel | Frontend estático e API serverless na mesma origem em produção |
| Android | Expo/EAS | BLE, SecureStore, impressão e compartilhamento nativos |
| iOS | Expo/EAS | SecureStore, impressão e compartilhamento; BLE requer validação em aparelho |

## Stack atual

| Tecnologia | Versão no projeto | Uso |
| --- | --- | --- |
| React | 19.2.3 | Interface |
| React Native | 0.86.3 | Aplicativo multiplataforma |
| Expo | 57.0.18 | Runtime, desenvolvimento e exportação |
| TypeScript | 6.0.3 | Tipagem estática |
| React Navigation | 7.x | Navegação stack, tabs e sidebar |
| Neon Postgres | Serverless | Fonte de verdade dos dados persistentes |
| Drizzle ORM/Kit | 0.45/0.31 | Schema e migrations |
| Vercel Functions | Node.js | API HTTP |
| Jest | 29.x | Testes unitários e de integração |
| Playwright | 1.62.1 | Testes end-to-end web |

O SDK 57 requer Node.js 22.13 ou superior neste projeto.

## Executando localmente

### 1. Instalação

```bash
git clone https://github.com/Fernandorsoul/ironplate.git
cd ironplate
npm ci
```

### 2. Ambiente

Copie `.env.example` para `.env` e preencha os valores necessários. Nunca versione `.env` ou credenciais reais.

| Variável | Obrigatória | Finalidade |
| --- | --- | --- |
| `DATABASE_URL` | API | Conexão pooled do Neon usada pelas funções serverless |
| `DATABASE_URL_UNPOOLED` | Migrations | Conexão direta, sem `-pooler`, usada por `npm run db:migrate` |
| `JWT_SECRET` | API | Assinatura dos tokens; mínimo de 32 caracteres |
| `ALLOWED_ORIGINS` | Produção | Origens aceitas pelo CORS, separadas por vírgula |
| `EXPO_PUBLIC_API_BASE_URL` | Build nativo | Origem pública da API; na web same-origin pode ficar vazia |
| `APP_URL` | Recuperação de senha | Origem HTTPS canônica usada nos links enviados por email |
| `EXPO_PUBLIC_APP_URL` | Build nativo | Origem reconhecida ao abrir o link de recuperação |
| `RESEND_API_KEY` | Recuperação de senha | Envio do email pelo Resend |
| `RESET_EMAIL_FROM` | Recuperação de senha | Remetente de domínio verificado |

### 3. Comandos de desenvolvimento

```bash
# Servidor Expo
npm start

# Web
npm run web

# Build nativo local Android
npm run android

# Build nativo local iOS — requer macOS e Xcode
npm run ios
```

O frontend web sozinho não reproduz as funções `/api`. Para testar login e persistência pela web, use uma API implantada em `EXPO_PUBLIC_API_BASE_URL` ou execute o ambiente da Vercel localmente.

## Banco de dados

O schema fica em `api/db/schema.ts` e as migrations versionadas ficam em `migrations/`.

```bash
# Gerar migration após alterar o schema
npm run db:generate

# Aplicar migrations com conexão direta
npm run db:migrate

# Verificar a configuração do reset de senha
npm run password-reset:check
```

Teste migrations primeiro em uma branch isolada do Neon. O script de migration rejeita conexões pooled para reduzir o risco de aplicação incorreta.

## Qualidade e testes

```bash
# Jest
npm test

# TypeScript do app e da API
npm run typecheck

# ESLint e regras de segurança
npm run lint

# Coverage
npm run test:coverage -- --runInBand

# End-to-end web
npm run test:e2e

# Smoke test web
npm run test:smoke

# Exportação de produção Expo
npm run vercel-build
```

O CI executa testes com coverage, lint, TypeScript, verificação das migrations, auditoria de dependências e E2E em pull requests. Evitamos documentar uma contagem fixa de testes porque ela muda a cada entrega.

## Arquitetura resumida

```text
Web / Android / iOS
        |
        v
React Native + Expo
        |
        v
AppContext + services/database.ts
        |
        v
API /api/users/* — autenticação JWT, validação, CORS e rate limit
        |
        v
Neon Postgres
```

- O Neon é a fonte de verdade de perfil, logs, refeições, treinos, peso, planos, medidas e alimentos personalizados.
- No Android/iOS, somente a sessão compacta fica no SecureStore.
- Na web, a sessão permanece apenas em memória e um recarregamento exige novo login.
- AsyncStorage serve apenas para remover dados sensíveis de versões antigas; não é a persistência principal.

Consulte [ARCHITECTURE.md](ARCHITECTURE.md) para os fluxos completos.

## Estrutura principal

```text
api/                     Funções serverless, middleware, segurança e schema
migrations/              Migrations SQL do Neon
src/components/          Componentes reutilizáveis
src/constants/           Tema, TACO, esportes, porções e treinos
src/context/             Estado global e orquestração da persistência
src/hooks/               Cálculos e buscas reutilizáveis
src/knowledge/           Referências internas de nutrição esportiva
src/screens/             Telas públicas e autenticadas
src/services/            API, sessão, alimentos online, BLE e medidas
src/utils/               Cálculos, dietas, substituições e exportações
__tests__/               Testes Jest
e2e/                     Testes Playwright
docs/lgpd/               Documentação de privacidade e proteção de dados
```

## Deploy e releases

- A Vercel hospeda o frontend exportado e as funções da API configuradas em `vercel.json`.
- Deploy de produção é disparado pela publicação de uma GitHub Release cujo alvo seja `master`.
- O workflow aplica migrations antes de gerar e publicar o build.
- Uma tag enviada sem publicar a release não dispara o workflow atual.

Consulte [RELEASE.md](RELEASE.md) para o procedimento e [BUILD-ANDROID.md](BUILD-ANDROID.md) para builds Android com EAS.

## Documentação

- [Índice da documentação](docs/README.md)
- [Arquitetura](ARCHITECTURE.md)
- [Changelog](CHANGELOG.md)
- [Contribuição](CONTRIBUTING.md)
- [Release e deploy](RELEASE.md)
- [Build Android](BUILD-ANDROID.md)
- [Balanças Bluetooth](BLESCALES.md)
- [Migrations](migrations/README.md)
- [LGPD](docs/lgpd/README.md)

## Licença

Distribuído sob a licença MIT. Consulte [LICENSE](LICENSE).
