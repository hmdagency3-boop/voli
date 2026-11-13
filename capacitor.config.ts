import type { CapacitorConfig } from "@capacitor/cli";

// The whole interface ships inside the APK (dist/native, built by `bun run build:native`)
// and runs from the phone on https://localhost, talking to the database directly.
// Only voice tickets and device checks go to the published site (VITE_SITE_URL).
const config: CapacitorConfig = {
  appId: "app.voli.android",
  appName: "Voli",
  webDir: "dist/native",
  backgroundColor: "#1C1D1F",
  server: {
    androidScheme: "https",
    hostname: "localhost",
  },
  android: {
    allowMixedContent: false,
  },
};

export default config;
