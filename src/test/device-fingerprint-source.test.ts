import { describe, expect, it } from 'vitest';
import { deviceDetails, fingerprintSource } from '@/lib/device-fingerprint';
import type { NativeDevice } from '@/lib/native-device';

const phone = (over: Partial<NativeDevice['hardware']> = {}, info: Partial<NativeDevice['info']> = {}): NativeDevice => ({
  androidId: 'a1b2c3', info: { model: 'SM-A546B', manufacturer: 'samsung', osVersion: '14', ...info },
  battery: { batteryLevel: 0.5 }, language: 'ar-EG', network: { connected: true, connectionType: 'wifi' }, appVersion: '1.0 (5)',
  hardware: { widevineId: 'wv', board: 's5e8835', hardware: 'exynos', screenWidth: 1080, screenHeight: 2340, totalMemoryMb: 7680, cpuCores: 8, ...over },
});

describe('phone fingerprint', () => {
  it('stays the same when the OS updates, the battery drains, the network or the screen rotation changes', () => {
    const a = fingerprintSource(phone());
    const b = fingerprintSource({ ...phone({ screenWidth: 2340, screenHeight: 1080, release: '15', vpn: true }, { osVersion: '15' }), battery: { batteryLevel: 0.1 }, network: { connected: true, connectionType: 'cellular' } });
    expect(b).toBe(a);
  });
  it('differs for another phone of the same model', () => {
    expect(fingerprintSource(phone({ widevineId: 'other' }))).not.toBe(fingerprintSource(phone()));
  });
  it('is recorded as coming from the app, never from a browser', () => {
    const d = deviceDetails(phone(), { fingerprint: 'f', gpu: '' });
    expect(d.source).toBe('app');
    expect(d).not.toHaveProperty('browser');
    expect(d.android_id).toBe('a1b2c3');
  });
});
