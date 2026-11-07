import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { AppScreen } from "@/components/AppScreen";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AgencyTopBar, Notice, PersonAvatar, PersonName } from "@/components/agency/AgencyParts";
import { useAccount } from "@/hooks/use-account";
import {
  agencyErrorMessage, getApplicationsForReview, isAdmin, reviewApplication, type AdminApplication, type Application,
} from "@/lib/agency";

export const Route = createFileRoute("/agency/review")({
  head: () => ({
    meta: [
      { title: "مراجعة طلبات الوكالات — voli" },
      { name: "description", content: "للإدارة: قبول أو رفض طلبات فتح الوكالات على voli." },
      { property: "og:title", content: "مراجعة طلبات الوكالات — voli" },
      { property: "og:description", content: "مراجعة طلبات الوكالات على voli." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ReviewPage,
});

function ReviewPage() {
  const { session } = useAccount();
  const me = session?.user.id;
  const [allowed, setAllowed] = useState<boolean | null>(null);
  const [tab, setTab] = useState<Application["status"]>("pending");
  const [rows, setRows] = useState<AdminApplication[] | null>(null);
  const [version, setVersion] = useState(0);
  useEffect(() => { if (me) isAdmin(me).then(setAllowed); }, [me]);
  useEffect(() => {
    if (!allowed) return;
    setRows(null);
    getApplicationsForReview(tab).then(setRows, (e) => { toast.error(agencyErrorMessage(e)); setRows([]); });
  }, [allowed, tab, version]);

  return (
    <AppScreen>
      <AgencyTopBar title="طلبات فتح الوكالات" />
      {allowed === null ? <Notice>…</Notice> : !allowed ? <Notice>الصفحة دي للإدارة بس.</Notice> : (
        <>
          <Tabs value={tab} onValueChange={(v) => setTab(v as Application["status"])} className="mx-4">
            <TabsList className="grid w-full grid-cols-3 rounded-full">
              <TabsTrigger value="pending" className="rounded-full">مستنية</TabsTrigger>
              <TabsTrigger value="approved" className="rounded-full">اتقبلت</TabsTrigger>
              <TabsTrigger value="rejected" className="rounded-full">اترفضت</TabsTrigger>
            </TabsList>
          </Tabs>
          {!rows ? <Notice>…</Notice> : rows.length === 0 ? <Notice>مافيش طلبات هنا.</Notice> : (
            <ul className="mx-4 mt-3 space-y-3">
              {rows.map((r) => <ApplicationCard key={r.id} app={r} onDone={() => setVersion((v) => v + 1)} />)}
            </ul>
          )}
        </>
      )}
    </AppScreen>
  );
}

function ApplicationCard({ app, onDone }: { app: AdminApplication; onDone: () => void }) {
  const [busy, setBusy] = useState(false);
  const [rejecting, setRejecting] = useState(false);
  const [reason, setReason] = useState("");

  async function review(approve: boolean) {
    setBusy(true);
    try {
      const code = await reviewApplication(app.id, approve, approve ? undefined : reason.trim().slice(0, 200));
      toast.success(approve ? `اتفتحت الوكالة بكود ${code}` : "اترفض الطلب");
      onDone();
    } catch (err) { toast.error(agencyErrorMessage(err)); } finally { setBusy(false); }
  }

  const rows: [string, string][] = [
    ["الاسم الكامل", app.full_name], ["الواتساب", app.phone], ["الدولة", app.country],
    ["التاريخ", new Date(app.created_at).toLocaleString("en-CA")],
  ];
  return (
    <li className="rounded-[1.25rem] border bg-card p-4 shadow-soft">
      <div className="flex items-center gap-3">
        <PersonAvatar person={app.person} />
        <PersonName person={app.person} />
        {app.code != null && <span className="shrink-0 rounded-full bg-primary/15 px-2.5 py-1 text-xs font-bold text-primary" dir="ltr">كود {app.code}</span>}
      </div>
      <p className="mt-3 font-display text-base font-extrabold">{app.agency_name}</p>
      <dl className="mt-2 grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-xs">
        {rows.map(([k, v]) => (
          <div key={k} className="contents">
            <dt className="text-muted-foreground">{k}</dt>
            <dd className="truncate font-semibold" dir={k === "الواتساب" ? "ltr" : undefined}>{v}</dd>
          </div>
        ))}
      </dl>
      {app.note && <p className="mt-2 rounded-xl bg-secondary px-3 py-2 text-xs">{app.note}</p>}
      {app.reject_reason && <p className="mt-2 text-xs text-destructive">سبب الرفض: {app.reject_reason}</p>}
      {app.status === "pending" && (
        rejecting ? (
          <div className="mt-3 space-y-2">
            <Input value={reason} onChange={(e) => setReason(e.target.value)} maxLength={200} placeholder="سبب الرفض (اختياري)" className="rounded-xl" />
            <div className="flex gap-2">
              <Button variant="destructive" disabled={busy} onClick={() => review(false)} className="flex-1 rounded-full">تأكيد الرفض</Button>
              <Button variant="outline" disabled={busy} onClick={() => setRejecting(false)} className="flex-1 rounded-full">رجوع</Button>
            </div>
          </div>
        ) : (
          <div className="mt-3 flex gap-2">
            <Button disabled={busy} onClick={() => review(true)} className="flex-1 rounded-full">قبول وفتح الوكالة</Button>
            <Button variant="outline" disabled={busy} onClick={() => setRejecting(true)} className="flex-1 rounded-full">رفض</Button>
          </div>
        )
      )}
    </li>
  );
}
