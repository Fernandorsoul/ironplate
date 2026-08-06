# ADR-002: Weight Chart Migration to Victory Native

## Status: Accepted

## Context
O gráfico de peso em `WeightScreen.tsx` usa View/StyleSheet para barras manuais. Victory Native v41.26.0 já é dependência mas não está utilizado. O gráfico atual não mostra tendência nem permite interação.

## Decisão
Substituir o gráfico de barras por `VictoryChart` com `VictoryLine` + `VictoryScatter` + `VictoryVoronoiContainer` para tooltips.

### Alternativas Consideradas
1. **Manter barras SVG manuais** — Rejeitado: UX pobre, sem tooltip, sem tendência.
2. **react-native-chart-kit** — Rejeitado: Victory Native já está instalado.
3. **Victory Native LineChart** — Aceito: já na dependência, suporta line/scatter/tooltip nativamente.

## Consequências
- `WeightScreen.tsx` substitui `chartBars` por componente Victory
- Tooltip mostra peso + data ao tocar no ponto
- Linha de tendência visual conecta os pontos
- Mantém fallback para "sem dados" quando < 2 registros
