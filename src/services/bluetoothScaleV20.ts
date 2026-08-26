import { ScaleReadout } from './bluetoothScale';

/**
 * Parser Chipsea V20 (protocolo OKOK International / Yoda)
 *
 * Protocolo proprietário encontrado em pesquisas detalhadas:
 * - Magic bytes: 0xCA 0x20 (little-endian: [CA][20])
 * - Tamanho total: 19 bytes (manufacturer data) ou payload GATT de 13 bytes
 * - Endianess: Little-endian para peso/impedância nos advertisements
 * - Divisor condicional: >3000 ÷100, senão ÷10 (para kg)
 * - Checksum XOR com 0x20 sobre bytes 0..11
 *
 * Estrutura do payload (13 bytes após MAC strip):
 *   [0]  frame_type: 0x0B (constante)
 *   [1-4] reserved/sequence
 *   [5]  version: 0x01
 *   [6]  measurement_type: 0x05 = finalized (bit 0 = finalizada)
 *   [7-8] weight_raw: uint16 LE → divisor dinâmico (÷10 ou ÷100)
 *   [9-10] impedance_raw: uint16 LE × 0.1 Ω
 *   [11] heart_rate: 0 se não medido
 *   [12] checksum: XOR sum([0..11]) ^ 0x20
 *
 * IMPORTANTE: A balança Chipsea V20 TRANSMITE APENAS peso e impedância.
 * Body fat %, massa muscular, água, etc NÃO vêm deste payload — precisam
 * ser calculados localmente pelo app usando fórmulas científicas (Janssen, Mifflin)
 * OU viriam via GATT char fff3 (68 bytes fragmentado) que implementaçõe futuras.
 */
export function parseChipseaV20Payload(bytes: Uint8Array): Partial<ScaleReadout> {
  const result: Partial<ScaleReadout> = {};
  
  // Validação mínima de tamanho
  if (!bytes || bytes.length < 13) return result;

  // Verifica magic bytes: 0x0B no primeiro byte (frame type)
  if (bytes[0] !== 0x0B) return result;

  // Verifica se medição está finalizada (bit 0 de bytes[6] deve ser 1)
  if ((bytes[6] & 0x01) === 0) return result;

  // Calcula checksum XOR sobre bytes 0..11 e verifica com byte[12]
  let checksum = 0x20;
  for (let i = 0; i <= 11; i++) {
    checksum ^= bytes[i];
  }
  if (checksum !== bytes[12]) return result; // checksum inválido

  // Extrai peso bruto little-endian nos bytes [7-8]
  const weightRaw = (bytes[7] << 8) | bytes[8];

  // Divisor condicional conforme spec V20:
  // Se weightRaw > 3000, divide por 100 (precisão maior para pesagens altas)
  // Senão, divide por 10 (suficiente para faixa comum 25-180kg)
  const divisor = weightRaw > 3000 ? 100 : 10;
  const weight = weightRaw / divisor;

  // Validação plausibilidade do peso (5–400kg conforme cap max do device)
  if (weight < 5 || weight > 400) return result;
  result.weight = Number(weight.toFixed(2)); // arredonda para 2 casas decimais

  // Extrai impedância little-endian nos bytes [9-10], escala ×0.1 Ω
  const impedanceRaw = (bytes[9] << 8) | bytes[10];
  const impedance = impedanceRaw / 10.0;

  // Validação plausibilidade impedância bioimpedância (200–1200Ω típico)
  if (impedance >= 200 && impedance <= 1200) {
    result.resistance = Number(impedance.toFixed(1));
  }

  return result;
}

/**
 * Parser Chipsea V20 via GATT char 0x2A9C (Body Composition Measurement)
 *
 * Quando conectado ativamente, lê-se esta característica padrão BT SIG.
 * Formato específico do chip Chipsea (não segue layout oficial BT SIG):
 * 
 * Byte offset | Conteúdo | Descrição
 * -------------|----------|-------------
 * 0-1          | flags_lo | Control bytes little-endian
 *              | bit 0    | partial reading
 *              | bit 1    | impedance present
 *              | bit 3    | finished
 *              | bit 4    | weight stabilized
 *              | bit 6    | jin mode
 *              | bit 7    | finished
 *              | bit 8    | pounds mode
 * 2-8          | reserved | Padding/reserved
 * 9-10         | impedance| uint16 LE → ohms (direto, sem escala)
 * 11-12        | weight   | uint16 LE ÷10 → kg
 * 
 * Esta versão retorna SOMENTE peso e impedância — body composition completo
 * vem do char fff3 (68 bytes fragmentado) que ainda precisa implementação.
 */
export function parseChipseaV20GattPayload(bytes: Uint8Array): Partial<ScaleReadout> {
  const result: Partial<ScaleReadout> = {};
  
  if (!bytes || bytes.length < 13) return result;

  // Extrai flags little-endian (bytes 0-1)
  const flagsLo = bytes[0];
  const flagsHi = bytes[1];
  const allFlags = flagsLo | (flagsHi << 8);

  // Verifica se leitura está finalizada (bit 7 setado)
  if (!((allFlags >> 7) & 0x01)) return result;

  // Verifica se impulso está presente (bit 1)
  if (!((allFlags >> 1) & 0x01)) return result;

  // Extrai impedância little-endian bytes [9-10]
  const impedance = (bytes[9] << 8) | bytes[10];
  if (impedance > 0) result.resistance = impedance;

  // Extrai peso little-endian bytes [11-12], escala ÷10 kg
  const weightRaw = (bytes[11] << 8) | bytes[12];
  const weight = weightRaw / 10.0;

  // Validação peso plausível (5–400kg)
  if (weight >= 5 && weight <= 400) {
    result.weight = Number(weight.toFixed(2));
  }

  return result;
}
