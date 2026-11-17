// @vitest-environment node
import { readFileSync } from 'node:fs';
import type { PGlite } from '@electric-sql/pglite';
import { beforeAll, afterAll, describe, it, expect } from 'vitest';
import { supabaseLike, addUser, asUser } from './supabase-like';
import { nextCombo } from '@/lib/lucky';

const files = ['sql/voli-starter.sql', 'supabase/001_levels.sql', 'supabase/002_special_id.sql', 'supabase/003_vip.sql',
  'supabase/004_rooms.sql', 'supabase/005_room_coins.sql', 'supabase/006_room_gifts.sql', 'supabase/026_lucky_gifts.sql']
  .map((f) => readFileSync(f, 'utf8'));
const uuid = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`;
const OWNER = uuid(1), SENDER = uuid(2);
type Res = { multiplier: number; prize: number; coins: number };

const one = async <T,>(db: PGlite, who: string, sql: string, params: unknown[] = []) =>
  (await asUser(db, who, () => db.query<{ r: T }>(sql, params))).rows[0]!.r;
const coins = async (db: PGlite, who: string) =>
  (await db.query<{ c: number; ch: number }>('select coins::int as c, charisma_points::int as ch from public.profiles where auth_id = $1', [who])).rows[0]!;
const pool = async (db: PGlite, kind: string) =>
  (await db.query<{ b: number; p: number }>('select balance::int as b, platform_total::int as p from public.lucky_pools where kind = $1', [kind])).rows[0]!;
const force = (db: PGlite, kind: string, m: number) =>
  db.query(`update public.lucky_settings set multipliers = $2, weights = '{10000}' where kind = $1`, [kind, `{${m}}`]);
const throwGift = (db: PGlite, room: string, gift: string) =>
  one<Res>(db, SENDER, 'select public.send_room_lucky_gift($1, $2, 1, $3::uuid[]) as r', [room, gift, `{${OWNER}}`]);

describe('lucky and crazy gifts', () => {
  let db: PGlite; let room: string;
  beforeAll(async () => {
    db = await supabaseLike();
    for (const f of files) await db.exec(f);
    await addUser(db, OWNER, 'صاحب'); await addUser(db, SENDER, 'راعي');
    room = await one<string>(db, OWNER, "select public.start_party('روم', null, 'audio', 10, 'default', 'أهلاً', null) as r");
    await one(db, SENDER, 'select public.enter_room($1) as r', [room]);
    const pid = (await db.query<{ p: number }>('select public_id as p from public.profiles where auth_id = $1', [SENDER])).rows[0]!.p;
    await db.query('select public.admin_add_coins($1, 10000)', [pid]);
  }, 30000);
  afterAll(async () => { await db.close(); });

  it('a 1000-coin crazy gift gives the receiver 9.2% (92), the platform 15.8% (158) and the pool the rest (750)', async () => {
    await force(db, 'crazy', 1000); // pool can't cover x1000, so nothing is paid
    const r = await throwGift(db, room, 'crazy_lion');
    expect(r.multiplier).toBe(0);
    expect((await coins(db, OWNER)).ch).toBe(92);
    expect(await pool(db, 'crazy')).toEqual({ b: 750, p: 158 });
    expect((await coins(db, SENDER)).c).toBe(9000);
  });

  it('safety valve: a drawn multiplier the pool cannot cover drops to the biggest one it can', async () => {
    await db.query(`update public.lucky_settings set multipliers = '{1,1000}', weights = '{0,10000}' where kind = 'crazy'`);
    const r = await throwGift(db, room, 'crazy_lion'); // pool 1500 after deposit, x1000 = 1,000,000 too much → x1
    expect(r.multiplier).toBe(1);
    expect(r.prize).toBe(1000);
    expect((await pool(db, 'crazy')).b).toBe(500);
  });

  it('a win is paid from the pool straight into the balance and the pool never goes negative', async () => {
    await db.query(`update public.lucky_pools set balance = 1000 where kind = 'lucky'`);
    await force(db, 'lucky', 20);
    const r = await throwGift(db, room, 'lucky_star'); // 50 x20 = 1000, pool 1000 + 39 deposit (50 − 4 − 7)
    expect(r).toMatchObject({ multiplier: 20, prize: 1000 });
    expect((await pool(db, 'lucky')).b).toBe(39);
    expect(r.coins).toBe((await coins(db, SENDER)).c);
  });

  it('the pool tables are closed to members', async () => {
    await expect(asUser(db, SENDER, () => db.query('select * from public.lucky_pools'))).rejects.toThrow();
    await expect(asUser(db, SENDER, () => db.query('select * from public.lucky_spins'))).rejects.toThrow();
  });

  it('combo counts up inside 3 seconds and restarts after', () => {
    expect(nextCombo(0, 0, 1000)).toBe(1);
    expect(nextCombo(4, 1000, 3500)).toBe(5);
    expect(nextCombo(4, 1000, 4500)).toBe(1);
  });
});
