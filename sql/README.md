# voli — External project setup

1. Connect your external project in Lovable: **Settings → General → External Supabase → Connect**. The integration generates the client and authentication configuration; no private key should be pasted into frontend code.
2. Run `voli-starter.sql` once in the project's SQL Editor, before opening signup. This script targets a fresh project. It does not modify or backfill existing accounts.
3. Enable Email in Authentication → Providers. Keep email confirmation enabled. Add the preview and published origins to Authentication → URL Configuration. Add `/reset-password` when recovery is connected.
4. After connection, wire the prepared login/signup form to the generated client, sending `display_name` in signup metadata. Successful signup with a null session requires email confirmation, not an immediate redirect as a signed-in user.

## Tables
- `profiles`: Auth UUID ownership, visible seven-digit random ID, display name, optional avatar.
- `private.account_uids`: hidden sequential internal UID. Never expose the private schema through the Data API or a client-facing function. Sequence values may have gaps after rolled-back transactions and are not a total account count.
- `follows`: follow relationships.
- `streams`: live-stream metadata, not video delivery.
- `messages`: private direct messages; only sender and recipient can read them.

No fake accounts or seed data are included. Public IDs have nine million possible values, are unique, and retry on collision. They are identifiers, not secrets or authorization credentials. Internal numeric UIDs are never included in public profile rows. All user-owned writes are protected by RLS and column grants. Wallets, payments, VIP, gifts, video transport and realtime chat delivery are outside this starter setup.

## Current status
The form is prepared but intentionally does not create sessions while the external connection is missing. Real signup, sign-in, profile loading, recovery and sign-out must be connected and tested after linking the project. Google, Apple and phone sign-in require separate provider configuration and are not part of email/password signup.
