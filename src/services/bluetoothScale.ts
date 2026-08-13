import { PermissionsAndroid, Platform } from 'react-native';
import type { BleManager, Device, Subscription } from 'react-native-ble-plx';

const WEIGHT_SERVICE = '0000181d-0000-1000-8000-00805f9b34fb';
const WEIGHT_MEASUREMENT = '00002a9d-0000-1000-8000-00805f9b34fb';

let manager: BleManager | null = null;

function decodeBase64(value: string): number[] {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
  const clean = value.replace(/=+$/, '');
  const bytes: number[] = [];
  let buffer = 0;
  let bits = 0;
  for (const character of clean) {
    const index = alphabet.indexOf(character);
    if (index < 0) continue;
    buffer = (buffer << 6) | index;
    bits += 6;
    if (bits >= 8) {
      bits -= 8;
      bytes.push((buffer >> bits) & 0xff);
    }
  }
  return bytes;
}

export function parseWeightMeasurement(value: string): number | null {
  const bytes = decodeBase64(value);
  if (bytes.length < 3) return null;
  const isImperial = (bytes[0] & 0x01) !== 0;
  const raw = bytes[1] | (bytes[2] << 8);
  const kilograms = isImperial ? raw * 0.01 * 0.45359237 : raw * 0.005;
  return Number(kilograms.toFixed(2));
}

async function requestBluetoothPermission(): Promise<boolean> {
  if (Platform.OS !== 'android') return Platform.OS !== 'web';
  if (Number(Platform.Version) < 31) {
    return (await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION)) === PermissionsAndroid.RESULTS.GRANTED;
  }
  const result = await PermissionsAndroid.requestMultiple([
    PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN,
    PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,
  ]);
  return result[PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN] === PermissionsAndroid.RESULTS.GRANTED
    && result[PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT] === PermissionsAndroid.RESULTS.GRANTED;
}

export async function connectToWeightScale(
  onWeight: (weight: number, deviceName: string) => void,
  onStatus: (status: string) => void,
): Promise<() => void> {
  if (Platform.OS === 'web') throw new Error('Bluetooth de balança está disponível no app para Android e iOS.');
  if (!(await requestBluetoothPermission())) throw new Error('Permissão de Bluetooth não concedida.');

  const { BleManager } = await import('react-native-ble-plx');
  manager ??= new BleManager();
  let monitor: Subscription | null = null;
  let stopped = false;

  onStatus('Procurando balança...');
  manager.startDeviceScan([WEIGHT_SERVICE], null, async (error, device) => {
    if (stopped) return;
    if (error) {
      onStatus(error.message);
      return;
    }
    if (!device) return;
    manager?.stopDeviceScan();
    onStatus('Conectando a ' + (device.name || 'balança') + '...');
    try {
      const connected: Device = await device.connect();
      await connected.discoverAllServicesAndCharacteristics();
      onStatus('Conectada. Suba na balança.');
      monitor = connected.monitorCharacteristicForService(
        WEIGHT_SERVICE,
        WEIGHT_MEASUREMENT,
        (monitorError, characteristic) => {
          if (monitorError) {
            onStatus(monitorError.message);
            return;
          }
          if (!characteristic?.value) return;
          const weight = parseWeightMeasurement(characteristic.value);
          if (weight) onWeight(weight, connected.name || 'Balança Bluetooth');
        },
      );
    } catch (connectionError) {
      onStatus(connectionError instanceof Error ? connectionError.message : 'Não foi possível conectar à balança.');
    }
  });

  return () => {
    stopped = true;
    manager?.stopDeviceScan();
    monitor?.remove();
  };
}
