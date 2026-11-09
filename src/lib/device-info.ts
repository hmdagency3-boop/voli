/**
 * Stable per-device ID stored in localStorage and robust device/network info parser.
 */
export function getDeviceId(): string {
  const key = "voli-device-id";
  try {
    let id = localStorage.getItem(key);
    if (!id) {
      id = crypto.randomUUID();
      localStorage.setItem(key, id);
    }
    return id;
  } catch {
    return "voli-" + Math.random().toString(36).substring(2, 15);
  }
}

export type DeviceDetails = {
  deviceId: string;
  brand: string;
  model: string;
  os: string;
  network: string;
  carrier: string;
  ip: string;
  platform: string;
  osVersion: string;
  connection: string;
};

function parseUserAgent(ua: string) {
  let brand = "";
  let model = "";
  let os = "";
  let osVersion = "";

  const androidMatch = ua.match(/Android\s([\d.]+)/i);
  const iosMatch = ua.match(/(iPhone|iPad|iPod).*?OS\s([\d_]+)/i);
  const winMatch = ua.match(/Windows NT ([\d.]+)/i);
  const macMatch = ua.match(/Mac OS X ([\d_]+)/i);
  const linuxMatch = ua.match(/Linux/i);

  if (androidMatch) {
    osVersion = androidMatch[1] ?? "";
    os = `Android ${osVersion}`.trim();
  } else if (iosMatch) {
    osVersion = (iosMatch[2] ?? "").replace(/_/g, ".");
    os = `iOS ${osVersion}`.trim();
  } else if (winMatch) {
    const ver = winMatch[1];
    osVersion = ver === "10.0" ? "10/11" : ver;
    os = `Windows ${osVersion}`;
  } else if (macMatch && !/iPhone|iPad/i.test(ua)) {
    osVersion = (macMatch[1] ?? "").replace(/_/g, ".");
    os = `macOS ${osVersion}`.trim();
  } else if (linuxMatch) {
    os = "Linux";
  }

  if (/iPhone/i.test(ua)) {
    brand = "Apple";
    model = "iPhone";
  } else if (/iPad/i.test(ua)) {
    brand = "Apple";
    model = "iPad";
  } else if (/Macintosh/i.test(ua)) {
    brand = "Apple";
    model = "Mac";
  } else if (androidMatch) {
    const modelSegmentMatch = ua.match(/Android\s[\d.]+;\s*([^;)]+?)(?:\sBuild|\))/i);
    const rawModel = modelSegmentMatch ? modelSegmentMatch[1].trim() : "";

    if (/SM-|SAMSUNG|Galaxy/i.test(ua) || /^SM-/i.test(rawModel)) {
      brand = "Samsung";
      model = rawModel.replace(/SAMSUNG\s*/i, "").trim() || "Galaxy";
    } else if (/Redmi/i.test(ua) || /Redmi/i.test(rawModel)) {
      brand = "Xiaomi";
      model = rawModel || "Redmi";
    } else if (/POCO/i.test(ua) || /POCO/i.test(rawModel)) {
      brand = "Xiaomi";
      model = rawModel || "POCO";
    } else if (/Xiaomi|Mi\s/i.test(ua)) {
      brand = "Xiaomi";
      model = rawModel || "Xiaomi";
    } else if (/HUAWEI|Honor/i.test(ua)) {
      brand = /Honor/i.test(ua) ? "Honor" : "Huawei";
      model = rawModel;
    } else if (/CPH|OPPO/i.test(ua)) {
      brand = "Oppo";
      model = rawModel;
    } else if (/vivo|V2\d{3}|V1\d{3}/i.test(ua)) {
      brand = "Vivo";
      model = rawModel;
    } else if (/OnePlus|GM19|KB20/i.test(ua)) {
      brand = "OnePlus";
      model = rawModel;
    } else if (/Realme|RMX/i.test(ua)) {
      brand = "Realme";
      model = rawModel;
    } else if (/Pixel/i.test(ua)) {
      brand = "Google";
      model = rawModel || "Pixel";
    } else if (/Infinix/i.test(ua)) {
      brand = "Infinix";
      model = rawModel;
    } else if (/TECNO/i.test(ua)) {
      brand = "Tecno";
      model = rawModel;
    } else {
      model = rawModel;
    }
  } else if (winMatch) {
    brand = "PC";
    model = "Windows PC";
  } else if (linuxMatch) {
    brand = "PC";
    model = "Linux PC";
  }

  return { brand, model, os, osVersion };
}

