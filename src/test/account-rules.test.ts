// @vitest-environment node
import { readFileSync } from 'node:fs';
import { PGlite } from '@electric-sql/pglite';
import { beforeAll, afterAll, describe, it, expect } from 'vitest';
import { accountSchema } from '@/lib/account-validation';
const db = new PGlite();
const first = '00000000-0000-4000-8000-000000000001';
const second = '00000000-0000-4000-8000-000000000002';
beforeAll(async () => {
  await db.exec(`create role anon; create role authenticated; create role service_role bypassrls; create schema auth;
    create table auth.users(id uuid primary key, raw_user_meta_data jsonb);
    create function auth.uid() returns uuid language sql as $$select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid$$;
    grant usage on schema auth to authenticated; grant execute on function auth.uid() to authenticated;`);
  await db.exec(readFileSync('sql/voli-starter.sql', 'utf8'));
  await db.query(`insert into auth.users values ($1, '{"display_name":"الأول"}'), ($2, '{"display_name":"الثاني"}')`, [first, second]);
}, 30000);
afterAll(async () => { await db.close(); });
describe('Account identity rules', () => {
  it('generates unique random seven-digit public IDs', async () => {
    const { rows } = await db.query<{public_id: number}>('select public_id from public.profiles');
    expect(rows).toHaveLength(2);
    for (const row of rows) expect(String(row.public_id)).toMatch(/^\d{7}$/);
    expect(new Set(rows.map(r => r.public_id)).size).toBe(2);
    await expect(db.query('update public.profiles set public_id = 999999 where auth_id = $1', [first])).rejects.toThrow();
  });
  it('assigns sequential internal UIDs separately from public profiles', async () => {
    const {rows} = await db.query<{uid: number}>('select uid::integer from private.account_uids order by uid');
    expect(rows.map(r=>r.uid)).toEqual([1,2]);
    const columns = await db.query<{column_name:string}>("select column_name from information_schema.columns where table_schema='public' and table_name='profiles'");
    expect(columns.rows.map(r=>r.column_name)).not.toContain('uid');
  });
  it('denies user access to hidden internal UIDs', async () => {
    await db.exec('set role authenticated');
    try { await expect(db.query('select uid from private.account_uids')).rejects.toThrow(); }
    finally { await db.exec('reset role'); }
  });
  it('requires only a display name, not a username handle', () => {
    expect(accountSchema.safeParse({displayName:'أحمد',email:'a@example.com',password:'validpass'}).success).toBe(true);
    expect(accountSchema.safeParse({email:'a@example.com',password:'validpass'}).success).toBe(false);
  });
  it('prevents clients changing a public ID', async () => {
    await db.exec(`set role authenticated; set request.jwt.claim.sub = '${first}'`);
    try { await expect(db.query('update public.profiles set public_id = 7777777 where auth_id = $1', [first])).rejects.toThrow(); }
    finally { await db.exec('reset role'); }
  });
  it('keeps messages private to participants', async () => {
    const third = '00000000-0000-4000-8000-000000000003';
    await db.query(`insert into auth.users values ($1, '{"display_name":"ثالث"}')`, [third]);
    await db.query('insert into public.messages(sender_id,recipient_id,body) values ($1,$2,$3)',[first,second,'رسالة']);
    await db.exec(`set role authenticated; set request.jwt.claim.sub = '${third}'`);
    try { expect((await db.query('select * from public.messages')).rows).toHaveLength(0); }
    finally { await db.exec('reset role'); }
  });
});
