import { useSyncExternalStore } from 'react';

/**
 * The room the member is in, kept alive across pages ("احتفاظ بالروم"). The room itself is
 * rendered once in the root layout from this state, so leaving its page only minimizes it:
 * voice, the mic seat and the presence heartbeat keep running until closeRoom().
 */
export type KeptInfo = { publicId: string; inside: boolean; name: string; picture: string | null; speaking: boolean };
type State = { publicId: string | null; info: KeptInfo | null };

let state: State = { publicId: null, info: null };
const listeners = new Set<() => void>();
const set = (next: State) => { state = next; listeners.forEach((l) => l()); };
const subscribe = (l: () => void) => { listeners.add(l); return () => { listeners.delete(l); }; };
const EMPTY: State = { publicId: null, info: null };

/** Opening a room's page keeps that room (another kept room is left). */
export function openRoom(publicId: string) {
  if (state.publicId !== publicId) set({ publicId, info: null });
}

/** Leave the kept room for good. */
export function closeRoom() {
  if (state.publicId) set(EMPTY);
}

export function setKeptInfo(info: KeptInfo) {
  if (info.publicId !== state.publicId) return;
  const o = state.info;
  if (o && o.inside === info.inside && o.name === info.name && o.picture === info.picture && o.speaking === info.speaking) return;
  set({ ...state, info });
}

export function useKeptRoom(): State {
  return useSyncExternalStore(subscribe, () => state, () => EMPTY);
}

/** The address of a room's page, used to tell whether the kept room is on screen. */
export const roomPath = (publicId: string) => `/room/${publicId}`;

/** Whether the kept room should be shown full screen for this address. */
export function isRoomOnScreen(pathname: string, publicId: string | null) {
  return !!publicId && pathname.replace(/\/+$/, '') === roomPath(publicId);
}
