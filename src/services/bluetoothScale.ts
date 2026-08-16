/**
 * Bluetooth Bioimpedance Scale Service for IronPlate
 *
 * Suporte para balanças BLE de bioimpedância:
 * - Tanita (BC-758, BC-601, BC-545, MS-160, MS-300, HD-380…)
 * - Xiaomi / Mi Body Composition Scale 2 (MJSCL02YL)
 * - OKOK International / Chipsea V1 (FFF0/FFF4 — clássico)
 * - OKOK International / Chipsea V2 (FFB0/FFB2/FFB3 — novo + BIA)
 * - Qualquer marca compatível HOGG Weight Measurement (BT SIG)
 *
 * Estratégia: escanear TODOS os dispositivos BLE → conectar → enumerar
 * todos os serviços → ler características conhecidas → extrair métricas.
 * Se nenhuma marca for identificada, tenta parsing genérico heurístico.
 */

import { PermissionsAndroid, Platform } from 'react-native';
import type { BleManager, Device } from 'react-native-ble-plx';

// Import parsers específicos OKOK/Chipsea V20 (validados rigorosamente)
import { parseChipseaV20Payload, parseChipseaV20GattPayload } from './bluetoothScaleV20';

// ─── Known GATT services for bioimpedance scales ────────────────────────
const BUILTIN_SERVICES = [
  // HOGG Weight Measurement (BT SIG standard)
  '0000181d-0000-1000-8000-00805f9b34fb',
  // Bluetooth SIG Body Composition Service
  '0000181b-0000-1000-8000-00805f9b34fb',
];

// Manufacturer-specific services used by popular scale brands
// UUIDs collected from open-source projects & reverse-engineering docs
const MANUFACTURER_SERVICES: Record<string, string> = {
  // Tanita — common across BC series
  tanita:        'e95d96ee-0000-0000-1000-78db6dd559b0',
  // Xiaomi / Mi Scale v1/v2 + Body Composition Scale 2
  xiaomi_v1:     '0000fee0-0000-1000-8000-00805f9b34fb',
  xiaomi_v2:     '0000fecb-0000-1000-8000-00805f9b34fb',
  // Beurer
  beurer:        '00001523-1212-efde-1523-785feabcd123',
  // Eufy / Anker
  eufy:          '0000181b-0000-1000-8000-00805f9b34fb',
  // Withings
  withings:      '00001523-1212-efde-1523-785feabcd124',
  // OKOK International / Chipsea V1 (classico)
  chipsea_v1:    '0000fff0-0000-1000-8000-00805f9b34fb',
  // OKOK International / Chipsea V2 (mais novo)
  chipsea_v2:    '0000ffb0-0000-1000-8000-00805f9b34fb',
};

// Chipsea characteristic UUIDs used for protocol-version detection
const CHIPSEA_V1_NOTIFY_CHAR = '0000fff4-0000-1000-8000-00805f9b34fb';
const CHIPSEA_V2_WEIGHT_CHAR = '0000ffb2-0000-1000-8000-00805f9b34fb';
const CHIPSEA_V2_BIA_CHAR    = '0000ffb3-0000-1000-8000-00805f9b34fb';

// Common characteristic UUIDs that carry measurement payloads
const MEASUREMENT_CHARS = [
  '00002a9d-0000-1000-8000-00805f9b34fb',         // HOGG Weight Measurement
  '00002a9c-0000-1000-8000-00805f9b34fb',         // HOGG Heart Rate Measurement (some scales)
  // Tanita proprietary
  'a02ec701-d892-8fbc-e338-dc25f5f3ffe6',
  'a02ec702-d892-8fbc-e338-dc25f5f3ffe6',
  'a02ec703-d892-8fbc-e338-dc25f5f3ffe6',
  // Xiaomi MJSCL01YD
  '0000fee2-0000-1000-8000-00805f9b34fb',
  // BodyComp
  '0000ff01-0000-1000-8000-00805f9b34fb',
  // Generic measurement char
  '00001524-1212-efde-1523-785feabcd123',
];

// ─── Metric types returned by the scanner ───────────────────────────────
export interface ScaleMetric {
  name: string;          // human-friendly label
  unit: string;
  value: number | null;
}

