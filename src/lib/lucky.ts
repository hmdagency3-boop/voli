import { supabase } from '@/lib/supabase';
import type { GiftKind } from '@/lib/gifts';

/**
 * Lucky / crazy gifts (supabase/026_lucky_gifts.sql). The draw, the money split and the pool's safety valve all
 * happen in the database; these multipliers mirror lucky_settings for the badges only and must change with the SQL.
 */
export const LUCKY_MULTIPLIERS: Record<Exclude<GiftKind, 'normal'>, readonly number[]> = {
  lucky: [2, 5, 10, 20, 50],
  crazy: [2, 10, 100, 500, 1000],
};
export const maxMultiplier = (kind: GiftKind) => (kind === 'normal' ? 0 : Math.max(...LUCKY_MULTIPLIERS[kind]));
export const isLuckyKind = (kind: GiftKind) => kind !== 'normal';

export type LuckyResult = { spin: number; multiplier: number; prize: number; coins: number; total: number; announce: boolean };

export async function sendLuckyGift(roomId: string, gift: string, quantity: number, to: string[]): Promise<LuckyResult> {
  const { data, error } = await supabase.rpc('send_room_lucky_gift', { p_room: roomId, p_gift: gift, p_quantity: quantity, p_to: to });
  if (error) throw error;
  const r = (data ?? {}) as Partial<Record<'spin' | 'multiplier' | 'prize' | 'coins' | 'total' | 'announce', unknown>>;
  return { spin: Number(r.spin) || 0, multiplier: Number(r.multiplier) || 0, prize: Number(r.prize) || 0,
    coins: Number(r.coins) || 0, total: Number(r.total) || 0, announce: r.announce === true };
}

/** Taps closer than this keep the combo going. */
export const COMBO_WINDOW_MS = 3000;
/** Next combo count: +1 inside the window, otherwise a fresh x1. */
export const nextCombo = (count: number, lastTap: number, now: number) => (count > 0 && now - lastTap <= COMBO_WINDOW_MS ? count + 1 : 1);

export type BigWin = { id: number; sender_name: string; gift_name: string; multiplier: number; prize: number; room_name: string };

/** Newest spin id, used as the starting point so wins from before you opened the app never fly. */
export async function latestSpin(): Promise<number | null> {
  const { data, error } = await supabase.rpc('lucky_latest_spin');
  return error ? null : Number(data ?? 0);
}
export async function bigWinsSince(after: number): Promise<BigWin[]> {
  const { data, error } = await supabase.rpc('lucky_big_wins_since', { p_after: after });
  if (error) return [];
  return ((data ?? []) as BigWin[]).map((w) => ({ ...w, id: Number(w.id), multiplier: Number(w.multiplier), prize: Number(w.prize) }));
}

/** Short cheerful beep chord for a win; louder and longer for bigger multipliers. Silent where audio is blocked. */
export function playWinSound(multiplier: number) {
  try {
    const Ctx = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctx) return;
    const ctx = new Ctx();
    const notes = multiplier >= 100 ? [523, 659, 784, 1047, 1319] : multiplier >= 10 ? [523, 659, 784, 1047] : [659, 880];
    notes.forEach((f, i) => {
      const o = ctx.createOscillator(); const g = ctx.createGain();
      o.type = 'triangle'; o.frequency.value = f;
      const t = ctx.currentTime + i * 0.09;
      g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.25, t + 0.02); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.3);
      o.connect(g).connect(ctx.destination); o.start(t); o.stop(t + 0.32);
    });
    setTimeout(() => void ctx.close(), notes.length * 90 + 500);
  } catch { /* no sound */ }
}
