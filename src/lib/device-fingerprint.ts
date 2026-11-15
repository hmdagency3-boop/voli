import type { NativeDevice } from '@/lib/native-device';

/**
 * The text hashed into the phone's fingerprint inside the app. It uses only things that stay the
 * same for one phone: its Widevine and Android IDs plus fixed hardware (board, chip, screen, memory).
 * The OS build, battery, network and free space are left out because they change.
 */
export function fingerprintSource(d: NativeDevice): string {
  const h = d.hardware;
  return [
    h.widevineId ?? '', d.androidId,
    h.manufacturer ?? d.info.manufacturer ?? '', h.brand ?? '', h.model ?? d.info.model ?? '', h.device ?? '', h.board ?? '', h.hardware ?? '',
    h.socManufacturer ?? '', h.socModel ?? '', (h.abis ?? []).join(','), h.cpuCores ?? '',
    h.screenWidth && h.screenHeight ? `${Math.min(h.screenWidth, h.screenHeight)}x${Math.max(h.screenWidth, h.screenHeight)}` : '',
    h.densityDpi ?? '', h.totalMemoryMb ? Math.round(h.totalMemoryMb / 256) : '',
  ].join('|');
}

/** Everything saved with the device row for the management panel (kept small and flat). */
export function deviceDetails(d: NativeDevice, extra: { fingerprint: string; gpu: string }) {
  const h = d.hardware;
  return {
    source: 'app',
    fingerprint: extra.fingerprint || undefined,
    android_id: d.androidId,
    widevine_id: h.widevineId,
    manufacturer: h.manufacturer ?? d.info.manufacturer,
    brand: h.brand,
    model: h.model ?? d.info.model,
    device_name: d.info.name,
    device: h.device, product: h.product, board: h.board, hardware: h.hardware,
    soc: [h.socManufacturer, h.socModel].filter(Boolean).join(' ') || undefined,
    abis: h.abis?.join(', '),
    cpu_cores: h.cpuCores,
    memory_mb: h.totalMemoryMb,
    disk_total_mb: d.info.realDiskTotal ? Math.round(d.info.realDiskTotal / 1048576) : undefined,
    disk_free_mb: d.info.realDiskFree ? Math.round(d.info.realDiskFree / 1048576) : undefined,
    screen: h.screenWidth && h.screenHeight ? `${h.screenWidth}x${h.screenHeight}` : undefined,
    density_dpi: h.densityDpi,
    gpu: extra.gpu || undefined,
    os: d.info.operatingSystem, os_version: d.info.osVersion ?? h.release, sdk: d.info.androidSDKVersion ?? h.sdk,
    security_patch: h.securityPatch, build_fingerprint: h.buildFingerprint, bootloader: h.bootloader,
    webview: d.info.webViewVersion,
    app_version: d.appVersion || undefined,
    network: d.network?.connectionType, carrier: h.carrier || h.simOperator, sim_country: h.simCountry, network_country: h.networkCountry,
    mcc_mnc: h.mccMnc,
    vpn: h.vpn, emulator: Boolean(h.emulator || d.info.isVirtual), rooted: h.rooted,
    battery: d.battery?.batteryLevel != null ? Math.round(d.battery.batteryLevel * 100) : undefined,
    language: d.language || h.locale, timezone: h.timezone,
  };
}