export interface ScaleReadout {
  weight?: number;              // kg
  resistance?: number;          // Ω
  reactance?: number;           // Ω
  phaseAngle?: number;          // °
  bodyFat?: number;             // %
  visceralFat?: number;         // fat grade
  muscleMass?: number;          // kg
  skeletalMuscle?: number;      // kg
  waterPercent?: number;        // %
  waterKg?: number;             // kg
  boneMass?: number;            // kg
  proteinPercent?: number;      // %
  proteinMass?: number;         // kg
  bmi?: number;                 // BMI
  basalMetabolism?: number;     // kcal/day
  age?: number;                 // estimated
  imperial?: boolean;
  date?: number;                // timestamp UNIX (Chipsea V1)
}

// ─── Parsers ────────────────────────────────────────────────────────────
/** Decode Base64 raw characteristic value into bytes */
function decodeBase64(value: string): Uint8Array {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
  const clean = value.replace(/=+$/, '');
  const out: number[] = [];
  let buffer = 0;
  let bits = 0;
  for (const ch of clean) {
    const idx = alphabet.indexOf(ch);
    if (idx < 0) continue;
    buffer = (buffer << 6) | idx;
    bits += 6;
    if (bits >= 8) {
      bits -= 8;
      out.push((buffer >> bits) & 0xff);
    }
  }
  return new Uint8Array(out);
}

/** Buffer → base64 string (for HOGG parser) */
function b64fromBuf(buf: Uint8Array): string {
  // Fast path: use global btoa via array
  let str = '';
  for (let i = 0; i < buf.length; i++) str += String.fromCharCode(buf[i]);
  return btoa(str);
}

/** Little-endian 16-bit unsigned int from a byte slice starting at offset */
function u16(bytes: Uint8Array, off: number): number {
  return bytes[off] | (bytes[off + 1] << 8);
}

/** Little-endian 16-bit signed int */
function s16(bytes: Uint8Array, off: number): number {
  const v = u16(bytes, off);
  return v & 0x8000 ? v - 0x10000 : v;
}

/** Little-endian 32-bit unsigned int */
function u32(bytes: Uint8Array, off: number): number {
  return (
    bytes[off] |
    (bytes[off + 1] << 8) |
    (bytes[off + 2] << 16) |
    (bytes[off + 3] << 24)
  );
}

/**
 * Parse a HOGG (HID-Out-Generic) Weight Measurement characteristic.
 * Only yields weight.
 */
export function parseWeightMeasurement(b64: string): number | null {
  const bytes = decodeBase64(b64);
  if (bytes.length < 3) return null;
  const isImperial = (bytes[0] & 0x01) !== 0;
  const raw = bytes[1] | (bytes[2] << 8);
  const kg = isImperial ? raw * 0.01 * 0.45359237 : raw * 0.005;
  return Number(kg.toFixed(2));
}

/**
 * Parse Xiaomi MJSCL02YL (Mi Body Composition Scale 2) payload.
 *
 * Protocolo baseado em reverse-engineering público (Home Assistant xiaomi_ble).
 * O dispositivo transmite via BLE Notify na char 0xfee2.
 *
 * Frame comum (big-endian após magic word):
 *   [0..3]   magic (0xDEADBEEF ou similar) – pode estar ausente
 *   [4..5]   weight_x100 LE u16           → peso em kg / 100
 *   [6..7]   body_fat_x100 LE u16         → % gordura × 100 (se presente)
 *   [8..9]   impedance LE u16             → impedância Ω (se presente)
 *   [10..11] muscle_mass_x100 LE u16      → massa muscular kg × 100
 *   [12]     bmi_x10                      → IMC × 10
 *   [13]     water_percent                → % água (opcional)
 *
 * Alguns modelos omitem magic e começam diretamente com peso.
 */
