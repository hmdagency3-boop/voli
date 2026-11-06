import vip1Badge from '@/assets/vip/vip-1-badge.webp';
import vip1Entrance from '@/assets/vip/vip-1-entrance.webp';
import vip1ChatBubble from '@/assets/vip/vip-1-chat-bubble.webp';
import { vipTier } from '@/lib/vip';

/**
 * Pictures the user sent for each VIP tier. A tier without its own badge keeps the drawn placeholder;
 * entrance bars are keyed like vip_tiers.entrance, so a tier shows a bar only once its picture exists.
 */
export type EntranceArt = {
  url: string;
  /** Empty plate where the member's name is written, in % of the picture. */
  name: { left: number; right: number; top: number; bottom: number };
};

const BADGES: Partial<Record<number, string>> = {
  1: vip1Badge,
};

const ENTRANCES: Record<string, EntranceArt> = {
  bronze_dragon_bar: { url: vip1Entrance, name: { left: 39, right: 23, top: 42, bottom: 25 } },
};

export function vipBadgeArt(level: number): string | null {
  return BADGES[level] ?? null;
}

export function vipEntranceArt(level: number): EntranceArt | null {
  const key = vipTier(level)?.entrance;
  return (key && ENTRANCES[key]) || null;
}

/** Stretchable room-chat bubble: picture + 9-slice cut lines (px of the picture) and shown border size (px). */
export type ChatBubbleArt = {
  url: string;
  slice: { top: number; right: number; bottom: number; left: number };
  border: { top: number; right: number; bottom: number; left: number };
};

const CHAT_BUBBLES: Partial<Record<number, ChatBubbleArt>> = {
  1: {
    url: vip1ChatBubble,
    slice: { top: 80, right: 57, bottom: 100, left: 180 },
    border: { top: 12, right: 9, bottom: 15, left: 27 },
  },
};

export function vipChatBubbleArt(level: number): ChatBubbleArt | null {
  return CHAT_BUBBLES[level] ?? null;
}
