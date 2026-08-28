# Changelog

Este arquivo registra alterações funcionais relevantes do IronPlate.

## 2026-08-28 — Porções em medidas caseiras e gramas

### Implementado

- Criação de uma formatação centralizada para exibir cada alimento em medida caseira e em gramas.
- Inclusão de `quantity` e `unit` nas porções criadas pelo gerador automático de dietas.
- Conversão dinâmica para planos antigos que possuam apenas o peso em gramas.
- Ampliação do catálogo de conversões para os alimentos utilizados nas dietas automáticas, incluindo claras, cottage, quinoa, salmão, tilápia, peito de peru, couve-flor, abobrinha, repolho e abacate.
- Indicação explícita de que a medida caseira é aproximada e de que os gramas são a referência nutricional.

### Locais atualizados

- Opções de dieta recém-geradas.
- Plano alimentar ativo.
- Tela de edição do plano.
- Cards das refeições diárias.
- PDF/HTML exportado do plano alimentar.

Exemplo de apresentação:

```text
Banana, prata: aprox. 1 banana (120 g)
```

### Compatibilidade

- **Web:** usa a mesma função TypeScript das demais plataformas; a exportação web foi concluída com sucesso.
- **Android e iOS:** a apresentação usa somente componentes React Native e lógica TypeScript compartilhada, sem dependência de APIs exclusivas da web.
- **PDF:** na web, o plano é aberto ou baixado como HTML; no celular, continua sendo gerado por `expo-print` e compartilhado por `expo-sharing`.

### Validação realizada

- Verificação de tipos com `npx tsc --noEmit`: aprovada.
- Testes da raiz do projeto: 57 testes aprovados.
- Exportação web com Expo SDK 57: aprovada.
- Teste automatizado adicionado para garantir que os alimentos das dietas geradas contenham medida caseira e gramas.

### Observação de validação

A execução em um aparelho Android ou iPhone físico não foi realizada nesta sessão. A compatibilidade móvel foi verificada por tipagem, testes e uso exclusivo das APIs multiplataforma já adotadas pelo projeto.