function parseConnection(): string {
  const nav = typeof navigator !== "undefined" ? (navigator as any) : null;
  const conn = nav?.connection;
  if (!conn) return "";
  if (conn.type) {
    if (conn.type === "wifi") return "WiFi";
    if (conn.type === "cellular") {
      return conn.effectiveType ? `${conn.effectiveType.toUpperCase()} / خلوي` : "خلوي";
    }
    if (conn.type === "ethernet") return "Ethernet";
    return conn.type;
  }
  if (conn.effectiveType) {
    return conn.effectiveType.toUpperCase();
  }
  return "";
}

let cachedNetworkInfo: { ip: string; carrier: string } | null = null;
let networkInfoPromise: Promise<{ ip: string; carrier: string }> | null = null;

async function fetchNetworkInfo(): Promise<{ ip: string; carrier: string }> {
  if (cachedNetworkInfo) return cachedNetworkInfo;
  if (networkInfoPromise) return networkInfoPromise;

  networkInfoPromise = (async () => {
    try {
      const ctrl = new AbortController();
      const t = setTimeout(() => ctrl.abort(), 2500);
      const res = await fetch("https://ipwho.is/", { signal: ctrl.signal });
      clearTimeout(t);
      if (res.ok) {
        const data = await res.json();
        if (data.success && data.ip) {
          const ip = String(data.ip).trim();
          const carrier = String(data.connection?.isp || data.connection?.org || "").trim();
          cachedNetworkInfo = { ip, carrier };
          return cachedNetworkInfo;
        }
      }
    } catch { /* fallback */ }

    try {
      const ctrl = new AbortController();
      const t = setTimeout(() => ctrl.abort(), 2000);
      const res = await fetch("https://cloudflare.com/cdn-cgi/trace", { signal: ctrl.signal });
      clearTimeout(t);
      if (res.ok) {
        const text = await res.text();
        const lines = text.split("\n");
        let ip = "";
        for (const line of lines) {
          if (line.startsWith("ip=")) {
            ip = line.substring(3).trim();
            break;
          }
        }
        if (ip) {
          cachedNetworkInfo = { ip, carrier: "" };
          return cachedNetworkInfo;
        }
      }
    } catch { /* fallback */ }

    try {
      const ctrl = new AbortController();
      const t = setTimeout(() => ctrl.abort(), 2000);
      const res = await fetch("https://api.ipify.org?format=json", { signal: ctrl.signal });
      clearTimeout(t);
      if (res.ok) {
        const data = await res.json();
        if (data.ip) {
          cachedNetworkInfo = { ip: String(data.ip).trim(), carrier: "" };
          return cachedNetworkInfo;
        }
      }
    } catch { /* fallback */ }

    return { ip: "", carrier: "" };
  })();

  return networkInfoPromise;
}

export async function getDeviceDetails(): Promise<DeviceDetails> {
  const deviceId = getDeviceId();
  const ua = typeof navigator !== "undefined" ? navigator.userAgent : "";
  const { brand, model, os, osVersion } = parseUserAgent(ua);
  const conn = parseConnection();

  let finalModel = model;
  let finalBrand = brand;
  const nav = typeof navigator !== "undefined" ? (navigator as any) : null;
  if (nav?.userAgentData?.getHighEntropyValues) {
    try {
      const hi = await nav.userAgentData.getHighEntropyValues(["model", "brands"]);
      if (hi.model) finalModel = hi.model;
      if (!finalBrand && hi.brands?.length) {
        const b = hi.brands.find((x: any) => !/brand|not/i.test(x.brand));
        if (b) finalBrand = b.brand;
      }
    } catch { /* ignore */ }
  }

  const net = await fetchNetworkInfo();
  const network = conn || (net.carrier ? "متصل" : "");
  const carrier = net.carrier;
  const ip = net.ip;

  return {
    deviceId,
    brand: finalBrand || "Unknown",
    model: finalModel || "Unknown Device",
    os: os || "Unknown OS",
    network: network || "WiFi/Cellular",
    carrier: carrier || "",
    ip: ip || "",
    platform: os || "",
    osVersion: osVersion || "",
    connection: conn || "",
  };
}
