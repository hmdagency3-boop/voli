import { supabase } from '@/lib/supabase';
import rose from '@/assets/gifts/rose.webp';
import star from '@/assets/gifts/star.webp';
import bouquet from '@/assets/gifts/bouquet.webp';
import ring from '@/assets/gifts/ring.webp';
import wolf from '@/assets/gifts/wolf.webp';
import diamond from '@/assets/gifts/diamond.webp';
import lion from '@/assets/gifts/lion.webp';
import dragon from '@/assets/gifts/dragon.webp';

/** Gift pictures by catalog key (supabase/006_room_gifts.sql). A gift without a picture is not shown. */
export const GIFT_ART: Record<string, string> = { rose, star, bouquet, ring, wolf, diamond, lion, dragon };

export type Gift = { key: string; name: string; price: number; art: string };

/** Counts offered in the picker; the database accepts 1–9999. */
export const GIFT_QUANTITIES = [1, 10, 66, 99, 188, 520] as const;

/** Whole cost of one send: price x count x number of people. */
export const giftCost = (price: number, quantity: number, people: number) => price * quantity * people;

/** Active gifts with a picture, cheapest first. Prices come from the database. */
export async function getGiftCatalog(): Promise<Gift[]> {
  const { data, error } = await supabase.from('room_gift_catalog').select('key, name, price, sort').eq('active', true).order('sort');
  if (error) throw error;
  return ((data ?? []) as { key: string; name: string; price: number }[])
    .filter((g) => GIFT_ART[g.key])
    .map((g) => ({ key: g.key, name: g.name, price: Number(g.price), art: GIFT_ART[g.key]! }));
}

/** Sends one gift x count to every picked person. Returns the room's new total. */
export async function sendRoomGift(roomId: string, gift: string, quantity: number, to: string[]): Promise<number> {
  const { data, error } = await supabase.rpc('send_room_gift', { p_room: roomId, p_gift: gift, p_quantity: quantity, p_to: to });
  if (error) throw error;
  return Number(data ?? 0) || 0;
}

/** What each person received in this room, by auth ID. Missing update = nothing yet. */
export async function getGiftsReceived(roomId: string): Promise<Record<string, number>> {
  const { data, error } = await supabase.rpc('room_gifts_received', { p_room: roomId });
  if (error) return {};
  return Object.fromEntries(((data ?? []) as { auth_id: string; total: number }[]).map((r) => [r.auth_id, Number(r.total) || 0]));
}

export const giftErrorMessage = (hint: string | undefined) =>
  ({
    not_enough_coins: 'رصيدك من الكوينز مش كفاية',
    not_in_room: 'لازم تكون جوه الروم',
    recipient_left: 'في حد من اللي اخترتهم خرج من الروم',
    no_recipient: 'اختار مين هياخد الهدية',
    bad_gift: 'الهدية دي مش متاحة',
    bad_amount: 'العدد ده مش مسموح',
  })[hint ?? ''] ?? 'الهدية ماتبعتتش';
