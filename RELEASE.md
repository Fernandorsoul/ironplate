# Release e deploy do IronPlate

## Como o deploy funciona

O workflow `.github/workflows/deploy.yml` é acionado somente quando uma GitHub Release é publicada.

Para continuar, a release precisa:

1. apontar para uma tag cujo commit pertence à `master`;
2. ter `target_commitish` igual a `master`;
3. encontrar os secrets necessários no GitHub Actions.

Um push comum, um pull request ou o envio isolado de uma tag não dispara o deploy atual.

## Fluxo de branches

```text
feat/* ou fix/*
       ↓ PR
      dev
       ↓ PR de estabilização
    master
       ↓ tag + GitHub Release publicada
Vercel production
```

## Pré-release

Na `dev`:

- finalize os PRs que fazem parte da versão;
- atualize `CHANGELOG.md` e a seção pública de novidades quando necessário;
- confirme migrations, variáveis novas e compatibilidade de clientes antigos;
- execute os testes e builds proporcionais à mudança.

Antes de levar para `master`:

```bash
npm ci
npm test -- --runInBand
npm run typecheck
npm run lint
npx drizzle-kit check
npm run vercel-build
```

Mudanças visuais devem ter revisão em largura móvel e desktop. Mudanças BLE, PDF, SecureStore ou permissões exigem build nativo e teste em aparelho.

## Publicando uma versão

### 1. Sincronize a `master`

Depois do PR de estabilização ser aprovado e mesclado:

```bash
git switch master
git pull --ff-only origin master
git status --short
```

O working tree precisa estar limpo.

### 2. Verifique a próxima versão

O projeto usa tags `vMAJOR.MINOR.PATCH`, por exemplo:

- `v1.1.0`: funcionalidade compatível;
- `v1.1.1`: correção compatível;
- `v2.0.0`: mudança incompatível.

Confira as tags existentes:

```bash
git tag --sort=-version:refname
```

### 3. Crie e envie a tag

Manual:

```bash
git tag -a v1.1.0 -m "Release v1.1.0"
git push origin v1.1.0
```

Ou use o script existente:

```bash
./scripts/release.sh 1.1.0 "Resumo da versão"
```

O script cria e envia a tag, mas a publicação da GitHub Release no passo seguinte continua obrigatória para iniciar o workflow.

### 4. Publique a GitHub Release

```bash
gh release create v1.1.0 \
  --target master \
  --title "IronPlate v1.1.0" \
  --generate-notes
```

Também é possível publicar pela interface do GitHub. Confirme explicitamente que o target é `master` antes de publicar.

## Etapas automáticas

Após a publicação, o workflow:

1. baixa o commit da tag;
2. confirma que ele pertence à `master`;
3. instala Node.js 22.13 e as dependências;
4. aplica migrations usando `DATABASE_URL_UNPOOLED`;
5. carrega a configuração de produção da Vercel;
6. executa `vercel build --prod`;
7. publica o artefato com `vercel deploy --prebuilt --prod`.

O `vercel.json` desabilita deploy automático por integração Git. O workflow de release é a fonte de verdade do deploy de produção.

## Secrets necessários

Configure em GitHub → Settings → Secrets and variables → Actions:

| Secret | Uso |
| --- | --- |
| `VERCEL_TOKEN` | Autenticar build e deploy na Vercel |
| `DATABASE_URL_UNPOOLED` | Aplicar migrations com conexão direta ao Neon |

As variáveis de runtime da API e do frontend também precisam existir no ambiente Production da Vercel, conforme `.env.example`.

## Verificação pós-deploy

- [ ] Workflow concluído sem erro.
- [ ] Página pública e seção de novidades carregam.
- [ ] Cadastro, login e logout funcionam.
- [ ] Recuperação de senha gera email com origem correta.
- [ ] Plano ativo, peso manual e demais dados persistem após novo login.
- [ ] API bloqueia origem não autorizada e chamadas sem token.
- [ ] Smoke tests executados contra a URL de produção.
- [ ] Logs não contêm tokens, senhas ou dados pessoais.

## Monitoramento

```bash
# Execuções recentes do deploy
gh run list --workflow=deploy.yml

# Detalhes de uma execução
gh run view ID_DA_EXECUCAO --log
```

- GitHub Actions: `https://github.com/Fernandorsoul/ironplate/actions`
- Vercel: use o dashboard do projeto e confirme o domínio de produção antes do smoke test.

## Falha antes do deploy

Se a migration falhar, o workflow não publica o novo frontend. Corrija a migration em uma branch isolada, gere uma nova versão patch e mantenha a tag/release com falha como registro histórico.

Não mova nem sobrescreva uma tag publicada.

## Rollback

Como a release pode incluir migration, rollback não deve ser feito movendo a tag anterior. Prefira:

1. identificar o último commit estável;
2. criar um commit de reversão compatível com o schema já aplicado;
3. validar em `dev` e `master`;
4. publicar uma nova versão patch;
5. executar o smoke test novamente.

Se o problema estiver apenas no frontend e o schema for compatível, a Vercel também permite promover um deployment anterior. Registre a ação e ainda prepare uma versão patch para reconciliar Git e produção.

## O que não fazer

- Não publicar release a partir de `dev` ou de uma feature branch.
- Não usar `DATABASE_URL` pooled para migrations.
- Não colocar segredos em `EXPO_PUBLIC_*`.
- Não apagar ou reposicionar tags já publicadas.
- Não declarar a versão pronta sem testar os fluxos afetados.
