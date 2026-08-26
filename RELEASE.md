# Guia de Release e Deploy

## Visão Geral

O deploy na Vercel é triggerado **automaticamente** quando:
1. Uma **release é publicada** no GitHub (apenas se targeting master)
2. Uma **tag `v*` é pushada** (apenas se na branch master)

## Fluxo de Release

### Método 1: Script Automatizado (Recomendado)

```bash
# 1. Certifique-se de estar na master com tudo commitado
git checkout master
git pull origin master

# 2. Executar script de release
./scripts/release.sh 1.0.0 "Primeira release estável"

# 3. O script vai:
#    - Criar tag v1.0.0
#    - Pushar a tag (triggera deploy)
#    - Mostrar link para criar release no GitHub

# 4. Criar release no GitHub (opcional mas recomendado)
#    Acesse: https://github.com/Fernandorsoul/ironplate/releases/new?tag=v1.0.0
```

### Método 2: Manual

```bash
# 1. Certifique-se de estar na master
git checkout master
git pull origin master

# 2. Criar tag
git tag -a v1.0.0 -m "Release v1.0.0"

# 3. Pushar tag (triggera deploy)
git push origin v1.0.0

# 4. Criar release no GitHub
gh release create v1.0.0 --title "Release v1.0.0" --notes "Notas da release..."
```

## Configuração do Deploy

### Variáveis de Ambiente Necessárias

No GitHub (Settings → Secrets and variables → Actions):
- `VERCEL_TOKEN`: Token de acesso da Vercel

Obter token em: [Vercel Account Settings → Tokens](https://vercel.com/account/tokens)

### Verificações de Segurança

O workflow `deploy.yml` verifica:
1. ✅ Tag deve começar com `v` (ex: `v1.0.0`)
2. ✅ Release deve targeting branch `master`
3. ✅ Push de tag deve ser na branch `master`

### O que NÃO triggera deploy

- ❌ Push em branches `dev`, `staging`, `feat/*`
- ❌ Tags sem prefixo `v` (ex: `1.0.0`)
- ❌ Releases targeting outras branches
- ❌ Pull requests

## Estrutura de Versões

Seguimos [Semantic Versioning](https://semver.org/):

- **MAJOR**: Mudanças incompatíveis (ex: `1.0.0` → `2.0.0`)
- **MINOR**: Novas funcionalidades compatíveis (ex: `1.0.0` → `1.1.0`)
- **PATCH**: Correções de bugs (ex: `1.0.0` → `1.0.1`)

Exemplos:
- `v1.0.0` - Primeira release estável
- `v1.1.0` - Novas funcionalidades
- `v1.1.1` - Correção de bug
- `v2.0.0` - Breaking changes

## Monitoramento do Deploy

### GitHub Actions
Acompanhe em: https://github.com/Fernandorsoul/ironplate/actions

### Vercel Dashboard
Acompanhe em: https://vercel.com/rs-oul/ironplate/deployments

### Logs de Deploy
```bash
# Ver logs do workflow
gh run list --workflow=deploy.yml

# Ver logs específicos
gh run view <run-id> --log
```

## Rollback

Se algo der errado:

```bash
# 1. Identificar tag anterior
git tag -l --sort=-v:refname

# 2. Criar nova tag apontando para commit anterior
git tag -a v1.0.1-hotfix <commit-hash> -m "Hotfix v1.0.1"

# 3. Pushar (triggera novo deploy)
git push origin v1.0.1-hotfix
```

## Checklist de Release

- [ ] Todos os PRs mergeados na master
- [ ] CI passando na master
- [ ] Testes manuais realizados
- [ ] Versão atualizada no `package.json` (opcional)
- [ ] Changelog atualizado (opcional)
- [ ] Tag criada e pushada
- [ ] Release criada no GitHub
- [ ] Deploy verificado na Vercel
- [ ] Smoke tests pós-deploy

## Troubleshooting

### Deploy não triggera

1. Verifique se a tag começa com `v`: `git tag -l`
2. Verifique se está na master: `git branch --show-current`
3. Verifique secrets no GitHub: Settings → Secrets
4. Verifique logs do workflow: Actions → Deploy to Vercel

### Erro "VERCEL_TOKEN not found"

Adicione o token em:
GitHub → Settings → Secrets and variables → Actions → New repository secret
- Name: `VERCEL_TOKEN`
- Value: `<seu token da Vercel>`

### Deploy falha

1. Verifique logs do workflow
2. Verifique se `vercel.json` está configurado corretamente
3. Verifique se há erros de build
4. Tente redeploy manual via Vercel Dashboard

## Exemplo Completo

```bash
# Preparar release
git checkout master
git pull origin master
npm test  # Garantir que testes passam

# Criar release
./scripts/release.sh 1.2.0 "Adiciona recuperação de senha e rate limiting"

# Aguardar deploy (~2-3 minutos)
# Verificar em: https://vercel.com/rs-oul/ironplate/deployments

# Criar release no GitHub com notas
gh release create v1.2.0 --title "Release v1.2.0" --notes "
## Novidades
- Recuperação de senha com verificação de email
- Rate limiting em todos os endpoints API
- Política de privacidade LGPD compliant
- Exclusão de conta

## Correções
- Fix no cálculo de macros
- Fix no layout da tela de perfil
"
```

## Suporte

Para dúvidas ou problemas:
- Documentação Vercel: https://vercel.com/docs
- GitHub Actions: https://docs.github.com/actions
- Issues do projeto: https://github.com/Fernandorsoul/ironplate/issues
