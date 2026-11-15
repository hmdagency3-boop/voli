// @vitest-environment node
import { readFileSync } from 'node:fs';
import { afterEach, describe, expect, it } from 'vitest';
import type { PGlite } from '@electric-sql/pglite';
import { supabaseLike, addUser, asUser } from './supabase-like';

const base = readFileSync('supabase/015_device_bans.sql', 'utf8');
const sql = readFileSync('supabase/025_device_fingerprint.sql', 'utf8');
const A = '00000000-0000-4000-8000-000000000001';
const B = '00000000-0000-4000-8000-000000000002';
let db: PGlite;
afterEach(async () => { if (db) await db.close(); });

async function setup(runTwice = false) {
  db = await supabaseLike();
  await db.exec(`
    create table public.profiles(auth_id uuid primary key references auth.users(id), public_id bigint unique, display_name text);
    create function public.admin_guard() returns uuid language sql as $$ select auth.uid() $$;
    create function public.admin_log(uuid, text, uuid, jsonb) returns void language sql as $$ select 1 $$;
  `);
  for (const [id, pid] of [[A, 1234567], [B, 2345678]] as const) {
    await addUser(db, id, 'عضو');
    await db.query('insert into public.profiles values ($1,$2,$3)', [id, pid, 'عضو ' + pid]);
  }
  await db.exec(base);
  await db.exec(sql);
  if (runTwice) await db.exec(sql);
}

const report = (who: string, device: string, ip: string, details: object) =>
  asUser(db, who, () => db.query<{ r: Record<string, unknown> | null }>(
    "select public.voli_report_device_v2($1,'Samsung','SM-A546B','Android 14','wifi','Vodafone',$2,$3::jsonb) as r", [device, ip, JSON.stringify(details)]));

describe('phone fingerprint report', () => {
  it('saves hardware details and keeps every IP the phone used', async () => {
    await setup();
    const d = { source: 'app', fingerprint: 'fp-1', android_id: 'abc123', widevine_id: 'wv-1', screen: '1080x2340', cpu_cores: 8 };
    await report(A, 'android:abc123', '41.33.12.7', d);
    await report(A, 'android:abc123', '41.33.12.7', d);
    await report(A, 'android:abc123', '197.50.1.9', d);
    const row = (await db.query<{ fingerprint: string; android_id: string; first_ip: string; hardware: { screen: string } }>(
      "select fingerprint, android_id, host(first_ip) as first_ip, hardware from public.member_devices")).rows[0];
    expect(row).toMatchObject({ fingerprint: 'fp-1', android_id: 'abc123', first_ip: '41.33.12.7', hardware: { screen: '1080x2340', cpu_cores: 8 } });
    const ips = (await db.query<{ ip: string; seen_count: number }>("select host(ip) as ip, seen_count from public.member_device_ips order by ip")).rows;
    expect(ips).toEqual([{ ip: '197.50.1.9', seen_count: 1 }, { ip: '41.33.12.7', seen_count: 2 }]);
  }, 20000);

  it('a ban on the fingerprint blocks the phone even with a new device ID', async () => {
    await setup();
    await db.exec("insert into public.device_bans(kind, value, reason) values ('device','fp-1','إساءة')");
    const res = await report(B, 'android:other', '10.0.0.5', { fingerprint: 'fp-1' });
    expect(res.rows[0]?.r).toMatchObject({ kind: 'device', value: 'fp-1', reason: 'إساءة' });
    const free = await report(B, 'android:other', '10.0.0.5', { fingerprint: 'fp-2' });
    expect(free.rows[0]?.r).toBeNull();
  }, 20000);

  it('a ban on the Android device ID blocks that phone', async () => {
    await setup();
    await db.exec("insert into public.device_bans(kind, value) values ('device','android:abc123')");
    const res = await report(A, 'android:abc123', '10.0.0.5', { android_id: 'abc123' });
    expect(res.rows[0]?.r).toMatchObject({ kind: 'device', value: 'android:abc123' });
  }, 20000);

  it('the panel lists other accounts seen on the same phone, and members cannot read details or IP history', async () => {
    await setup(true);
    await report(A, 'android:abc123', '10.0.0.5', { fingerprint: 'fp-1', android_id: 'abc123' });
    await report(B, 'android:abc123-b', '10.0.0.6', { fingerprint: 'fp-1' });
    const more = await asUser(db, A, () => db.query<{ d: { same_phone: { public_id: number }[]; ips: unknown[] } }>(
      "select public.admin_device_details($1,'android:abc123') as d", [A]));
    expect(more.rows[0]?.d.same_phone.map((x) => Number(x.public_id))).toEqual([2345678]);
    expect(more.rows[0]?.d.ips).toHaveLength(1);
    await expect(asUser(db, A, () => db.query('select * from public.member_device_ips'))).rejects.toThrow();
  }, 20000);
});
