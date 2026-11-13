import { describe, expect, it } from 'vitest';
import { nativeCorsHeaders, serverFnUrl } from '@/lib/native-app';

describe('Android app with the interface inside the APK', () => {
  it('sends server features to the published site only inside the app', () => {
    expect(serverFnUrl('/_serverFn/abc', true, 'https://voli-bright-journey.lovable.app'))
      .toBe('https://voli-bright-journey.lovable.app/_serverFn/abc');
    expect(serverFnUrl('/_serverFn/abc', false, 'https://voli-bright-journey.lovable.app')).toBe('/_serverFn/abc');
  });

  it('lets only the app origin call the site cross-site', () => {
    const from = (origin: string) => new Request('https://voli-bright-journey.lovable.app/_serverFn/x', { headers: { Origin: origin } });
    expect(nativeCorsHeaders(from('https://localhost'))?.['Access-Control-Allow-Origin']).toBe('https://localhost');
    expect(nativeCorsHeaders(from('https://evil.example'))).toBeNull();
  });
});
