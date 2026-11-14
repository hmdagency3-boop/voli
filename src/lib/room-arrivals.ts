/**
 * A member counts as newly arrived only after being absent from the room list for this long.
 * Presence is a heartbeat, so a slow phone or a background tab can drop out of the list for a
 * few polls; without this gap the same entrance would replay on top of itself.
 */
export const REANNOUNCE_GAP_MS = 5 * 60 * 1000;

/**
 * Longest gap between two of the viewer's own refreshes that still counts as watching the room.
 * A phone app sent to the background (or a stalled network) stops refreshing; after a longer gap
 * the viewer cannot tell who really just came in, so that refresh only remembers who is here
 * instead of replaying everyone's entrance back to back.
 */
export const WATCH_GAP_MS = 30 * 1000;

/**
 * Updates `lastPresent` (member id -> last time seen in the room) with the current list and
 * returns who should get a "came in" entrance now. The first call (`first`) only remembers
 * who is already here. The viewer never announces themselves here.
 */
export function freshArrivals(
  lastPresent: Map<string, number>,
  members: string[],
  me: string | undefined,
  now: number,
  first: boolean,
): string[] {
  const fresh: string[] = [];
  for (const id of new Set(members)) {
    const last = lastPresent.get(id);
    if (!first && id !== me && (last === undefined || now - last > REANNOUNCE_GAP_MS)) fresh.push(id);
    lastPresent.set(id, now);
  }
  return fresh;
}

/** What the viewer has seen of the room so far: who was present when, and when they last looked. */
export type ArrivalWatch = { seen: Map<string, number>; lastLook: number | null };

export const newArrivalWatch = (): ArrivalWatch => ({ seen: new Map(), lastLook: null });

/** One refresh of the room list: who just came in, never counting a refresh after the viewer stopped watching. */
export function watchArrivals(watch: ArrivalWatch, members: string[], me: string | undefined, now: number): string[] {
  const first = watch.lastLook === null || now - watch.lastLook > WATCH_GAP_MS;
  watch.lastLook = now;
  return freshArrivals(watch.seen, members, me, now, first);
}
