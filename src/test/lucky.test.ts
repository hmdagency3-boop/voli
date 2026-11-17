import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { DEFAULT_SPLIT, platformShare, poolFill } from '@/lib/lucky';

const sql = readFileSync('sql/026_lucky_gifts.sql', 'utf8');

describe('lucky gifts split', () => {
  it('defaults are 9.2% mic, 75% pool, 15.8% platform', () => {
    expect(DEFAULT_SPLIT).toEqual({ mic: 9.2, pool: 75, platform: 15.8 });
    expect(platformShare(9.2, 75)).toBe(15.8);
    expect(sql).toMatch(/mic_pct numeric\(5,2\) not null default 9\.2/);
    expect(sql).toMatch(/pool_pct numeric\(5,2\) not null default 75/);
    expect(sql).toMatch(/platform_pct numeric\(5,2\) not null default 15\.8/);
  });
  it('rejects a split above 100%', () => expect(platformShare(30, 75)).toBeNull());
  it('pool is ready for big multipliers only at or above the safety floor', () => {
    expect(poolFill(999, 1000).ready).toBe(false);
    expect(poolFill(1000, 1000)).toEqual({ percent: 50, ready: true });
  });
  it('every panel function checks the admin role', () => {
    for (const fn of ['admin_lucky_overview', 'admin_lucky_settings_set', 'admin_lucky_gifts', 'admin_lucky_gift_set', 'admin_lucky_spins']) {
      const body = (sql.split(`function public.${fn}(`)[1] ?? '').split('$$;')[0];
      expect(body).toContain('admin_guard()');
    }
  });
});
