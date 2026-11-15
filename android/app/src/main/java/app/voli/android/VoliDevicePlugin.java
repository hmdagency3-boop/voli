package app.voli.android;

import android.app.ActivityManager;
import android.content.Context;
import android.media.MediaDrm;
import android.net.ConnectivityManager;
import android.net.Network;
import android.net.NetworkCapabilities;
import android.os.Build;
import android.telephony.TelephonyManager;
import android.util.DisplayMetrics;

import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import java.io.File;
import java.security.MessageDigest;
import java.util.Locale;
import java.util.TimeZone;
import java.util.UUID;

/**
 * Real phone details the web view cannot see: build/board/hardware, Widevine device ID (hashed),
 * screen, memory, mobile carrier, VPN, and emulator / root hints. Nothing here needs a runtime permission.
 */
@CapacitorPlugin(name = "VoliDevice")
public class VoliDevicePlugin extends Plugin {

    private static final String[] SU_PATHS = {
        "/system/app/Superuser.apk", "/sbin/su", "/system/bin/su", "/system/xbin/su",
        "/data/local/xbin/su", "/data/local/bin/su", "/system/sd/xbin/su", "/su/bin/su", "/magisk/.core/bin/su"
    };

    @PluginMethod
    public void getHardware(PluginCall call) {
        JSObject o = new JSObject();
        Context ctx = getContext();

        put(o, "brand", Build.BRAND);
        put(o, "manufacturer", Build.MANUFACTURER);
        put(o, "model", Build.MODEL);
        put(o, "device", Build.DEVICE);
        put(o, "product", Build.PRODUCT);
        put(o, "board", Build.BOARD);
        put(o, "hardware", Build.HARDWARE);
        put(o, "buildFingerprint", Build.FINGERPRINT);
        put(o, "buildTags", Build.TAGS);
        put(o, "bootloader", Build.BOOTLOADER);
        put(o, "sdk", String.valueOf(Build.VERSION.SDK_INT));
        put(o, "release", Build.VERSION.RELEASE);
        put(o, "incremental", Build.VERSION.INCREMENTAL);
        if (Build.VERSION.SDK_INT >= 23) put(o, "securityPatch", Build.VERSION.SECURITY_PATCH);
        if (Build.VERSION.SDK_INT >= 31) {
            put(o, "socManufacturer", Build.SOC_MANUFACTURER);
            put(o, "socModel", Build.SOC_MODEL);
        }
        JSArray abis = new JSArray();
        for (String abi : Build.SUPPORTED_ABIS) abis.put(abi);
        o.put("abis", abis);
        o.put("cpuCores", Runtime.getRuntime().availableProcessors());

        try {
            DisplayMetrics dm = ctx.getResources().getDisplayMetrics();
            o.put("screenWidth", dm.widthPixels);
            o.put("screenHeight", dm.heightPixels);
            o.put("density", dm.density);
            o.put("densityDpi", dm.densityDpi);
        } catch (Exception ignored) { }

        try {
            ActivityManager am = (ActivityManager) ctx.getSystemService(Context.ACTIVITY_SERVICE);
            ActivityManager.MemoryInfo mi = new ActivityManager.MemoryInfo();
            am.getMemoryInfo(mi);
            o.put("totalMemoryMb", mi.totalMem / (1024 * 1024));
        } catch (Exception ignored) { }

        try {
            TelephonyManager tm = (TelephonyManager) ctx.getSystemService(Context.TELEPHONY_SERVICE);
            put(o, "carrier", tm.getNetworkOperatorName());
            put(o, "simOperator", tm.getSimOperatorName());
            put(o, "simCountry", tm.getSimCountryIso());
            put(o, "networkCountry", tm.getNetworkCountryIso());
            put(o, "mccMnc", tm.getNetworkOperator());
        } catch (Exception ignored) { }

        try {
            ConnectivityManager cm = (ConnectivityManager) ctx.getSystemService(Context.CONNECTIVITY_SERVICE);
            boolean vpn = false;
            Network[] nets = cm.getAllNetworks();
            for (Network n : nets) {
                NetworkCapabilities caps = cm.getNetworkCapabilities(n);
                if (caps != null && caps.hasTransport(NetworkCapabilities.TRANSPORT_VPN)) vpn = true;
            }
            o.put("vpn", vpn);
        } catch (Exception ignored) { }

        put(o, "timezone", TimeZone.getDefault().getID());
        put(o, "locale", Locale.getDefault().toLanguageTag());
        o.put("emulator", looksLikeEmulator());
        o.put("rooted", looksRooted());
        put(o, "widevineId", widevineHash());

        call.resolve(o);
    }

    private static void put(JSObject o, String key, String value) {
        if (value != null && !value.isEmpty()) o.put(key, value);
    }

    private static boolean looksLikeEmulator() {
        String f = String.valueOf(Build.FINGERPRINT).toLowerCase(Locale.ROOT);
        String h = String.valueOf(Build.HARDWARE).toLowerCase(Locale.ROOT);
        String p = String.valueOf(Build.PRODUCT).toLowerCase(Locale.ROOT);
        String m = String.valueOf(Build.MODEL).toLowerCase(Locale.ROOT);
        return f.startsWith("generic") || f.contains("emulator") || f.contains("vbox")
            || h.contains("goldfish") || h.contains("ranchu")
            || p.contains("sdk_gphone") || p.contains("emulator") || m.contains("emulator") || m.contains("android sdk built for");
    }

    private static boolean looksRooted() {
        String tags = Build.TAGS;
        if (tags != null && tags.contains("test-keys")) return true;
        for (String path : SU_PATHS) {
            try {
                if (new File(path).exists()) return true;
            } catch (Exception ignored) { }
        }
        return false;
    }

    /** Widevine device ID survives reinstalling the app (it resets with a factory reset); only its hash leaves the phone. */
    private static String widevineHash() {
        MediaDrm drm = null;
        try {
            UUID widevine = new UUID(0xedef8ba979d64aceL, 0xa3c827dcd51d21edL);
            drm = new MediaDrm(widevine);
            byte[] id = drm.getPropertyByteArray(MediaDrm.PROPERTY_DEVICE_UNIQUE_ID);
            byte[] hash = MessageDigest.getInstance("SHA-256").digest(id);
            StringBuilder sb = new StringBuilder();
            for (byte b : hash) sb.append(String.format("%02x", b));
            return sb.toString();
        } catch (Exception e) {
            return null;
        } finally {
            if (drm != null) {
                try {
                    if (Build.VERSION.SDK_INT >= 28) drm.close();
                    else drm.release();
                } catch (Exception ignored) { }
            }
        }
    }
}
