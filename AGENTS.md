<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.

## What Lovable manages

Rules outside this block are the project's own. Change the pieces below in
Lovable, not by hand. With the [Lovable MCP](https://mcp.lovable.dev)
connected, `send_message` asks Lovable to do it; otherwise ask the user to
use the editor.

- **Database.** Do not add or edit `supabase/migrations/` or `drizzle/`.
  Ask Lovable to change the schema.
- **Generated files.** Do not edit a file whose header says it is automatically
  generated.
- **AI gateway.** Keep model calls on Lovable's gateway, and keep
  `LOVABLE_API_KEY` out of browser code.
- **Connectors.** Lovable provides native connectors. `list_connectors` shows
  which are enabled; `add_connector` only returns the dashboard link. When a
  connector is enabled, calls go through the connector gateway and need
  `LOVABLE_API_KEY`. When Lovable does not provide one, users can bring their
  own key and store it in Secrets.
- **Secrets.** Lovable manages them. Do not put secret values in the repo.
<!-- LOVABLE:END -->

- Use AppScreen for application pages so viewport sizing, internal scrolling, and stationary navigation remain consistent across routes.
- Keep starter external database SQL in sql/ re-runnable (if-not-exists, drop-then-create policies/triggers, explicit revoke+grant because Supabase grants new public tables to app roles by default) and verify it with PGlite on fresh, rerun and upgrade-from-fixture databases; internal UIDs live in public.account_uids with RLS on, no policies and no app-role grants, so clients can never read them.
- AccountForm shares login and signup validation and talks to the user's own external project through src/lib/supabase.ts (publishable key only, RLS enforces access); signup with no session means email confirmation is required, never a signed-in redirect.
- Level badge pictures are image files stored in the repo under src/assets/badges/ (imported by Vite, not CDN pointers, so they travel with the code) mapped to level ranges in src/lib/badges.ts (with per-badge text position); LevelBadge writes "Lv.N" on each badge's empty plate, so the plate position lives with each badge.
- Special ID (الايدي المميز) lives on profiles (special_id, vip_level) and is admin-set only via SQL (no member update grant); supabase/002_special_id.sql blocks clashes with public IDs by raising unique_violation so signup ID generation retries. Its frame pictures are repo files in src/assets/special-id/, picked by VIP level in src/lib/special-id.ts.