function parseXiaomiPayload(bytes: Uint8Array): Partial<ScaleReadout> {
  const result: Partial<ScaleReadout> = {};
  if (bytes.length < 6) return result;

  // Tenta encontrar peso como u16 LE com scaling 0.01kg
  // Varie offsets para encontrar valor plausível
  let foundWeightOffset = -1;
  for (let off = 0; off <= Math.min(bytes.length - 2, 6); off++) {
    const w = u16(bytes, off);
    const kg = w * 0.01;
    if (kg >= 25 && kg <= 250) {
      foundWeightOffset = off;
      break;
    }
  }

  if (foundWeightOffset >= 0) {
    result.weight = u16(bytes, foundWeightOffset) * 0.01;

    // Se temos offset de peso, tenta BF no próximo par de bytes
    const bfOff = foundWeightOffset + 2;
    if (bfOff + 1 < bytes.length) {
      const bf = u16(bytes, bfOff);
      if (bf > 0 && bf < 1000) { // < 1000 = < 10%BF se scaled by 100
        result.bodyFat = bf / 100;
      } else if (bf >= 5 && bf <= 55) { // raw percentage
        result.bodyFat = bf;
      }
    }

    // Impedância após BF
    const impOff = foundWeightOffset + (result.bodyFat != null ? 4 : 2);
    if (impOff + 1 < bytes.length) {
      const imp = u16(bytes, impOff);
      if (imp >= 200 && imp <= 1500) {
        result.resistance = imp;
      }
    }

    // Massa muscular após impedância
    const mmOff = impOff + 2;
    if (mmOff + 1 < bytes.length) {
      const mm = u16(bytes, mmOff);
      if (mm > 0 && mm < 800) {
        result.muscleMass = mm / 100;
      }
    }

    // IMC após massa muscular
    const bmiOff = mmOff + 2;
    if (bmiOff < bytes.length) {
      const bmiRaw = bytes[bmiOff];
      if (bmiRaw > 10 && bmiRaw < 60) {
        result.bmi = bmiRaw / 10;
      }
    }
  } else {
    // Fallback: tenta o formato clássico (peso no offset 1)
    const w = u16(bytes, 1);
    if (w > 0 && w < 40000) {
      result.weight = w / 100;
    }
  }

  return result;
}

/**
 * Parse Tanita-style payload (BC series / MS series / HD series).
 * Tanita usa serviço GATT personalizado e transmite frames compostos:
 * timestamp(4B), weight(2B LE), impedance(2B LE), body_fat(1B), …
 * Layout varia ligeiramente entre modelos.
 */
function parseTanitaPayload(bytes: Uint8Array): Partial<ScaleReadout> {
  const result: Partial<ScaleReadout> = {};

  if (bytes.length < 6) return result;

  // Procura por um valor de peso plausível (u16 LE, scaling 0.01kg)
  // Varre os primeiros 8 bytes procurando por 30–250 kg
  let weightFound = false;
  for (let off = 0; off <= Math.min(8, bytes.length - 2); off++) {
    const w = u16(bytes, off) * 0.01;
    if (w >= 25 && w <= 250) {
      result.weight = w;
      weightFound = true;

      // Impedância no próximo par de bytes (offset + 2)
      const impOff = off + 2;
      if (impOff + 1 < bytes.length) {
        const imp = u16(bytes, impOff);
        if (imp >= 200 && imp <= 1500) {
          result.resistance = imp;

          // Após impedância, procura % gordura (byte único 5–50)
          const bfOff = impOff + 2;
          if (bfOff < bytes.length) {
            const bf = bytes[bfOff];
            if (bf >= 5 && bf <= 50) {
              result.bodyFat = bf;
            }
          }

          // Após BF, tenta massa muscular (u16 LE)
          const mmOff = bfOff + 1;
          if (mmOff + 1 < bytes.length) {
            const mm = u16(bytes, mmOff) / 100;
            if (mm > 20 && mm < 100) {
              result.muscleMass = mm;
            }
          }
        }
      }
      break;
    }
  }

  // Se não encontrou peso nos primeiros bytes, tenta estrutura fixa
  // conhecida: [timestamp_le32][weight_x100_le][impedance_le16][bf][muscle_x100][water][bone]
  if (!weightFound && bytes.length >= 12) {
    const w = u16(bytes, 4) * 0.01;
    if (w >= 25 && w <= 250) {
      result.weight = w;
      result.resistance = u16(bytes, 6);
      result.bodyFat = bytes[7];
      result.muscleMass = u16(bytes, 8) / 100;
      result.waterPercent = bytes[9] || undefined;
      result.boneMass = u16(bytes, 10) / 100 || undefined;
      result.visceralFat = bytes[11] || undefined;
    }
  }

  return result;
}

