# Changelog

Alterações funcionais relevantes do IronPlate. A data representa a integração da entrega no fluxo de desenvolvimento; a publicação em produção depende de uma GitHub Release.

## Não lançado

### Interface

- Grade de Ações rápidas corrigida para duas colunas no celular e quatro em telas maiores.
- Cards de ação com altura uniforme, conteúdo contido, hover no web e feedback de toque.
- Entrada escalonada dos blocos da Home e animação da barra de calorias.

### Documentação

- README reescrito para refletir a arquitetura, os recursos e as versões atuais.
- Guias de arquitetura, contribuição, Android e release alinhados ao código e aos workflows.
- Índice central adicionado em `docs/README.md`.

## 2026-08-30 — Página pública e cadastro

### Adicionado

- Seção pública de novidades com cards que resumem as entregas recentes.
- Link de navegação direta para as novidades.
- Modal responsivo de cadastro no mesmo padrão visual do login.
- Alternância direta entre cadastro e login sem abrir uma nova página.

### Alterado

- A rota e a tela separada de cadastro foram removidas.
- O cadastro passou a validar nome, email, senha, confirmação e aceite da Política de Privacidade no modal.

## 2026-08-30 — Dietas validadas para atletas

### Adicionado

- Catálogo de receitas completas por horário: café da manhã, lanches, almoço, pré-treino, pós-treino, jantar e ceia.
- Opções variadas e econômicas formadas por combinações culinárias intencionais.
- Otimização de porções dentro de limites específicos por ingrediente.
- Validação obrigatória de todas as refeições e dos totais do plano antes da apresentação.
- Testes de regressão para integridade das receitas, limites, macros e perfis esportivos.

### Alterado

- O gerador deixou de combinar fontes nutricionais isoladas de forma aleatória.
- Nomes das refeições agora identificam a receita selecionada.
- Planos reprovados interrompem a geração em vez de chegar à interface.

## 2026-08-30 — Persistência de peso e planos

### Corrigido

- Registros manuais de peso são persistidos no histórico do Neon.
- Planos escolhidos são salvos e o plano ativo permanece selecionado entre sessões.
- Exclusão e ativação de planos atualizam o banco e o estado do aplicativo.
- Hidratação após login recarrega logs, planos, peso e alimentos personalizados.

## 2026-08-28 — Medidas caseiras e gramas

### Adicionado

- Formatação centralizada para apresentar medida caseira aproximada e gramas.
- `quantity` e `unit` nas porções criadas pelo gerador automático quando existe conversão conhecida.
- Conversão durante a exibição de planos antigos que armazenam somente gramas.
- Cobertura para claras, cottage, quinoa, salmão, tilápia, peito de peru, couve-flor, abobrinha, repolho, abacate e demais itens usados pelas receitas.

### Aplicado em

- Opções de dieta geradas.
- Plano alimentar ativo.
- Edição do plano.
- Refeições diárias.
- Exportação HTML/PDF.

Exemplo:

```text
Banana, prata: aprox. 1 banana (120 g)
```

Os gramas continuam sendo a referência dos cálculos; medidas caseiras são aproximações para facilitar a execução do plano.

## 2026-08 — Segurança, treinos e perfil

### Alterado

- Grupos musculares das fichas de treino podem ser personalizados.
- Recuperação de senha exige origem canônica configurada.
- Tokens de recuperação são validados e consumidos de forma atômica.
- Conteúdo de planos é escapado antes da exportação HTML.
- Foto de perfil passou a persistir e aparecer corretamente após nova sessão.
