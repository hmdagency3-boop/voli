import { describe, it, expect, vi, beforeEach } from 'vitest';

const selects: string[] = [];
let hasSvga = true;
const row = { id: 'a', kind: 'frame', style: 'simple', name: 'Ghost', price: 10, days: 7, art_url: 'https://x/a.png', video_url: null };

vi.mock('@/lib/supabase', () => {
  const query = (cols: string) => {
    const result = () => (!hasSvga && cols.includes('svga_url')
      ? { data: null, error: { code: '42703', message: 'column store_items.svga_url does not exist' } }
      : { data: [hasSvga ? { ...row, svga_url: 'https://x/a.svga' } : row], error: null });
    const chain: Record<string, unknown> = {};
    for (const m of ['eq', 'order', 'in', 'gt']) chain[m] = () => chain;
    chain['then'] = (ok: (v: unknown) => unknown, bad: (e: unknown) => unknown) => Promise.resolve(result()).then(ok, bad);
    return chain;
  };
  return { supabase: { from: () => ({ select: (cols: string) => { selects.push(cols); return query(cols); } }) } };
});

beforeEach(() => { selects.length = 0; vi.resetModules(); });

describe('store SVGA animations', () => {
  it('items carry their svga_url when the database has it', async () => {
    hasSvga = true;
    const { getStoreItems } = await import('@/lib/store');
    expect((await getStoreItems())[0]!.svga_url).toBe('https://x/a.svga');
  });

  it('before the svga_url column exists, the store still loads with no animation', async () => {
    hasSvga = false;
    const { getStoreItems } = await import('@/lib/store');
    const items = await getStoreItems();
    expect(items[0]!.svga_url).toBeNull();
    expect(items[0]!.art_url).toBe('https://x/a.png');
    await getStoreItems();
    expect(selects.filter((s) => s.includes('svga_url'))).toHaveLength(1); // asked once, then remembered
  });
});