// ─── Chipsea protocol parsers ────────────────────────────────────────────
/**
 * Parser Chipsea V1 (clássico) — balanças OKOK International / Chipsea.
 * Recebe o payload de notificação BLE da característica FFF4 e extrai
 * data/hora + peso + impedância.
 *
 * Frame (≥10 bytes):
 *   [0]  year-2017 em bits 7-4, month em bits 3-0
 *   [1]  dia (uint8)
 *   [2]  hora (uint8)
 *   [3]  minuto (uint8)
 *   [4]  segundo (uint8)
 *   [5]  byte alto do peso — nibble inferior = peso_hi; nibble superior = scale_type
 *   [6]  byte baixo do peso (uint8)
 *   [7..9] impedância little-endian 24-bit (byte 0, 1, 2)
 *
 * Calcula:
 *   weight_raw = ((data[5] & 0x0F) << 8) + data[6]
 *   weight_kg  = weight_raw * 0.1
 *   impedance  = data[7] | (data[8] << 8) | (data[9] << 16)  // LE 24-bit
 */
export function parseChipseaV1Payload(bytes: Uint8Array): Partial<ScaleReadout> {
  const result: Partial<ScaleReadout> = {};
  if (bytes.length < 10) return result;

  // Extrai ano e mês a partir do byte de timestamp
  const yearRaw = (bytes[0] >> 4) & 0x0F;  // bits 7-4 → ano (relativo a 2017)
  const month = bytes[0] & 0x0F;            // bits 3-0 → mês
  const day = bytes[1];                     // dia do mês

  // Constroi objeto Date com a data/hora da balança
  const year = yearRaw + 2017;              // ano real (ex.: 9 → 2026)
  const hour = bytes[2];
  const minute = bytes[3];
  const second = bytes[4];
  const date = new Date(year, month - 1, day, hour, minute, second);

  // Peso: nibble inferior do byte [5] forma o bit alto de 16 bits
  const weightRaw = ((bytes[5] & 0x0F) << 8) + bytes[6];
  result.weight = weightRaw * 0.1;          // escala de 0.1 kg por unidade

  // Impedância: little-endian 24-bit nos bytes [7], [8], [9]
  const impedance = bytes[7] | (bytes[8] << 8) | (bytes[9] << 16);
  if (impedance > 0) result.resistance = impedance;

  // Retorna peso e data/hora como timestamp UNIX
  if (date.getTime() > 0) result.date = date.getTime();

  return result;
}

/**
 * Parser Chipsea V2 — Weight Characteristic (característica FFB2).
 * Recebe o payload da característica de peso do protocolo Chipsea V2
 * e extrai apenas o valor de peso.
 *
 * Frame (≥10 bytes mínimo):
 *   [4]  estado — 0x02 = leitura estável/stable
 *   [5]  peso byte alto (nibble inferior): bits 7-6 = peso_hi
 *   [6]  peso byte médio (uint8)
 *   [7]  peso byte baixo (uint8)
 *
 * Calcula:
 *   weight_raw = ((data[5] & 0x03) << 16) | (data[6] << 8) | data[7]
 *   weight_kg  = weight_raw / 100.0
 */
export function parseChipseaV2WeightPayload(bytes: Uint8Array): Partial<ScaleReadout> {
  const result: Partial<ScaleReadout> = {};
  if (bytes.length < 10) return result;

  // Extrai peso dos três bytes combinados
  const weightRaw = ((bytes[5] & 0x03) << 16) | (bytes[6] << 8) | bytes[7];
  result.weight = weightRaw / 100.0;        // escala de 0.01 kg por unidade

  return result;
}

/**
 * Parser Chipsea V2 — BIA Characteristic (característica FFB3).
 * Recebe o payload bioimpedante da característica FFB3 do protocolo
 * Chipsea V2 e extrai peso + impedância.
 *
 * Frame (≥10 bytes mínimo, marker 0xA3 no offset [3]):
 *   [3]  marker — deve ser 0xA3 para validar payload
 *   [5]  peso byte alto (nibble inferior)
 *   [6]  peso byte médio
 *   [7]  peso byte baixo
 *   [8]  impedância byte alto (BIG-ENDIAN!)
 *   [9]  impedância byte baixo
 *
 * Calcula:
 *   weight_raw = ((data[5] & 0x03) << 16) | (data[6] << 8) | data[7]
 *   weight_kg  = weight_raw / 100.0
 *   impedance    = (data[8] << 8) | data[9]  // BIG-ENDIAN 16-bit Ω
 */
