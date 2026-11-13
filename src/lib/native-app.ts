/**
 * The Android app ships this same interface inside the APK (built with VITE_NATIVE_APP=1).
 * It talks to the database directly; only the few features that need a secret on a server
 * (voice tickets, device checks) are sent to the published site.
 */
export const NATIVE_APP = import.meta.env['VITE_NATIVE_APP'] === '1';

/** Published site address, used for server features and for links shared from the app. */
export const SITE_ORIGIN = String(import.meta.env['VITE_SITE_URL'] || 'https://voli-bright-journey.lovable.app')
  .replace(/[?#].*$/, '')
  .replace(/\/+$/, '');

/** Origins the APK's web view runs on; the server lets only these call its features cross-site. */
export const NATIVE_APP_ORIGINS = ['https://localhost', 'capacitor://localhost'];

/** Where links that leave the app (share, email confirmation) should point. */
export function publicOrigin() {
  return NATIVE_APP ? SITE_ORIGIN : window.location.origin;
}

/** Inside the APK, relative server-feature addresses go to the published site. */
export function serverFnUrl(url: string, native = NATIVE_APP, origin = SITE_ORIGIN) {
  return native && url.startsWith('/') ? `${origin}${url}` : url;
}

/** Cross-site headers for a request coming from the APK, or null for anyone else. */
export function nativeCorsHeaders(request: Request): Record<string, string> | null {
  const origin = request.headers.get('Origin');
  if (!origin || !NATIVE_APP_ORIGINS.includes(origin)) return null;
  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': request.headers.get('Access-Control-Request-Headers') || 'content-type, authorization',
    'Access-Control-Max-Age': '600',
    Vary: 'Origin',
  };
}
