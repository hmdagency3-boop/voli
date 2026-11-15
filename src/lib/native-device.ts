import { NATIVE_APP } from '@/lib/native-app';

/** What the Android app's own VoliDevice plugin (android/.../VoliDevicePlugin.java) reports. */
export type NativeHardware = {
  brand?: string; manufacturer?: string; model?: string; device?: string; product?: string; board?: string; hardware?: string;
  buildFingerprint?: string; buildTags?: string; bootloader?: string; sdk?: string; release?: string; incremental?: string;
  securityPatch?: string; socManufacturer?: string; socModel?: string; abis?: string[]; cpuCores?: number;
  screenWidth?: number; screenHeight?: number; density?: number; densityDpi?: number; totalMemoryMb?: number;
  carrier?: string; simOperator?: string; simCountry?: string; networkCountry?: string; mccMnc?: string;
  vpn?: boolean; timezone?: string; locale?: string; emulator?: boolean; rooted?: boolean; widevineId?: string;
};

/** Everything the phone itself says about this device, read through Capacitor (no browser involved). */
export type NativeDevice = {
  /** Device.getId(): Android's ID for this app on this phone; survives reinstalling and clearing data. */
  androidId: string;
  info: {
    name?: string; model?: string; manufacturer?: string; platform?: string; operatingSystem?: string; osVersion?: string;
    androidSDKVersion?: number; webViewVersion?: string; isVirtual?: boolean; memUsed?: number;
    diskFree?: number; diskTotal?: number; realDiskFree?: number; realDiskTotal?: number;
  };
  battery: { batteryLevel?: number; isCharging?: boolean } | null;
  language: string;
  network: { connected: boolean; connectionType: string } | null;
  hardware: NativeHardware;
  appVersion: string;
};

let cached: Promise<NativeDevice | null> | null = null;

const safe = async <T,>(run: () => Promise<T>): Promise<T | null> => { try { return await run(); } catch { return null; } };

/** The phone's own details inside the Android app; null on the website. Never throws. */
export function getNativeDevice(): Promise<NativeDevice | null> {
  if (!NATIVE_APP) return Promise.resolve(null);
  cached ??= (async () => {
    try {
      const [{ Device }, { Network }, { App }, { registerPlugin }] = await Promise.all([
        import('@capacitor/device'), import('@capacitor/network'), import('@capacitor/app'), import('@capacitor/core'),
      ]);
      const VoliDevice = registerPlugin<{ getHardware(): Promise<NativeHardware> }>('VoliDevice');
      const [id, info, battery, lang, net, hw, app] = await Promise.all([
        safe(() => Device.getId()), safe(() => Device.getInfo()), safe(() => Device.getBatteryInfo()),
        safe(() => Device.getLanguageTag()), safe(() => Network.getStatus()), safe(() => VoliDevice.getHardware()),
        safe(() => App.getInfo()),
      ]);
      if (!id?.identifier) { cached = null; return null; }
      return {
        androidId: id.identifier,
        info: info ?? {},
        battery: battery ?? null,
        language: lang?.value ?? '',
        network: net ? { connected: net.connected, connectionType: net.connectionType } : null,
        hardware: hw ?? {},
        appVersion: app ? `${app.version} (${app.build})` : '',
      };
    } catch {
      cached = null;
      return null;
    }
  })();
  return cached;
}

/** Device ID used for check-ins and bans inside the app: Android's own ID, never a browser value. */
export const nativeDeviceId = (d: NativeDevice) => `android:${d.androidId}`;