export function parseChipseaV2BIAPayload(bytes: Uint8Array): Partial<ScaleReadout> {
  const result: Partial<ScaleReadout> = {};
  if (bytes.length < 10) return result;

  // Valida marker específico do protocolo BIA V2
  if (bytes[3] !== 0xA3) return result;

  // Extrai peso (mesma fórmula do parser de peso V2)
  const weightRaw = ((bytes[5] & 0x03) << 16) | (bytes[6] << 8) | bytes[7];
  result.weight = weightRaw / 100.0;        // escala de 0.01 kg por unidade

  // Impedância: big-endian 16-bit (diferente do V1 que é little-endian)
  const impedance = (bytes[8] << 8) | bytes[9];
  if (impedance > 0) result.resistance = impedance;

  return result;
}

/**
 * Parser dados de advertisement BLE (broadcast sem conexão).
 * As balanças Chipsea transmitem peso e impedância nos anúncios BLE
 * manufacturer_data sem necessidade de conexão GATT.
 *
 * Formato: buffer de 13 bytes
 *   [0]  peso MSB (uint8 dividido por 100)
 *   [1]  peso LSB (uint8)       → peso = ((data[0]<<8)|data[1]) / 100.0
 *   [2]  impedância MSB (uint8 / 10.0)
 *   [3]  impedância LSB (uint8) → impedância = ((data[2]<<8)|data[3]) / 10.0
 *   [4]  magic byte fixo = 0x0A
 *   [5]  magic byte fixo = 0x01
 *   [6]  status (>0 indica leitura estável quando impedância==0)
 *
 * Validação obrigatória: magic == [0x0A, 0x01] E peso entre 5–400 kg
 */
export function parseBroadcastManufacturerData(manufacturerData: Uint8Array): Partial<ScaleReadout> {
  const result: Partial<ScaleReadout> = {};
  if (!manufacturerData || manufacturerData.length < 13) return result;

  // Verifica magic bytes obrigatórios antes de processar
  if (manufacturerData[4] !== 0x0A || manufacturerData[5] !== 0x01) return result;

  // Extrai peso: combina MSB e LSB divide por 100 para obter kg
  const weightRaw = (manufacturerData[0] << 8) | manufacturerData[1];
  const weight = weightRaw / 100.0;

  // Peso dentro do intervalo plausível? (5–400 kg conforme especificação)
  if (weight < 5 || weight > 400) return result;
  result.weight = weight;

  // Extrai impedância na mesma frequência do peso
  const impedanceRaw = (manufacturerData[2] << 8) | manufacturerData[3];
  const impedance = impedanceRaw / 10.0;
  result.resistance = impedance;

  // Status > 0 e impedância zerada indicam leitura estável
  if (manufacturerData[6] > 0 && impedance === 0) {
    result.imperial = true;  // marca flag de leitura válida
  }

  return result;
}

/**
 * Generic heuristic parser — attempts to extract sensible values when
 * we don't know the exact brand/frame format. Returns partial readout.
 */
function parseGenericPayload(bytes: Uint8Array): Partial<ScaleReadout> {
  const result: Partial<ScaleReadout> = {};

  // Tenta identificar peso como u16 LE em diferentes offsets (balanças genéricas variam)
  for (let off = 0; off <= Math.min(bytes.length - 2, 10); off++) {
    const w = u16(bytes, off);
    // Peso deve estar entre 25-180kg (max da okok é 180kg)
    if (w >= 2500 && w <= 18000) {
      result.weight = w / 100;
      break;
    }
  }

  // Impedância típica: 200–900 Ω para bioimpedância
  for (let off = 0; off <= bytes.length - 2; off++) {
    const v = u16(bytes, off);
    if (v >= 200 && v <= 900) {
      result.resistance = v;
      break;
    }
  }

  // %Gordura geralmente 5–40%
  for (let off = 0; off < bytes.length; off++) {
    const v = bytes[off];
    if (v >= 5 && v <= 50) {
      if (!result.bodyFat) result.bodyFat = v;
    }
  }

  return result;
}

/** Merge two partial readouts (right wins on conflict) */
function mergeReadouts(a: ScaleReadout, b: Partial<ScaleReadout>): ScaleReadout {
  for (const [key, val] of Object.entries(b)) {
    if (val != null && !(key in a)) {
      (a as Record<string, unknown>)[key] = val;
    } else if (val != null && typeof val === 'number') {
      // Non-null overrides only if left is undefined
      if ((a as Record<string, unknown>)[key] === undefined) {
        (a as Record<string, unknown>)[key] = val;
      }
    }
  }
  return a;
}

