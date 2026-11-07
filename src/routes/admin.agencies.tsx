import { createFileRoute, Link } from "@tanstack/react-router";
import { Search } from "lucide-react";
import { useEffect, useState } from "react";
import { Empty, PageTitle, Panel, Person } from "@/components/admin/AdminShell";
import { Confirm, Pill, useAction, useLoad } from "@/components/admin/admin-ui";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  fmt, fmtDate, fmtDay, getAgencies, getAgencyHosts, getApplications, removeAgencyHost, reviewApplication, updateAgency,
  type AdminAgency, type AgencyApplication, type ApplicationStatus,
} from "@/lib/admin";

export const Route = createFileRoute("/admin/agencies")({
  head: () => ({
    meta: [
      { title: "الوكالات — إدارة voli" },
      { name: "description", content: "طلبات فتح الوكالات وإدارة وكالات voli." },
      { property: "og:title", content: "الوكالات — إدارة voli" },
      { property: "og:description", content: "طلبات فتح الوكالات وإدارة وكالات voli." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: AgenciesPage,
});

function AgenciesPage() {
  return (
    <>
      <PageTitle title="الوكالات" />
      <Tabs defaultValue="applications" dir="rtl">
        <TabsList className="mb-4 rounded-full">
          <TabsTrigger value="applications" className="rounded-full">طلبات الفتح</TabsTrigger>
          <TabsTrigger value="agencies" className="rounded-full">كل الوكالات</TabsTrigger>
        </TabsList>
        <TabsContent value="applications"><Applications /></TabsContent>
        <TabsContent value="agencies"><AgencyList /></TabsContent>
      </Tabs>
    </>
  );
}

function Applications() {
  const [status, setStatus] = useState<ApplicationStatus>("pending");
  const { data, failed, reload } = useLoad(() => getApplications(status), [status]);
  return (
    <>
      <Tabs value={status} onValueChange={(v) => setStatus(v as ApplicationStatus)} dir="rtl">
        <TabsList className="mb-3 rounded-full">
          <TabsTrigger value="pending" className="rounded-full">مستنية</TabsTrigger>
          <TabsTrigger value="approved" className="rounded-full">اتقبلت</TabsTrigger>
          <TabsTrigger value="rejected" className="rounded-full">اترفضت</TabsTrigger>
        </TabsList>
      </Tabs>
      {failed ? <Empty>ماقدرناش نحمّل الطلبات.</Empty> : !data ? <Empty>…</Empty> : data.length === 0 ? <Empty>مافيش طلبات هنا.</Empty> : (
        <div className="grid gap-3 md:grid-cols-2">{data.map((a) => <ApplicationCard key={a.id} app={a} reload={reload} />)}</div>
      )}
    </>
  );
}

function ApplicationCard({ app, reload }: { app: AgencyApplication; reload: () => void }) {
  const { busy, run } = useAction();
  const [reason, setReason] = useState("");
  const rows: [string, string][] = [
    ["الاسم الكامل", app.full_name], ["الواتساب", app.phone], ["الدولة", app.country], ["اتبعت", fmtDate(app.created_at)],
  ];
  return (
    <Panel>
      <div className="flex items-center justify-between gap-2">
        <h3 className="font-bold">{app.agency_name}</h3>
        {app.code != null && <Pill tone="gold">كود {app.code}</Pill>}
      </div>
      <dl className="mt-3 space-y-1.5 text-sm">
        {rows.map(([k, v]) => (
          <div key={k} className="flex justify-between gap-3"><dt className="text-muted-foreground">{k}</dt><dd className="font-semibold" dir="auto">{v}</dd></div>
        ))}
      </dl>
      {app.note && <p className="mt-2 rounded-xl bg-secondary/50 p-2 text-xs">{app.note}</p>}
      {app.reject_reason && <p className="mt-2 text-xs text-destructive">سبب الرفض: {app.reject_reason}</p>}
      <Link to="/admin/member/$authId" params={{ authId: app.applicant_id }} className="mt-2 inline-block text-xs text-primary hover:underline">ملف صاحب الطلب</Link>
      {app.status === "pending" && (
        <div className="mt-3 space-y-2">
          <Input value={reason} onChange={(e) => setReason(e.target.value)} maxLength={200} placeholder="سبب الرفض (لو هترفض)" />
          <div className="flex gap-2">
            <Button className="flex-1" disabled={busy}
              onClick={() => run(async () => { const code = await reviewApplication(app.id, true); return code; }, "اتفتحت الوكالة", reload)}>قبول</Button>
            <Button className="flex-1" variant="destructive" disabled={busy}
              onClick={() => run(() => reviewApplication(app.id, false, reason.trim()), "اترفض الطلب", reload)}>رفض</Button>
          </div>
        </div>
      )}
    </Panel>
  );
}

function AgencyList() {
  const [text, setText] = useState("");
  const [query, setQuery] = useState("");
  useEffect(() => { const t = setTimeout(() => setQuery(text), 350); return () => clearTimeout(t); }, [text]);
  const { data, failed, reload } = useLoad(() => getAgencies(query), [query]);
  const [open, setOpen] = useState<string | null>(null);
  return (
    <>
      <div className="relative mb-3">
        <Search className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input value={text} onChange={(e) => setText(e.target.value)} placeholder="كود الوكالة، اسمها أو آيدي الوكيل" className="pr-9" />
      </div>
      {failed ? <Empty>ماقدرناش نحمّل الوكالات.</Empty> : !data ? <Empty>…</Empty> : data.length === 0 ? <Empty>مافيش وكالات.</Empty> : (
        <div className="space-y-3">
          {data.map((a) => (
            <Panel key={a.id}>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <Pill tone="gold">{a.code}</Pill>
                  <div>
                    <p className="font-bold">{a.name}</p>
                    <p className="text-xs text-muted-foreground">{fmt(a.members)} مضيف · {fmt(a.income_week)} ماسة آخر 7 أيام{a.commission_percent != null && ` · ${a.commission_percent}%`}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Link to="/admin/member/$authId" params={{ authId: a.owner_id }}>
                    <Person name={a.owner_name} publicId={a.owner_public_id} avatar={a.owner_avatar} />
                  </Link>
                  <Button size="sm" variant="secondary" onClick={() => setOpen(open === a.id ? null : a.id)}>{open === a.id ? "قفل" : "إدارة"}</Button>
                </div>
              </div>
              {open === a.id && <AgencyManage agency={a} reload={reload} />}
            </Panel>
          ))}
        </div>
      )}
    </>
  );
}

function AgencyManage({ agency, reload }: { agency: AdminAgency; reload: () => void }) {
  const { busy, run } = useAction();
  const [name, setName] = useState(agency.name);
  const [percent, setPercent] = useState(agency.commission_percent == null ? "" : String(agency.commission_percent));
  const hosts = useLoad(() => getAgencyHosts(agency.id), [agency.id]);
  const pct = percent.trim() === "" ? null : Number(percent);
  const valid = name.trim().length >= 2 && (pct == null || (Number.isFinite(pct) && pct >= 0 && pct <= 100));
  return (
    <div className="mt-4 space-y-4 border-t border-border pt-4">
      <div className="grid gap-2 md:grid-cols-[1fr_10rem_auto]">
        <Input value={name} onChange={(e) => setName(e.target.value)} maxLength={40} placeholder="اسم الوكالة" />
        <Input value={percent} onChange={(e) => setPercent(e.target.value)} inputMode="decimal" dir="ltr" placeholder="النسبة %" />
        <Button disabled={busy || !valid} onClick={() => run(() => updateAgency(agency.id, name.trim(), pct), "اتحفظت الوكالة", reload)}>حفظ</Button>
      </div>
      <div>
        <p className="mb-2 text-sm font-bold">المضيفين</p>
        {!hosts.data ? <p className="text-sm text-muted-foreground">…</p> : hosts.data.length === 0 ? <p className="text-sm text-muted-foreground">مافيش مضيفين.</p> : (
          <ul className="divide-y divide-border/60">
            {hosts.data.map((h) => (
              <li key={h.host_id} className="flex flex-wrap items-center justify-between gap-2 py-2">
                <Link to="/admin/member/$authId" params={{ authId: h.host_id }}>
                  <Person name={h.display_name} publicId={h.public_id} avatar={h.avatar_url}
                    sub={<> · من {fmtDay(h.joined_at)} · {fmt(h.income_week)} ماسة الأسبوع</>} />
                </Link>
                {h.host_id === agency.owner_id ? <Pill tone="gold">الوكيل</Pill> : (
                  <Confirm destructive title={`شيل ${h.display_name} من الوكالة؟`} body="دخله مش هيتحسب للوكالة من دلوقتي." confirm="شيل"
                    onConfirm={() => run(() => removeAgencyHost(agency.id, h.host_id), "اتشال المضيف", () => { hosts.reload(); reload(); })}
                    trigger={<Button size="sm" variant="secondary" disabled={busy}>شيل</Button>} />
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
