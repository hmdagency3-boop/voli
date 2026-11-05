import { describe, expect, it } from 'vitest';
import { isPublicPath } from '@/components/AuthGate';

describe('sign-in required', () => {
  it('only login and signup are open without an account', () => {
    expect(isPublicPath('/login')).toBe(true);
    expect(isPublicPath('/signup')).toBe(true);
    expect(isPublicPath('/')).toBe(false);
    expect(isPublicPath('/me')).toBe(false);
    expect(isPublicPath('/chat')).toBe(false);
  });
});
