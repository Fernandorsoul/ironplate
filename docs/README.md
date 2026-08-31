# Documentação do IronPlate

Este índice separa a documentação operacional, técnica e de conformidade do projeto.

## Para usuários e produto

| Documento | Conteúdo |
| --- | --- |
| [README principal](../README.md) | Visão geral, funcionalidades, execução local e stack |
| [Changelog](../CHANGELOG.md) | Alterações funcionais relevantes por data |
| [Balanças Bluetooth](../BLESCALES.md) | Protocolos implementados, limitações e uso do BLE |

## Para desenvolvimento

| Documento | Conteúdo |
| --- | --- |
| [Arquitetura](../ARCHITECTURE.md) | Camadas, fluxos de dados, persistência e segurança |
| [Contribuição](../CONTRIBUTING.md) | Branches, commits, testes e revisão |
| [Migrations](../migrations/README.md) | Geração e aplicação de migrations no Neon |
| [ADR-001](../ADR-001-custom-foods-architecture.md) | Persistência atual de alimentos personalizados e decisão offline substituída |
| [ADR-002](../ADR-002-chart-migration.md) | Migração de gráfico ainda não implementada |

## Build, release e operação

| Documento | Conteúdo |
| --- | --- |
| [Build Android](../BUILD-ANDROID.md) | Pré-requisitos e perfis EAS para APK/AAB |
| [Release e deploy](../RELEASE.md) | Publicação no GitHub e deploy de produção na Vercel |

## Privacidade e conformidade

| Documento | Conteúdo |
| --- | --- |
| [LGPD](lgpd/README.md) | Índice de privacidade, ROPA, DPO e resposta a incidentes |

## Histórico de produto

Estes arquivos preservam decisões do início do projeto e possuem um aviso de que não representam a arquitetura atual:

| Documento | Conteúdo histórico |
| --- | --- |
| [Intake brief](../intake-brief.md) | Problema, público e proposta inicial offline-first |
| [Refined scope](../refined-scope.md) | Discovery e gaps do primeiro escopo |
| [Solution outline](../solution-outline.md) | Plano de implementação das primeiras histórias P0 |

## Fonte de verdade

Em caso de divergência entre um documento e a implementação:

1. `package.json` e `app.json` definem versões, scripts e configuração do aplicativo.
2. `api/db/schema.ts` e `migrations/` definem o banco.
3. `.github/workflows/` define CI e deploy.
4. `src/` e `api/` definem o comportamento em execução.

Ao alterar qualquer um desses itens, atualize o documento correspondente no mesmo pull request.
