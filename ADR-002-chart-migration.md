# ADR-002: Migração do gráfico de peso

## Status

**Não implementado / decisão pendente.** O documento original marcava a migração para Victory Native como aceita, mas a tela atual ainda renderiza barras com `View` e `StyleSheet`.

## Contexto

`WeightScreen.tsx` mostra a evolução recente em um gráfico simples de barras. O projeto possui Victory Native e Skia nas dependências, porém a tela de peso não usa esses pacotes hoje.

## Decisão atual

Manter o gráfico existente até que uma migração seja implementada, testada nas três plataformas e acompanhada de critérios claros de acessibilidade e desempenho.

Nenhuma documentação deve prometer linha, scatter ou tooltip enquanto esses componentes não estiverem no código.

## Critérios para uma futura decisão

- funcionamento em web, Android e iOS;
- labels e descrição acessível além da representação visual;
- suporte a poucos pontos, séries longas e ausência de dados;
- tooltip ou seleção utilizável por toque e teclado;
- bundle e desempenho aceitáveis;
- testes de transformação dos dados e regressão visual.

## Alternativas a reavaliar

1. Evoluir as barras atuais sem biblioteca adicional.
2. Usar Victory Native já instalado.
3. Usar Skia diretamente.
4. Criar um gráfico SVG simples e acessível.

Uma nova decisão deve atualizar este ADR para **Aceito** somente junto da implementação correspondente.

## Arquivo relacionado

- `src/screens/WeightScreen.tsx`
