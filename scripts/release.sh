#!/bin/bash

# Script para criar release e triggerar deploy na Vercel
# Uso: ./scripts/release.sh <version> [message]
# Exemplo: ./scripts/release.sh 1.0.0 "Primeira release estável"

set -e

VERSION=$1
MESSAGE=$2

if [ -z "$VERSION" ]; then
  echo "Erro: Versão não especificada"
  echo "Uso: ./scripts/release.sh <version> [message]"
  echo "Exemplo: ./scripts/release.sh 1.0.0 \"Primeira release estável\""
  exit 1
fi

# Verificar se está na branch master
CURRENT_BRANCH=$(git branch --show-current)
if [ "$CURRENT_BRANCH" != "master" ]; then
  echo "Erro: Você não está na branch master"
  echo "Branch atual: $CURRENT_BRANCH"
  echo "Faça checkout para master antes de criar uma release"
  exit 1
fi

# Verificar se há mudanças não commitadas
if [ -n "$(git status --porcelain)" ]; then
  echo "Erro: Há mudanças não commitadas"
  echo "Commit ou stash as mudanças antes de criar uma release"
  exit 1
fi

# Verificar se a tag já existe
if git tag -l "v$VERSION" | grep -q "v$VERSION"; then
  echo "Erro: A tag v$VERSION já existe"
  exit 1
fi

echo "🚀 Criando release v$VERSION..."
echo ""

# Criar tag
git tag -a "v$VERSION" -m "Release v$VERSION${MESSAGE:+ - $MESSAGE}"

# Push tag (triggera o deploy)
echo "📤 Pushing tag v$VERSION..."
git push origin "v$VERSION"

echo ""
echo "✅ Release v$VERSION criada com sucesso!"
echo ""
echo "O deploy na Vercel será triggerado automaticamente."
echo "Acompanhe o progresso em: https://github.com/Fernandorsoul/ironplate/actions"
echo ""
echo "Após o deploy, crie a release no GitHub:"
echo "https://github.com/Fernandorsoul/ironplate/releases/new?tag=v$VERSION"
