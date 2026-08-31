# Balanças Bluetooth no IronPlate

O suporte BLE é experimental e funciona somente em builds nativos Android/iOS. A presença de um parser no código não garante compatibilidade com todos os modelos, revisões de hardware ou firmwares de uma marca.

Na web, use o registro manual de peso.

## Protocolos implementados

| Família/protocolo | Identificação principal | Leitura implementada |
| --- | --- | --- |
| Bluetooth SIG Weight Scale | Serviço `0x181D`, característica `0x2A9D` | Peso métrico ou imperial |
| Bluetooth SIG Body Composition | Serviço `0x181B` | Descoberta e fallback de payload |
| Xiaomi/Mi Scale | Serviços `0xFEE0` ou `0xFECB`, característica `0xFEE2` | Peso e, quando presentes, gordura, impedância e massa muscular |
| Tanita proprietário | Serviço iniciado por `e95d96ee` e características `a02ec7*` | Parser heurístico de peso e composição disponível no frame |
| OKOK/Chipsea V1 | Serviço `0xFFF0`, notificação `0xFFF4` | Peso, impedância e timestamp quando presentes |
| OKOK/Chipsea V2/V20 | Serviços/características `0xFFB0`, `0xFFB2`, `0xFFB3`, `0xFFF2` e `0xFFF3` | Peso e BIA conforme o formato detectado |
| Desconhecido | Serviços enumerados após conexão | Fallback heurístico limitado |

O scanner também tenta ler `manufacturerData` transmitido por broadcast em dispositivos Chipsea compatíveis.

## O que “suportado” significa

O serviço consegue descobrir o dispositivo, conectar, enumerar características e interpretar um payload que corresponde às validações implementadas. Para considerar um modelo homologado, ainda é necessário registrar:

- nome comercial e revisão de hardware;
- versão de firmware;
- Android/iOS e versão do sistema;
- UUIDs observados;
- métricas comparadas com o visor e com o aplicativo oficial;
- reconexão e repetição de leitura.

Sem esse teste, trate a compatibilidade como tentativa experimental. Não use listas de modelos apenas por compartilharem uma marca.

## Métricas

Dependendo do protocolo, uma leitura pode conter somente peso ou também:

- impedância, resistência e reactância;
- gordura corporal e visceral;
- massa muscular e esquelética;
- água, proteína e massa óssea;
- IMC, metabolismo basal, idade estimada e ângulo de fase.

O aplicativo só apresenta métricas realmente recebidas no payload. Valores de composição calculados pelo firmware da balança podem usar fórmulas proprietárias e não devem ser tratados como diagnóstico.

## Uso

1. Abra a tela **Peso** em um build nativo.
2. Toque em **Conectar balança**.
3. Conceda as permissões solicitadas.
4. Ligue/suba na balança e aguarde uma leitura estável.
5. Confira o valor antes de salvar.
6. Se a conexão falhar, cancele o scan antes de tentar novamente.

O peso salvo é enviado à API e persistido em `weight_history`. O registro manual continua disponível mesmo quando o BLE não encontra um dispositivo.

## Requisitos Android

- Android abaixo da API 31: localização pode ser exigida para o scan BLE.
- Android 12 ou superior: permissões de scan e conexão Bluetooth.
- Bluetooth ligado; alguns aparelhos antigos também exigem GPS ativo.
- O aplicativo oficial da balança deve estar fechado para evitar disputa pela conexão GATT.

Confira as permissões efetivas no AndroidManifest do build gerado. A configuração nativa pode mudar conforme as versões dos plugins.

## iOS

O CoreBluetooth gerencia a autorização no sistema. A descrição de uso, a descoberta e a leitura precisam ser validadas em iPhone físico; o simulador não substitui esse teste.

## Limitações conhecidas

- Protocolos fechados podem mudar sem aviso.
- Algumas balanças transmitem apenas por broadcast e outras exigem conexão/notify.
- Métricas adicionais podem chegar em frames separados.
- O fallback genérico pode reconhecer um número plausível que não represente a métrica esperada; sempre confira o visor.
- Composição corporal por bioimpedância varia com hidratação, alimentação e condições de medição.

## Como reportar um modelo

Abra uma issue sem dados pessoais e inclua:

- marca, modelo, hardware e firmware;
- plataforma e versão do sistema;
- etapa em que o fluxo falha;
- UUIDs e bytes anonimizados quando disponíveis;
- valor exibido pela balança e valor interpretado pelo app.

Não publique identificadores permanentes do aparelho ou informações de saúde de usuários.

## Referências internas

- Scanner e parsers: `src/services/bluetoothScale.ts`.
- Parsers Chipsea V20: `src/services/bluetoothScaleV20.ts`.
- Tela de peso: `src/screens/WeightScreen.tsx`.
- Build Android: [BUILD-ANDROID.md](BUILD-ANDROID.md).
