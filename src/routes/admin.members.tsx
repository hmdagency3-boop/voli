import { createFileRoute, Link } from "@tanstack/react-router";
import { Search } from "lucide-react";
import { useEffect, useState } from "react";
import { Empty, PageTitle, Panel, Person } from "@/components/admin/AdminShell";
import { Pill, useLoad } from "@/components/admin/admin-ui";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { fmt, fmtDay, getMembers, MEMBERS_PAGE, type MemberFilter } from "@/lib/admin";
import { activeVipLevel } from "@/lib/vip";

export const Route = createFileRoute("/admin/members")({
  head: () => ({
    meta: [
      { title: "الأعضاء — إدارة voli" },
      { name: "description", content: "بحث وإدارة أعضاء voli." },
      { property: "og:title", content: "الأعضاء — إدارة voli" },
      { property: "og:description", content: "بحث وإدارة أعضاء voli." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: MembersPage,
});

const FILTERS: { key: MemberFilter; label: string }[] = [
  { key: "all", label: "الكل" }, { key: "new", label: "جداد" }, { key: "vip", label: "VIP" },
  { key: "staff", label: "الطاقم" }, { key: "banned", label: "محظورين" },
];

function MembersPage() {
  const [text, setText] = useState("");
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<MemberFilter>("all");
  const [page, setPage] = useState(0);
  useEffect(() => { const t = setTimeout(() => { setQuery(text); setPage(0); }, 350); return () => clearTimeout(t); }, [text]);
  const { data, failed } = useLoad(() => getMembers(query, filter, page), [query, filter, page]);
  const pages = data ? Math.max(1, Math.ceil(data.total / MEMBERS_PAGE)) : 1;

  return (
    <>
      <PageTitle title="الأعضاء" hint={data ? `${fmt(data.total)} عضو` : "…"} />
      <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={text} onChange={(e) => setText(e.target.value)} placeholder="ابحث بالآيدي، الآيدي المميز، الاسم أو الإيميل" className="pr-9" />
        </div>
        <Tabs value={filter} onValueChange={(v) => { setFilter(v as MemberFilter); setPage(0); }}>
          <TabsList className="rounded-full">
            {FILTERS.map((f) => <TabsTrigger key={f.key} value={f.key} className="rounded-full">{f.label}</TabsTrigger>)}
          </TabsList>
        </Tabs>
      </div>

      <Panel className="p-0 lg:p-0">
        {failed ? <Empty>ماقدرناش نحمّل الأعضاء.</Empty> : !data ? <Empty>…</Empty> : data.rows.length === 0 ? <Empty>مافيش أعضاء بالبحث ده.</Empty> : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-sm">
              <thead className="text-xs text-muted-foreground">
                <tr className="border-b border-border">
                  <th className="px-4 py-3 text-right font-semibold">العضو</th>
                  <th className="px-4 py-3 text-right font-semibold">الإيميل</th>
                  <th className="px-4 py-3 text-right font-semibold">الكوينز</th>
                  <th className="px-4 py-3 text-right font-semibold">الحالة</th>
                  <th className="px-4 py-3 text-right font-semibold">اشترك</th>
                </tr>
              </thead>
              <tbody>
                {data.rows.map((m) => {
                  const vip = activeVipLevel(m);
                  return (
                    <tr key={m.auth_id} className="border-b border-border/60 last:border-0 hover:bg-secondary/40">
                      <td className="px-4 py-2.5">
                        <Link to="/admin/member/$authId" params={{ authId: m.auth_id }} className="block">
                          <Person name={m.display_name} publicId={m.special_id ?? m.public_id} avatar={m.avatar_url}
                            sub={m.special_id ? <> · <bdi dir="ltr">{m.public_id}</bdi></> : null} />
                        </Link>
                      </td>
                      <td className="px-4 py-2.5 text-xs text-muted-foreground" dir="ltr">{m.email ?? "—"}</td>
                      <td className="px-4 py-2.5 font-semibold" dir="ltr">{fmt(m.coins)}</td>
                      <td className="px-4 py-2.5">
                        <div className="flex flex-wrap gap-1">
                          {m.banned && <Pill tone="danger">محظور</Pill>}
                          {m.roles.includes("admin") && <Pill tone="primary">إدارة عليا</Pill>}
                          {m.roles.includes("moderator") && <Pill tone="primary">مشرف</Pill>}
                          {vip > 0 && <Pill tone="gold">VIP {vip}</Pill>}
                        </div>
                      </td>
                      <td className="px-4 py-2.5 text-xs text-muted-foreground">{fmtDay(m.created_at)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Panel>

      {pages > 1 && (
        <div className="mt-4 flex items-center justify-center gap-3 text-sm">
          <Button variant="secondary" size="sm" disabled={page === 0} onClick={() => setPage((p) => p - 1)}>السابق</Button>
          <span className="text-muted-foreground">{page + 1} من {pages}</span>
          <Button variant="secondary" size="sm" disabled={page + 1 >= pages} onClick={() => setPage((p) => p + 1)}>التالي</Button>
        </div>
      )}
    </>
  );
}
