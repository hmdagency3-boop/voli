import { supabase } from "@/lib/supabase";
import { getDeviceDetails, type DeviceDetails } from "@/lib/device-info";

export type ReportedBan = {
  kind: string;
  value?: string;
  reason?: string | null;
  until?: string | null;
  code?: number | null;
  ban_code?: number | null;
};

/**
 * Reports the current device and network to Supabase (member_devices table).
 * Returns ban details if the member, device, IP, or network is banned.
 */
export async function reportMemberDevice(): Promise<ReportedBan | null> {
  try {
    const details: DeviceDetails = await getDeviceDetails();
    const { data, error } = await supabase.rpc("voli_report_device", {
      p_device_id: details.deviceId,
      p_brand: details.brand,
      p_model: details.model,
      p_os: details.os,
      p_network: details.network,
      p_carrier: details.carrier || null,
      p_client_ip: details.ip || null,
    });

    if (error) {
      // Fallback for original 6-parameter signature
      const fallback = await supabase.rpc("voli_report_device", {
        p_device_id: details.deviceId,
        p_brand: details.brand,
        p_model: details.model,
        p_os: details.os,
        p_network: details.network,
        p_carrier: details.carrier || null,
      });
      if (fallback.error) return null;
      return parseBanResult(fallback.data);
    }

    return parseBanResult(data);
  } catch {
    return null;
  }
}

function parseBanResult(data: any): ReportedBan | null {
  if (!data) return null;
  if (typeof data === "object" && (data.kind || data.banned || data.ban_code || data.code)) {
    return {
      kind: data.kind || "device",
      value: data.value,
      reason: data.reason ?? null,
      until: data.until ?? null,
      ban_code: data.ban_code ?? data.code ?? null,
    };
  }
  return null;
}