// ─── Permission helpers ─────────────────────────────────────────────────
async function requestBluetoothPermission(): Promise<boolean> {
  if (Platform.OS === 'web') throw new Error('Bluetooth de balança não disponível no navegador.');

  if (Platform.OS === 'android' && Number(Platform.Version) < 31) {
    return (await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION))
      === PermissionsAndroid.RESULTS.GRANTED;
  }

  if (Platform.OS === 'android') {
    const result = await PermissionsAndroid.requestMultiple([
      PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN,
      PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,
      PermissionsAndroid.PERMISSIONS.BLUETOOTH_ADVERTISE,
    ]);
    return (
      result[PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN] === PermissionsAndroid.RESULTS.GRANTED &&
      result[PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT] === PermissionsAndroid.RESULTS.GRANTED
    );
  }

  // iOS — permission is granted implicitly on iOS 13+ when using CoreBluetooth
  return true;
}

// ─── Main scanner ───────────────────────────────────────────────────────
interface ScaleScannerCallbacks {
  onWeight: (readout: ScaleReadout, deviceName: string) => void;
  onStatus: (msg: string) => void;
}

/**
 * Scan for nearby BLE bioimpedance scales.
 *
 * Reads ALL characteristic values on discovered peripherals and extracts
 * whatever metrics are available (weight, impedance, body fat, etc.).
 * Returns a cleanup function.
 *
 * @param callbacks — receives partial/full readouts and status messages
 * @returns teardown function
 */
