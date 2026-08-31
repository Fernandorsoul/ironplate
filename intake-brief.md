# IronPlate - Intake Brief

> **Documento histórico.** Este brief registra a proposta inicial offline-first e não descreve a arquitetura atual. Para o estado implementado, consulte [README.md](README.md) e [ARCHITECTURE.md](ARCHITECTURE.md). O Neon e a API substituíram a persistência local planejada.

## Problema
Atletas de bodybuilding e BJJ precisam gerenciar nutrição de forma específica para suas modalidades, mas apps genéricos não atendem às necessidades únicas (timing de refeições, macros para performance, ciclos de bulking/cutting).

## Solução
App móvel **IronPlate** focado em nutrição esportiva para bodybuilding e BJJ.

## Features Prioritárias
1. **Planos alimentares** - Criação e gestão de dietas personalizadas
2. **Contagem de macros** - Tracking de proteína, carboidrato, gordura
3. **Treinos integrados** - Vincular nutrição com plano de treino
4. **Pesagem corporal** - Gráficos de evolução de peso
5. **Refeições pré/pós treino** - Timing nutricional específico
6. **Calculadora de calorias** - TDEE, metabolismo basal, fator de atividade

## Plataforma
- React Native (Expo)
- TypeScript
- Offline-first (AsyncStorage/SQLite)

## Critérios de Sucesso
- Usuário consegue criar plano alimentar em < 5 minutos
- Tracking de macros em < 30 segundos por refeição
- Gráficos de evolução claros e motivadores
- Funcional offline

## Público-Alvo
- Atletas de bodybuilding (amadores e avançados)
- Practitioners de BJJ (faixas azul pra cima)
- Personal trainers que acompanham alunos
