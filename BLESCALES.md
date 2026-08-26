# Balanças Bluetooth Compatíveis — IronPlate

## ✅ Suportadas nativamente

### Tanita
| Modelo | Serviço GATT | Char UUID | Parser |
|--------|-------------|-----------|--------|
| BC-758, BC-601, BC-545 | `e95d96ee-0000-0000-1000-78db6dd559b0` | auto-discover | `parseTanitaPayload()` Layout A/B |
| MS-160, MS-300, MS-550 | Mesmo serviço BC series | auto-discover | Mesmo |
| HD-380, HD-382 | Mesmo serviço BC series | auto-discover | Mesmo |

**Métricas disponíveis:** peso (0.01kg), impedância/Ω, % gordura, massa muscular (0.01kg), % água, massa óssea (0.01kg), gordura visceral

### Xiaomi / Mi Body Composition Scale 2 (MJSCL02YL)
| Modelo | Serviço GATT | Char UUID | Parser |
|--------|-------------|-----------|--------|
| MJSCL02YL (Mi Scale 2) | `0000fee0-...` ou `0000fecb-...` | `fee2` | `parseXiaomiPayload()` |
| MJSCL01YD | `0000fee0-...` | `fee2` | Mesmo parser |

**Métricas disponíveis:** peso (0.01kg), % gordura, impedância (Ω), massa muscular (0.01kg)

### HOGG Weight Measurement (Padrão Bluetooth SIG)
| Marcas genéricas | Serviço GATT | Char UUID | Parser |
|-----------------|-------------|-----------|--------|
| Qualquer marca que implemente BT WSP | `0000181d-0000-1000-8000-00805f9b34fb` | `00002a9d` | `parseWeightMeasurement()` |

**Métricas disponíveis:** apenas peso (0.005kg métrico ou 0.01×0.4536kg imperial)

---

## 🔧 Sem suporte direto (requem workaround manual)

As seguintes balanças **não transmitem dados via BLE open**:
- **Withings Body+ / Body Comp** — App proprietário fecha os dados; API não documentada para BLE directo
- **Omron** — Protocolo fechado, sem reverse-engineering público relevante
- **Philips / Walaboi** — Dados ficam no app Philips SmartLife
- **Emser** — App próprio, protocolo BLE desconhecido/publicamente disponível
- **Go Smart** — App próprio, protocolo fechadosem specs públicas

> **Workaround:** Se sua balança não estiver na lista acima, você ainda pode registrar peso manualmente na tela "Peso Corporal".

---

## ⚠️ Requisitos Android

Para funcionar, o Android precisa de:
1. **Bluetooth ligado**
2. **Localização ligada** (Android < 12) ou permissão `BLUETOOTH_SCAN` + `BLUETOOTH_CONNECT` (Android 12+)
3. **GPS ativo** em alguns dispositivos mais antigos
4. **Não bloquear o app pela bateria** (modo economia)

Se a conexão falhar, abra Configurações → Apps → IronPlate → Permissões e confirme todas as autorizações.

---

## 📋 Fluxo de uso

1. Abra o app e vá na aba **"Peso"**
2. Toque em **"Conectar balança"**
3. Suba na balança enquanto espera
4. Quando as métricas aparecerem → toque em **"Salvar Todas"**
5. Ou vá em **"Avaliação Antropométrica"** → selecione **"Bioimpedância"** → **"Sincronizar da Balança"**