export async function connectToWeightScale(
  callbacks: ScaleScannerCallbacks,
): Promise<() => void> {
  const { onWeight, onStatus } = callbacks;

  if (!(await requestBluetoothPermission())) {
    throw new Error('Permissão de Bluetooth não concedida. Ative o Bluetooth e permita o acesso nas configurações do dispositivo.');
  }

  const { BleManager } = await import('react-native-ble-plx');
  let manager: BleManager | null = null;
  let stopRequested = false;

  onStatus('Inicializando scanner Bluetooth…');

  manager = new BleManager();

  // Collect all characteristics from a connected device and try to parse them
  // Also set up notify monitoring for real-time weight updates while standing on scale
  async function probeDevice(device: Device): Promise<ScaleReadout> {
    const readout: ScaleReadout = {};
    console.log('[BLE] Services:', (await device.services()).map(s => s.uuid)); // DEBUG LOG
    
    const servicesList: any[] = await device.services();
    const svcUUIDs = servicesList.map((s: any) => s.uuid.toLowerCase());
    // Identifica marca da balança pelos UUIDs de serviço descobertos
    const isTanita = svcUUIDs.some((u: string) =>
      u.includes(MANUFACTURER_SERVICES.tanita) || u.startsWith('a02ec7'),
    );
    const isXiaomi = svcUUIDs.some((u: string) =>
      u.includes(MANUFACTURER_SERVICES.xiaomi_v1) ||
      u.includes(MANUFACTURER_SERVICES.xiaomi_v2) ||
      u.includes('fee0') || u.includes('fecb'),
    );
    // Detecta versão Chipsea (V1 ou V2) pelas características presentes
    const hasChipseaV1Char = svcUUIDs.includes(CHIPSEA_V1_NOTIFY_CHAR);
    const hasChipseaV2WeightChar = svcUUIDs.includes(CHIPSEA_V2_WEIGHT_CHAR);
    const hasChipseaV2BIAChar = svcUUIDs.includes(CHIPSEA_V2_BIA_CHAR);
    const isChipsea = svcUUIDs.some(u =>
      u.includes(MANUFACTURER_SERVICES.chipsea_v1) ||
      u.includes(MANUFACTURER_SERVICES.chipsea_v2),
    );

    // Generic HOGG check
    const isHogg = svcUUIDs.some(u => u === '0000181d-0000-1000-8000-00805f9b34fb');

    // Phase 1: Ler todas as características (pode retornar valores estáticos)
    for (const service of servicesList) {
      try {
        const chars: any[] = await service.characteristics();
        for (const char of chars) {
          try {
            const data: Buffer = await char.readValue();
            if (!data || data.length === 0) continue;
            _processData(readout, data, char.uuid, isTanita, isXiaomi, isChipsea);
          } catch {
            // Skip unreadable characteristics
          }
        }
      } catch {
        // Skip inaccessible services
      }
    }

    // Phase 2: Assinar notify para atualizações em tempo real enquanto o usuario permanece na balança
    // Muitas balanças enviam dados SOMENTE após assinar notify
    try {
      for (const service of servicesList) {
        const chars: any[] = await service.characteristics();
        for (const char of chars) {
          try {
            let collectedBytes: Uint8Array[] = [];
            const charUuid = char.uuid;       // captura UUID antes do async boundary
            await char.startNotifications();

            // Use characteristic.monitorForValue (ble-plx v3.x API)
            char.monitorForValue((err: Error | null, charVal: any) => {
              if (err || !charVal?.value) return;
              collectedBytes.push(new Uint8Array(charVal.value as ArrayBuffer));
            });

            // Aguarda leituras enquanto o usuario fica na balança
            await new Promise<void>(resolve => setTimeout(resolve, 4000));

            // Processa todos os bytes coletados passando o UUID da caracteristica
            for (const chunk of collectedBytes) {
              _processData(readout, chunk, charUuid, isTanita, isXiaomi, isChipsea);
            }

            await char.stopNotifications();
          } catch {
            // Some chars don't support notify — skip silently
          }
        }
      }
    } catch {
      // Notify setup failed — we still have whatever phase 1 yielded
    }

    return readout;
  }

  /** Convert a hex-encoded manufacturer data string into bytes for broadcast parsing */
  function hexToBytes(hexStr: string): Uint8Array {
    const bytes: number[] = [];
    // Remove non-hex chars and split into 2-char pairs
    const clean = hexStr.replace(/[^0-9a-fA-F]/g, '');
    for (let i = 0; i + 1 < clean.length; i += 2) {
      bytes.push(parseInt(clean.substring(i, i + 2), 16));
    }
    return new Uint8Array(bytes);
  }

  /** Shared helper: roteia bytes através do parser da marca correta */
  function _processData(
    readout: ScaleReadout,
    data: Uint8Array,
    charUuid: string,
    isTanita: boolean,
    isXiaomi: boolean,
    isChipsea: boolean,
  ) {
    // Roteamento por fabricante detectado
    if (isTanita) {
      mergeReadouts(readout, parseTanitaPayload(data));
    } else if (isXiaomi) {
      mergeReadouts(readout, parseXiaomiPayload(data));
    } else if (isChipsea) {
      // Roteia para o parser correto baseado na caracteristica GATT que originou os dados
      const uuid = charUuid.toLowerCase();
      if (uuid.includes('2a9c') || uuid.includes('fff3')) {
        // Caracteristica GATT V20 (Body Composition ou BIA fragmentado) → usa parser V20 validado
        mergeReadouts(readout, parseChipseaV20GattPayload(data));
      } else if (uuid.includes('ffb3')) {
        // Caracteristica BIA V2 antiga → tenta parser compatível mas prefere V20
        mergeReadouts(readout, parseChipseaV20GattPayload(data));
      } else if (uuid.includes('ffb2') || uuid.includes('fff2')) {
        // Weight Char V2 → apenas peso / 100
        mergeReadouts(readout, parseChipseaV2WeightPayload(data));
      } else {
        // Fallback genérico Chipsea → tenta parser V1 classico
        mergeReadouts(readout, parseChipseaV1Payload(data));
      }
    } else {
      // HOGG path — so tenta padrao se tiver pelo menos 3 bytes
      if (data.length >= 3) {
        const hoggResult = parseWeightMeasurement(b64fromBuf(data));
        if (hoggResult != null) readout.weight = hoggResult;
      }
      // Generic fallback heuristico
      mergeReadouts(readout, parseGenericPayload(data));
    }
  }

  // Start scanning
  // Scan with ALL known service UUIDs + empty filter to catch everything
  const scanFilters = [...BUILTIN_SERVICES, ...Object.values(MANUFACTURER_SERVICES)];

  manager.startDeviceScan(
    null,                       // aceita QUALQUER anunciante
    null,
    async (error, device) => {
      if (stopRequested) return;
      if (error) return;           // erros de escaneo sao normais
      if (!device) return;

      onStatus(`🔍 Dispositivo encontrado: ${device.name || 'Desconhecido'} (ID: ${device.id.substring(0,8)}...)`);
      console.log('[BLE] Device:', { name: device.name, id: device.id, manufacturerData: device.manufacturerData });

      // Tenta parser de dados de broadcast (advertisement) via manufacturer_data
      // Balanças OKOK/Chipsea transmitem peso nos anúncios BLE sem precisar conectar
      if (device.manufacturerData && device.manufacturerData.length > 0) {
        const broadcastReadout = parseChipseaV20Payload(hexToBytes(device.manufacturerData));
        if (broadcastReadout.weight && broadcastReadout.weight > 0 && broadcastReadout.weight < 400) {
          // Peso válido recebido pelo broadcast — entrega e continua conectado para mais detalhes
          onWeight(broadcastReadout, device.name || 'Balança Bluetooth');
        }
      }

      // Para scanning apos primeiro match possivel
      manager?.stopDeviceScan();

      // Connect and probe
      onStatus(`Conectando...`);
      try {
        const connected: Device = await device.connect();
        await connected.discoverAllServicesAndCharacteristics();

        onStatus('Lendo métricas da balança…');

        const readout = await probeDevice(connected);

        // Verify we got at least weight
        if (readout.weight && readout.weight > 0 && readout.weight < 400) {
          onStatus('Métrica(s) recebida(s)! Desça da balança para ler novamente.');
          onWeight(readout, connected.name || 'Balança Bluetooth');
          await connected.cancelConnection();
          return;
        }

        // If no valid weight, still notify user
        if (Object.keys(readout).length > 0) {
          onStatus(`Dados parciais: ${Object.keys(readout).join(', ')}`);
          // Still deliver partial readout
          onWeight(readout, connected.name || 'Balança Bluetooth');
          await connected.cancelConnection();
        } else {
          onStatus('Nenhuma métrica válida encontrada. Tente outra balança.');
        }
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : 'Erro desconhecido';
        onStatus(`Falha ao conectar: ${msg}`);
        // Resume scanning after short delay
        setTimeout(() => {
          if (!stopRequested) {
            manager?.startDeviceScan(
              null,
              null,
              async (err, dev) => {
                if (stopRequested) return;
                if (err) return;
                if (!dev) return;
                // Continue old scan callback
                onStatus(`Novo dispositivo: ${dev.name || 'Desconhecido'}`);
                manager?.stopDeviceScan();
                // Probe again…
                try {
                  const c: Device = await dev.connect();
                  await c.discoverAllServicesAndCharacteristics();
                  const rd = await probeDevice(c);
                  if (rd.weight && rd.weight > 0 && rd.weight < 400) {
                    onStatus('Métrica(s) recebida(s)!');
                    onWeight(rd, c.name || 'Balança Bluetooth');
                    await c.cancelConnection();
                  }
                } catch {}
              },
            );
          }
        }, 2000);
      }
    },
  );

  // Return cleanup function
  return () => {
    stopRequested = true;
    manager?.stopDeviceScan();
  };
}

