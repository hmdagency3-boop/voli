import { supabase } from '@/lib/supabase';
import { getBrowserName, getDeviceDetails, getDeviceId, getGpu, getNetworkInfo, getPublicIp, sha256 } from '@/lib/device-info';
import { deviceDetails, fingerprintSource } from '@/lib/device-fingerprint';
import { getNativeDevice, nativeDeviceId } from '@/lib/native-device';
import type { DeviceBan } from '@/lib/device-check.functions';

type BanJson = { kind?: string; reason?: string | null; code?: number | null; until?: string | null } | null;

/**
 * Browser-only: records this member's device, network and IP. Inside the Android app the device is
 * identified by Android itself (Device.getId + hardware fingerprint), never by the web view/Chrome.
 * Returns the ban the database reports for this phone/network, or null. Never throws.
 */
export async function reportDevice(): Promise<DeviceBan | null> {
  try {
    const [native, ip] = await Promise.all([getNativeDevice(), getPublicIp()]);
    let args: Record<string, unknown>;
    let details: Record<string, unknown>;
    if (native) {
      const fingerprint = await sha256(fingerprintSource(native));
      details = deviceDetails(native, { fingerprint, gpu: getGpu() });
      args = {
        p_device_id: nativeDeviceId(native),
        p_brand: details['manufacturer'] ?? details['brand'] ?? 'Android',
        p_model: [details['model'], details['app_version'] ? `Voli app ${details['app_version']}` : 'Voli app'].filter(Boolean).join(' · '),
        p_os: ['Android', details['os_version']].filter(Boolean).join(' '),
        p_network: [details['network'], details['vpn'] ? 'VPN' : ''].filter(Boolean).join(' / '),
        p_carrier: details['carrier'] ?? '',
        p_client_ip: ip,
      };
    } else {
      const d = await getDeviceDetails();
      const { network, carrier } = getNetworkInfo();
      const browser = getBrowserName();
      details = {
        source: 'web', browser, gpu: getGpu() || undefined,
        screen: `${screen.width}x${screen.height}@${devicePixelRatio}`,
        cpu_cores: navigator.hardwareConcurrency || undefined,
        language: navigator.language, timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      };
      args = {
        p_device_id: getDeviceId(),
        p_brand: d.brand || d.platform,
        p_model: [d.model, browser].filter(Boolean).join(' · '),
        p_os: [d.platform, d.osVersion].filter(Boolean).join(' '),
        p_network: network,
        p_carrier: carrier,
        p_client_ip: ip,
      };
    }
    // 025_device_fingerprint.sql adds the hardware details and IP history; older databases get the basic report.
    let res = await supabase.rpc('voli_report_device_v2' as never, { ...args, p_details: details } as never);
    if (res.error) res = await supabase.rpc('voli_report_device' as never, args as never);
    if (res.error) { console.warn('device report failed:', res.error.message); return null; }
    return toDeviceBan(res.data as BanJson);
  } catch { return null; /* never block the app */ }
}

export function toDeviceBan(b: BanJson): DeviceBan | null {
  if (!b || !b.kind) return null;
  return { kind: b.kind, until: b.until ?? null, reason: b.reason ?? null, ban_code: b.code ?? null };
}
