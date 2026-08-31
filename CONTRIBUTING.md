# Contribuindo com o IronPlate

## Pré-requisitos

- Node.js 22.13 ou superior.
- npm compatível com o lockfile.
- Git.
- Conta Expo/EAS apenas para builds remotos.
- Banco Neon isolado quando a mudança envolver schema ou persistência.

## Preparação

```bash
git clone https://github.com/SEU_USUARIO/ironplate.git
cd ironplate
git remote add upstream https://github.com/Fernandorsoul/ironplate.git
npm ci
```

Copie `.env.example` para `.env` somente quando o fluxo exigir API, banco ou email. Não use credenciais de produção no desenvolvimento e nunca versione `.env`.

## Fluxo de branches

`dev` é a branch de integração. `master` recebe releases estabilizadas.

```bash
git fetch upstream
git switch dev
git pull --ff-only upstream dev
git switch -c feat/nome-da-entrega
```

Prefixos sugeridos:

- `feat/` para funcionalidade;
- `fix/` para correção;
- `docs/` para documentação;
- `refactor/` para mudança interna sem comportamento novo;
- `test/` para cobertura e infraestrutura de testes.

Evite misturar alterações sem relação no mesmo pull request.

## Padrões de implementação

### Aplicativo

- Componentes compartilhados ficam em `src/components/` e são exportados por `src/components/index.ts` quando necessário.
- Telas ficam em `src/screens/` e rotas devem ser tipadas em `src/types/navigation.ts`.
- Regras de negócio puras ficam em `src/utils/`; acesso a serviços externos fica em `src/services/`.
- Use `src/constants/layout.ts` para breakpoints e `src/constants/theme.ts` para tokens visuais.
- Alterações de layout precisam considerar web, Android, iOS, telas pequenas e navegação por teclado.
- Animações devem ser breves, não bloquear ações e respeitar movimento reduzido quando forem decorativas.

### API e banco

- Endpoints ficam em `api/users/`.
- Todo payload novo deve ter schema Zod em `api/middleware/validation.ts`.
- Endpoints privados devem validar o Bearer JWT e a identidade do titular.
- Mudanças no schema começam em `api/db/schema.ts` e exigem migration em `migrations/`.
- Aplique migrations apenas com `DATABASE_URL_UNPOOLED` e teste primeiro em uma branch do Neon.

### Nutrição

- Não altere fórmulas, limites ou receitas sem atualizar os testes e a documentação da regra.
- A geração de dietas deve continuar passando por `validateAthleteMealPlan`.
- Refeições geradas devem representar combinações culinárias coerentes; não monte cardápios sorteando alimentos isolados.
- Valores de produtos externos precisam manter a referência de 100 g e a indicação de que dependem da fonte/rotulagem.

### Segurança e privacidade

- Não registre tokens, senhas, URLs de banco, dados de saúde ou payloads pessoais em logs.
- Não persista sessão web em `localStorage` ou AsyncStorage.
- Escape conteúdo do usuário antes de gerar HTML/PDF.
- Mudanças que afetem coleta, finalidade, retenção ou compartilhamento de dados devem atualizar `docs/lgpd/`.

## Commits

Use Conventional Commits:

```bash
git commit -m "feat(nutrition): adicionar substituição de refeição"
git commit -m "fix(ui): corrigir grade no celular"
git commit -m "docs: atualizar arquitetura"
git commit -m "test(api): cobrir validação do endpoint"
```

Tipos aceitos com frequência: `feat`, `fix`, `docs`, `test`, `refactor`, `style`, `chore` e `ci`.

## Verificações antes do PR

```bash
npm test -- --runInBand
npm run typecheck
npm run lint
npm run vercel-build
```

Quando aplicável:

```bash
npm run test:e2e
npm run test:smoke
npx drizzle-kit check
```

Para executar um arquivo Jest específico:

```bash
npm test -- --runInBand __tests__/layout.test.tsx
```

## Pull request

Abra o PR contra `dev` e inclua:

- problema e resultado esperado;
- resumo objetivo da implementação;
- riscos, migrations e variáveis novas;
- testes executados;
- screenshots ou vídeo para mudanças visuais;
- atualização de README, changelog ou documentos afetados.

Antes de solicitar revisão, confirme que o PR contém somente arquivos relacionados e que não inclui `.env`, builds, relatórios locais ou diretórios pessoais de ferramentas.

## Revisão

Revisores devem observar:

- correção da regra de negócio;
- persistência e isolamento entre usuários;
- comportamento em telas pequenas;
- acessibilidade e estados de carregamento/erro;
- validação na fronteira da API;
- regressões de segurança e privacidade;
- testes proporcionais ao risco.

## Bugs e propostas

Ao abrir uma issue, informe passos de reprodução, resultado atual, resultado esperado, plataforma, versão e evidências sem dados pessoais. Para funcionalidades, descreva primeiro o problema do usuário e os critérios de aceite.