// ─── Convenience: convert raw readout to flat metric list ───────────────
export function readoutToMetrics(readout: ScaleReadout): ScaleMetric[] {
  const map: [keyof ScaleReadout, string, string][] = [
    ['weight', 'Peso', 'kg'],
    ['bodyFat', '% Gordura', '%'],
    ['resistance', 'Resistência', 'Ω'],
    ['reactance', 'Reactância', 'Ω'],
    ['phaseAngle', 'Ângulo de Fase', '°'],
    ['muscleMass', 'Massa Muscular', 'kg'],
    ['skeletalMuscle', 'M. Esquelético', 'kg'],
    ['waterPercent', '% Água', '%'],
    ['waterKg', 'Água', 'kg'],
    ['boneMass', 'Massa Óssea', 'kg'],
    ['proteinPercent', '% Proteína', '%'],
    ['proteinMass', 'Proteína', 'kg'],
    ['bmi', 'IMC', '' ],
    ['basalMetabolism', 'Metabolismo Basal', 'kcal/dia'],
    ['visceralFat', 'Gordura Visceral', 'grau'],
    ['age', 'Idade Estimada', 'anos'],
  ];
  return map
    .filter(([k]) => readout[k] != null)
    .map(([k, name, unit]) => ({ name, unit, value: readout[k] as number }));
}
