/**
 * Remembers, for the whole app session, which entrances and gift videos already played, so the
 * same person's entrance can never play twice in a row in a room and a gift video plays once.
 * It lives outside the room page on purpose: a room page that reloads, reconnects or comes back
 * from the background starts with fresh state, and that fresh state used to replay everything.
 */

/** The same member's entrance plays at most once in this window per room (a real re-entry later still plays). */
export const ENTRANCE_REPEAT_MS = 3 * 60 * 1000;

export type Ledger = { entrances: Map<string, number>; shows: Set<string> };
export const newLedger = (): Ledger => ({ entrances: new Map(), shows: new Set() });

const appLedger = newLedger();

/** True only the first time in ENTRANCE_REPEAT_MS for this member in this room; records the play. */
export function claimEntrance(roomId: string, authId: string, now = Date.now(), ledger: Ledger = appLedger): boolean {
  const key = `${roomId}:${authId}`;
  const last = ledger.entrances.get(key);
  if (last !== undefined && now - last < ENTRANCE_REPEAT_MS) return false;
  ledger.entrances.set(key, now);
  if (ledger.entrances.size > 500) {
    for (const [k, t] of ledger.entrances) if (now - t >= ENTRANCE_REPEAT_MS) ledger.entrances.delete(k);
  }
  return true;
}

/** True only the first time this gift video is seen in this room. */
export function claimGiftShow(roomId: string, showId: number | string, ledger: Ledger = appLedger): boolean {
  const key = `${roomId}:${showId}`;
  if (ledger.shows.has(key)) return false;
  ledger.shows.add(key);
  if (ledger.shows.size > 1000) ledger.shows.delete(ledger.shows.values().next().value as string);
  return true;
}
