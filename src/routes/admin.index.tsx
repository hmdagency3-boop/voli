import { createFileRoute, Link } from "@tanstack/react-router";
import { Ban, Building2, Coins, Crown, Gift, Radio, UserPlus, Users } from "lucide-react";
import type { ReactNode } from "react";
import { Empty, PageTitle, Panel } from "@/components/admin/AdminShell";
import { useLoad } from "@/components/admin/admin-ui";
import { fmt, getDashboard } from "@/lib/admin";

export const Route = createFileRoute("/admin/")({
  head: () => ({
    meta: [
      { title: "لوحة الإدارة — voli" },
      { name: "description", content: "نظرة عامة على أرقام منصة voli للإدارة." },
      { property: "og:title", content: "لوحة الإدارة — voli" },
      { property: "og:description", content: "نظرة عامة على أرقام منصة voli." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: DashboardPage,
});

function DashboardPage() {
  const { data, failed } = useLoad(getDashboard, []);

  return (
    <>
      <PageTitle title="الرئيسية" hint="أرقام المنصة دلوقتي" />
      {failed ? <Empty>ماقدرناش نحمّل الأرقام.</Empty> : !data ? <Empty>…</Empty> : (
        <div className="space-y-6">
          {data.pending_applications > 0 && (
            <Link to="/admin/agencies" className="flex items-center justify-between rounded-2xl border border-agency-gold/40 bg-agency-gold/10 px-4 py-3 text-sm font-semibold text-agency-gold">
              <span>فيه {fmt(data.pending_applications)} طلب فتح وكالة مستني ردك</span>
              <span>راجع ←</span>
            </Link>
          )}
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            <Stat icon={<Users />} label="كل الأعضاء" value={fmt(data.members)} sub={`+${fmt(data.members_today)} النهارده`} />
            <Stat icon={<UserPlus />} label="جداد آخر 7 أيام" value={fmt(data.members_week)} />
            <Stat icon={<Radio />} label="رومات شغالة" value={fmt(data.live_rooms)} sub={`${fmt(data.in_rooms_now)} جوه الرومات`} />
            <Stat icon={<Crown />} label="أعضاء VIP" value={fmt(data.vip_active)} />
            <Stat icon={<Gift />} label="هدايا النهارده" value={fmt(data.gifts_today)} sub={`${fmt(data.gifts_week)} آخر 7 أيام`} />
            <Stat icon={<Coins />} label="كوينز مع الأعضاء" value={fmt(data.coins_balance)} />
            <Stat icon={<Building2 />} label="الوكالات" value={fmt(data.agencies)} />
            <Stat icon={<Ban />} label="محظورين" value={fmt(data.bans_active)} />
          </div>
          <div className="grid gap-4 lg:grid-cols-2">
            <Panel title="تسجيلات آخر 14 يوم"><Bars days={data.days} pick="signups" /></Panel>
            <Panel title="قيمة الهدايا آخر 14 يوم"><Bars days={data.days} pick="gifts" /></Panel>
          </div>
        </div>
      )}
    </>
  );
}

function Stat({ icon, label, value, sub }: { icon: ReactNode; label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      <div className="flex items-center gap-2 text-muted-foreground [&_svg]:size-4">{icon}<span className="text-xs font-semibold">{label}</span></div>
      <p className="mt-2 text-2xl font-extrabold" dir="ltr">{value}</p>
      {sub && <p className="mt-0.5 text-xs text-muted-foreground">{sub}</p>}
    </div>
  );
}

function Bars({ days, pick }: { days: { day: string; signups: number; gifts: number }[]; pick: "signups" | "gifts" }) {
  const values = days.map((d) => Number(d[pick]));
  const max = Math.max(1, ...values);
  return (
    <div className="flex h-40 items-end gap-1" dir="ltr">
      {days.map((d, i) => (
        <div key={d.day} className="group flex h-full flex-1 flex-col items-center justify-end gap-1" title={`${d.day}: ${fmt(values[i])}`}>
          <span className="text-[10px] text-muted-foreground opacity-0 group-hover:opacity-100">{fmt(values[i])}</span>
          <div className="w-full rounded-t-md bg-primary/80" style={{ height: `${Math.max(2, ((values[i] ?? 0) / max) * 100)}%` }} />
          <span className="text-[10px] text-muted-foreground">{d.day.slice(8, 10)}</span>
        </div>
      ))}
    </div>
  );
}
