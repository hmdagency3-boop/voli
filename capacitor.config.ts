import type { CapacitorConfig } from "@capacitor/cli";

// The Android app opens the hosted Voli site inside a native shell, because
// voice tickets and device checks run on the server and cannot ship inside the APK.
// CAP_SERVER_URL (set as a GitHub repository variable for the APK build) overrides
// the address; put the published site address there before releasing.
const serverUrl =
  process.env.CAP_SERVER_URL || "https://f4a4f8ff-9519-4c3f-a81d-2b3852474c21.lovableproject.com?forceHideBadge=true";

const config: CapacitorConfig = {
  appId: "app.voli.android",
  appName: "Voli",
  webDir: "capacitor-www",
  backgroundColor: "#1C1D1F",
  server: {
    url: serverUrl,
    cleartext: false,
    androidScheme: "https",
  },
  android: {
    allowMixedContent: false,
  },
};

export default config;
