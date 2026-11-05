import silver from '@/assets/special-id/silver.webp';
import gold from '@/assets/special-id/gold.webp';
import purple from '@/assets/special-id/purple.webp';
import red from '@/assets/special-id/red.webp';

export type SpecialIdFrame = { name: 'silver' | 'gold' | 'purple' | 'red'; url: string };

const frames: Record<SpecialIdFrame['name'], SpecialIdFrame> = {
  silver: { name: 'silver', url: silver },
  gold: { name: 'gold', url: gold },
  purple: { name: 'purple', url: purple },
  red: { name: 'red', url: red },
};

/** Lowest VIP level allowed to get a special ID by itself (the admin can grant one at any level). */
export const SPECIAL_ID_MIN_VIP = 10;

/**
 * Frame for a special ID by VIP level: 10–29 silver, 30–49 gold, 50–79 purple, 80–100 red.
 * An admin-granted special ID below VIP 10 uses the silver frame.
 */
export function specialIdFrame(vipLevel: number): SpecialIdFrame {
  if (vipLevel >= 80) return frames.red;
  if (vipLevel >= 50) return frames.purple;
  if (vipLevel >= 30) return frames.gold;
  return frames.silver;
}

/** The ID people see: the special ID when the user has one, otherwise the normal public ID. */
export function shownId(profile: { public_id: number; special_id?: string | null }): string {
  return profile.special_id ? profile.special_id : String(profile.public_id);
}
