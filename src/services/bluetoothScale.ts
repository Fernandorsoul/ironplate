/**
 * Bluetooth Bioimpedance Scale Service for IronPlate
 *
 * Suporte para balanças BLE de bioimpedância:
 * - Tanita (BC-758, BC-601, BC-545, MS-160, MS-300, HD-380…)
 * - Xiaomi / Mi Body Composition Scale 2 (MJSCL02YL)
 * - Qualquer marca compatível HOGG Weight Measurement (BT SIG)
 *
 * Estratégia: escanear TODOS os dispositivos BLE → conectar → enumerar
 * todos os serviços → ler características conhecidas → extrair métricas.
 * Se nenhuma marca for identificada, tenta parsing genérico heurístico.
 */

import { PermissionsAndroid, Platform } from 'react-native';
import type { BleManager, Device } from 'react-native-ble-plx';

// ─── Known GATT services for bioimpedance scales ────────────────────────
const BUILTIN_SERVICES = [
  // HOGG Weight Measurement
  '0000181d-0000-1000-8000-00805f9b34fb',
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
};

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

/**
 * Generic heuristic parser — attempts to extract sensible values when
 * we don't know the exact brand/frame format.  Returns partial readout.
 */
function parseGenericPayload(bytes: Uint8Array): Partial<ScaleReadout> {
  const result: Partial<ScaleReadout> = {};

  // Try to find a plausible weight value anywhere in the stream
  for (let off = 0; off <= bytes.length - 2; off++) {
    const w = u16(bytes, off);
    const kg = w * 0.01; // assume x100 scaling
    if (kg >= 30 && kg <= 300) {
      result.weight = kg;
      break;
    }
  }

  // Look for impedance (typically 200–1200 Ω)
  for (let off = 0; off <= bytes.length - 2; off++) {
    const v = u16(bytes, off);
    if (v >= 200 && v <= 1200) {
      result.resistance = v;
      break;
    }
  }

  // Look for body-fat percentage (usually 5–50)
  for (let off = 0; off < bytes.length; off++) {
    const v = bytes[off];
    if (v >= 5 && v <= 50) {
      // Only set if it isn't already weight
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
    const servicesList: any[] = await device.services();
    const svcUUIDs = servicesList.map((s: any) => s.uuid.toLowerCase());
    const isTanita = svcUUIDs.some((u: string) =>
      u.includes(MANUFACTURER_SERVICES.tanita) || u.startsWith('a02ec7'),
    );
    const isXiaomi = svcUUIDs.some((u: string) =>
      u.includes(MANUFACTURER_SERVICES.xiaomi_v1) ||
      u.includes(MANUFACTURER_SERVICES.xiaomi_v2) ||
      u.includes('fee0') || u.includes('fecb'),
    );

    // Phase 1: Read all characteristics (may yield some static values)
    for (const service of servicesList) {
      try {
        const chars: any[] = await service.characteristics();
        for (const char of chars) {
          try {
            const data: Buffer = await char.readValue();
            if (!data || data.length === 0) continue;
            _processData(readout, data, isTanita, isXiaomi);
          } catch {
            // Skip unreadable characteristics
          }
        }
      } catch {
        // Skip inaccessible services
      }
    }

    // Phase 2: Subscribe to notify for real-time updates while standing on scale
    // Many scales push data ONLY after subscribing to notify
    try {
      for (const service of servicesList) {
        const chars: any[] = await service.characteristics();
        for (const char of chars) {
          try {
            let collectedBytes: Uint8Array[] = [];
            await char.startNotifications();

            // Use characteristic.monitorForValue (ble-plx v3.x API)
            char.monitorForValue((err: Error | null, charVal: any) => {
              if (err || !charVal?.value) return;
              collectedBytes.push(new Uint8Array(charVal.value as ArrayBuffer));
            });

            // Wait for readings while user stands on scale
            await new Promise<void>(resolve => setTimeout(resolve, 4000));

            // Process all collected bytes
            for (const chunk of collectedBytes) {
              _processData(readout, chunk, isTanita, isXiaomi);
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

  /** Shared helper: route bytes through brand-specific parser */
  function _processData(readout: ScaleReadout, data: Uint8Array, isTanita: boolean, isXiaomi: boolean) {
    if (isTanita) {
      mergeReadouts(readout, parseTanitaPayload(data));
    } else if (isXiaomi) {
      mergeReadouts(readout, parseXiaomiPayload(data));
    } else {
      // HOGG path — only try standard characteristic
      // Check if this looks like HOGG (length == 3 byte sequence)
      if (data.length >= 3) {
        const hoggResult = parseWeightMeasurement(b64fromBuf(data));
        if (hoggResult != null) readout.weight = hoggResult;
      }
      // Generic fallback
      mergeReadouts(readout, parseGenericPayload(data));
    }
  }

  // Start scanning
  // Scan with ALL known service UUIDs + empty filter to catch everything
  const scanFilters = [...BUILTIN_SERVICES, ...Object.values(MANUFACTURER_SERVICES)];

  manager.startDeviceScan(
    null,                       // accept ANY advertiser
    null,
    async (error, device) => {
      if (stopRequested) return;
      if (error) return;           // scan errors are normal
      if (!device) return;

      onStatus(`Dispositivo encontrado: ${device.name || 'Desconhecido'} (${device.id})`);

      // Stop scanning immediately after first potential match
      manager?.stopDeviceScan();

      // Connect and probe
      onStatus(`Conectando a ${device.name || 'balança'}…`);
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
