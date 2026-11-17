import { supabase } from '@/lib/supabase';
import { isMissingFunction } from '@/lib/admin';

/** Lucky (حظ) and Crazy (مجنون) gifts. Every call goes to a role-checked function in sql/026_lucky_gifts.sql. */
export type LuckyKind = 'normal' | 'lucky' | 'crazy';
export const MULTIPLIERS = [2, 5, 10, 20, 50, 100, 500, 1000] as const;
export const LUCKY_KINDS: { value: LuckyKind; label: string; color: string }[] = [
  { value: 'normal', label: 'عادية', color: 'default' },
  { value: 'lucky', label: 'حظ', color: 'gold' },
  { value: 'crazy', label: 'مجنون', color: 'magenta' },
];
export const DEFAULT_SPLIT = { mic: 9.2, pool: 75, platform: 15.8 };

/** Platform share is whatever is left after the mic owner and the pool, rounded to 2 decimals; null when over 100%. */
export function platformShare(mic: number, pool: number): number | null {
  const rest = Math.round((100 - mic - pool) * 100) / 100;
  return mic < 0 || pool < 0 || rest < 0 ? null : rest;
}

/** Pool fill against twice the safety floor; `ready` once the pool can afford big multipliers. */
export function poolFill(pool: number, floor: number): { percent: number; ready: boolean } {
  if (floor <= 0) return { percent: pool > 0 ? 100 : 0, ready: true };
  return { percent: Math.min(100, Math.round((pool / (floor * 2)) * 100)), ready: pool >= floor };
}

export type LuckyOverview = {
  total_spent: number; total_won: number; total_mic: number; net_profit: number; pools: number; spins: number; wins: number;
  mic_pct: number; pool_pct: number; platform_pct: number; safety_floor: number; big_from: number; banner_from: number; enabled: boolean;
};
export type LuckyGift = {
  key: string; name: string; price: number; art_url: string | null; active: boolean; kind: LuckyKind; multipliers: number[];
  pool: number; spent: number; won: number; spins: number;
};
export type LuckySpin = {
  id: number; sender: string; sender_name: string | null; receiver: string; receiver_name: string | null; gift_key: string;
  gift_name: string | null; kind: LuckyKind; spent: number; multiplier: number; won: number; created_at: string;
};

async function call<T>(fn: string, args: Record<string, unknown> = {}): Promise<T> {
  const { data, error } = await supabase.rpc(fn, args);
  if (error) {
    if (isMissingFunction(error, fn) || error.code === '42P01') throw Object.assign(new Error('lucky_missing'), { hint: 'lucky_missing', cause: error });
    throw error;
  }
  return data as T;
}
const num = <T extends object>(r: T, keys: (keyof T)[]): T => {
  const o = { ...r };
  for (const k of keys) (o as Record<string, unknown>)[k as string] = Number(r[k] ?? 0);
  return o;
};

export async function getLuckyOverview(): Promise<LuckyOverview> {
  const rows = await call<LuckyOverview[]>('admin_lucky_overview');
  const row = rows?.[0];
  if (!row) throw Object.assign(new Error('lucky_missing'), { hint: 'lucky_missing' });
  return num(row, ['total_spent', 'total_won', 'total_mic', 'net_profit', 'pools', 'spins', 'wins', 'mic_pct', 'pool_pct',
    'platform_pct', 'safety_floor', 'big_from', 'banner_from']);
}
export async function getLuckyGifts(): Promise<LuckyGift[]> {
  const rows = await call<LuckyGift[]>('admin_lucky_gifts');
  return (rows ?? []).map((r) => ({ ...num(r, ['price', 'pool', 'spent', 'won', 'spins']), multipliers: (r.multipliers ?? []).map(Number) }));
}
export async function getLuckySpins(winsOnly = true, limit = 100): Promise<LuckySpin[]> {
  const rows = await call<LuckySpin[]>('admin_lucky_spins', { p_limit: limit, p_wins_only: winsOnly });
  return (rows ?? []).map((r) => num(r, ['id', 'spent', 'multiplier', 'won']));
}
export const saveLuckySettings = (v: { mic: number; pool: number; safety_floor: number; big_from: number; banner_from: number; enabled: boolean }) =>
  call<void>('admin_lucky_settings_set', {
    p_mic: v.mic, p_pool: v.pool, p_safety_floor: v.safety_floor, p_big_from: v.big_from, p_banner_from: v.banner_from, p_enabled: v.enabled,
  });
export const setLuckyGift = (key: string, kind: LuckyKind, multipliers: number[]) =>
  call<void>('admin_lucky_gift_set', { p_key: key, p_kind: kind, p_multipliers: [...multipliers].sort((a, b) => a - b) });
