# Treinos prescritos por profissionais

## Autorizacao

- Somente um perfil aprovado com registro `CREF` pode criar exercicios privados e fichas.
- A atribuicao exige vinculo ativo e consentimento com o escopo `training`.
- Revogar o vinculo ou o consentimento bloqueia imediatamente novas leituras e escritas profissionais.
- O aluno acessa exercicios privados somente quando eles aparecem em uma ficha publicada para ele.

## Versionamento

Cada edicao de ficha cria uma nova linha em `professional_training_plan_versions`. A publicacao aponta a ficha para a versao atual, sem alterar versoes anteriores. Uma execucao sempre referencia a versao publicada que o aluno recebeu e pode, opcionalmente, referenciar um `workout` do diario.

## Catalogo-base

A migration inclui apenas descricoes educacionais proprias do IronPlate e nao inclui midia de terceiros. Novos itens globais devem passar por revisao tecnica e de licenca. Exercicios privados permanecem visiveis somente ao autor e aos alunos que receberam uma ficha ativa que os referencia.

Para qualquer midia externa, `mediaUrl` exige `sourceAttribution`. A atribuicao deve identificar autoria, origem e permissao de uso; uma URL publica nao significa que o conteudo pode ser redistribuido.

## API

Os recursos usam `/api/users/get?resource=professionals&operation=<operacao>`:

- `exercises`: lista o catalogo acessivel e permite criar/editar itens privados.
- `training-plans`: cria rascunhos, novas versoes, publicacoes e arquivamentos.
- `training-executions`: registra e consulta execucoes sem modificar a prescricao.

Os payloads sao validados em `api/middleware/validation.ts`, e mudancas relevantes geram eventos em `audit_logs`.
