# IronPlate — Refined Scope (Product Owner)

> **Documento histórico de discovery.** Status, gaps e escopo abaixo representam o início do projeto. Não use este arquivo como fonte de verdade da versão atual; consulte [README.md](README.md), [CHANGELOG.md](CHANGELOG.md) e [ARCHITECTURE.md](ARCHITECTURE.md).

## Status: Discovery Complete

## Estado Atual vs Requisitos

| Feature | Status | Detalhe |
|---------|--------|---------|
| 1. Planos alimentares | ✅ Parcial | Auto-geração funciona; falta edição manual e personalização |
| 2. Contagem de macros | ✅ Completa | Tracking por refeição com busca de alimentos e porções em gramas |
| 3. Treinos integrados | ✅ Parcial | Registro de treino existe; falta vinculação nutrição↔treino |
| 4. Pesagem corporal | ✅ Parcial | Input e histórico OK; gráfico é barras básicas (não Victory Native) |
| 5. Refeições pré/pós treino | ✅ Parcial | Timing existe; falta sugestão automática baseada no treino |
| 6. Calculadora de calorias | ✅ Completa | BMR (Mifflin-St Jeor), TDEE, macros por objetivo/esporte |

## Gaps Identificados

### G1 — Banco de alimentos limitado (20 itens)
- **Impacto**: Alto — usuário não consegue registrar refeições com alimentos fora da lista
- **Solução**: Adicionar busca por alimentos customizados + expansão do banco

### G2 — Gráfico de peso é barras SVG manuais
- **Impacto**: Médio — experiência visual inferior ao esperado (Victory Native já está na dependência)
- **Solução**: Substituir por LineChart do Victory Native

### G3 — Plano alimentar não é editável
- **Impacto**: Alto — usuário não pode personalizar o plano gerado
- **Solução**: Tela de edição de plano com adição/remoção de refeições

### G4 — Sem vinculação treino ↔ nutrição
- **Impacto**: Médio — feature "Treinos Integrados" está incompleta
- **Solução**: Sugerir macros ajustados quando treino é registrado

### G5 — Sem delete de refeição individual
- **Impacto**: Médio — usuário não pode corrigir erros no log diário
- **Solução**: Swipe-to-delete ou botão de remover na HomeScreen

## User Stories Prioritizadas

### P0 — Core (sprint atual)

**US-01**: Como atleta, quero adicionar alimentos customizados ao banco, para registrar refeições que não estão na lista padrão.
- **AC**: Campo "Novo Alimento" com nome, macros/100g; alimento aparece na busca imediatamente; persiste offline.

**US-02**: Como atleta, quero ver meu peso em gráfico de linha, para acompanhar a tendência visualmente.
- **AC**: LineChart do Victory Native com pontos; exibe últimos 30 dias; tooltip com peso e data.

**US-03**: Como atleta, quero editar meu plano alimentar, para ajustar refeições às minhas preferências.
- **AC**: Tela de edição com adição/remoção de refeições; recálculo automático de totais; persistência.

**US-04**: Como atleta, quero deletar uma refeição do log diário, para corrigir erros de registro.
- **AC**: Botão ou gesto de deletar; macros do dia são recalculados; confirmação antes de excluir.

### P1 — Enhancement (próximo sprint)

**US-05**: Como atleta, quero receber sugestões nutricionais baseadas no meu treino do dia.
- **AC**: Ao registrar treino, app sugere macros ajustados (ex: +carbs em dia de treino pesado).

**US-06**: Como atleta, quero ver resumo semanal de macros, para avaliar consistência.
- **AC**: Tela ou card com média de 7 dias; comparação com meta; indicadores de aderência.

## Escopo IN
- 6 features do intake-brief.md
- Onboarding completo (4 steps)
- Persistência offline (AsyncStorage)
- Cálculos nutricionais (BMR, TDEE, macros)
- Banco de alimentos com 20+ itens
- Custom foods (US-01)
- Gráfico Victory Native (US-02)
- Edição de plano (US-03)
- Delete de refeição (US-04)

## Escopo OUT
- Backend/API (offline-first apenas)
- Autenticação/login
- Notificações push
- Integração com wearables
- Modo social/sharing
- Planos de treino estruturados (apenas registro livre)
