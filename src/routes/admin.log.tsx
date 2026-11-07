import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Empty, PageTitle, Panel } from "@/components/admin/AdminShell";
import { Pill, useLoad } from "@/components/admin/admin-ui";
import { Button } from "@/components/ui/button";
import { ACTION_LABELS, describeAction, fmtDate, getLog, LOG_PAGE } from "@/lib/admin";

export const Route = createFileRoute("/admin/log")({
  head: () => ({
    meta: [
      { title: "سجل الإدارة — voli" },
      { name: "description", content: "كل اللي اتعمل من لوحة إدارة voli." },
      { property: "og:title", content: "سجل الإدارة — voli" },
      { property: "og:description", content: "كل اللي اتعمل من لوحة إدارة voli." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: LogPage,
});

function LogPage() {
  const [page, setPage] = useState(0);
  const { data, failed } = useLoad(() => getLog(page), [page]);
  return (
    <>
      <PageTitle title="سجل الإدارة" hint="مين عمل إيه ومتى" />
      <Panel className="p-0 lg:p-0">
        {failed ? <Empty>ماقدرناش نحمّل السجل.</Empty> : !data ? <Empty>…</Empty> : data.length === 0 ? <Empty>مافيش حاجة في السجل لسه.</Empty> : (
          <ul className="divide-y divide-border/60">
            {data.map((r) => (
              <li key={r.id} className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 text-sm">
                <div className="flex flex-wrap items-center gap-2">
                  <Pill tone={r.action === "ban" ? "danger" : "primary"}>{ACTION_LABELS[r.action] ?? r.action}</Pill>
                  {r.target_id && r.target_name && (
                    <Link to="/admin/member/$authId" params={{ authId: r.target_id }} className="font-semibold hover:underline">
                      {r.target_name} <span className="text-xs text-muted-foreground" dir="ltr">{r.target_public_id}</span>
                    </Link>
                  )}
                  <span className="text-muted-foreground">{describeAction(r.action, r.details)}</span>
                </div>
                <span className="text-xs text-muted-foreground">{r.admin_name ?? "—"} · {fmtDate(r.created_at)}</span>
              </li>
            ))}
          </ul>
        )}
      </Panel>
      <div className="mt-4 flex items-center justify-center gap-3 text-sm">
        <Button variant="secondary" size="sm" disabled={page === 0} onClick={() => setPage((p) => p - 1)}>الأحدث</Button>
        <span className="text-muted-foreground">صفحة {page + 1}</span>
        <Button variant="secondary" size="sm" disabled={!data || data.length < LOG_PAGE} onClick={() => setPage((p) => p + 1)}>الأقدم</Button>
      </div>
    </>
  );
}
