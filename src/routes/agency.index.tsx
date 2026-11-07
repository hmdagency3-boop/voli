import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { BadgeCheck, ClipboardList, Copy, Gem, Search, ShieldCheck, Users, Wallet } from "lucide-react";
import { toast } from "sonner";
import { AppScreen } from "@/components/AppScreen";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAccount } from "@/hooks/use-account";
import {
  AgencyCrest, AgencyMenuCard, AgencyTopBar, Diamonds, Notice, PersonAvatar, PersonName, useAgencyState,
} from "@/components/agency/AgencyParts";
import {
  agencyCommission, agencyErrorMessage, cancelJoin, findAgency, getAgencySummary, isAdmin, parseAgencyCode, requestJoin,
  type AgencyState, type AgencySummary, type FoundAgency,
} from "@/lib/agency";

export const Route = createFileRoute("/agency/")({
  head: () => ({
    meta: [
      { title: "وكالتي — voli" },
      { name: "description", content: "نظام الوكالات على voli: افتح وكالتك أو انضم لوكالة بكودها وتابع دخل المضيفين." },
      { property: "og:title", content: "وكالتي — voli" },
      { property: "og:description", content: "افتح وكالتك أو انضم لوكالة على voli." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AgencyPage,
});

function AgencyPage() {
  const { me, state, failed, reload } = useAgencyState();
  const [admin, setAdmin] = useState(false);
  useEffect(() => { if (me) isAdmin(me).then(setAdmin); }, [me]);

  return (
    <AppScreen>
      <AgencyTopBar title="وكالتي" />
      {failed ? <Notice>ماقدرناش نحمّل بيانات الوكالة، جرب تاني.</Notice>
        : !state ? <Notice>…</Notice>
        : state.kind === "missing" ? <Notice>نظام الوكالات لسه مش جاهز في قاعدة البيانات.</Notice>
        : state.kind === "agent" ? <AgentHome state={state} />
        : state.kind === "host" ? <HostHome state={state} />
        : <JoinOrApply state={state} reload={reload} />}

      {admin && (
        <div className="mx-4 mt-4">
          <AgencyMenuCard to="/agency/review" icon={<ShieldCheck className="size-6" />} title="طلبات فتح الوكالات" hint="للإدارة: قبول أو رفض طلبات الوكلاء" />
        </div>
      )}
    </AppScreen>
  );
}

function CodeChip({ code }: { code: number }) {
  return (
    <button
      type="button"
      onClick={() => { navigator.clipboard.writeText(String(code)); toast.success("تم نسخ كود الوكالة"); }}
      className="inline-flex items-center gap-1.5 rounded-full bg-primary/15 px-3 py-1 text-xs font-bold text-primary"
      dir="ltr"
    >
      كود الوكالة: {code}
      <Copy className="size-3.5" />
    </button>
  );
}

function AgentHome({ state }: { state: Extract<AgencyState, { kind: "agent" }> }) {
  const { profile } = useAccount();
  const [sum, setSum] = useState<AgencySummary | null>(null);
  useEffect(() => { getAgencySummary().then(setSum, () => setSum(null)); }, []);
  const commission = sum ? agencyCommission(sum.this_week, sum.commission_percent) : null;

  return (
    <>
      <div className="relative -mt-2 flex justify-center">
        <AgencyCrest className="w-44" />
      </div>
      <section className="relative mx-4 -mt-6 rounded-[2rem] border bg-card p-5 shadow-soft">
        <div className="flex items-start gap-4">
          <div className="flex flex-col items-center gap-2">
            <PersonAvatar person={profile ? { auth_id: "", ...profile } : undefined} size="size-20" />
          </div>
          <div className="min-w-0 flex-1 space-y-3 text-end">
            <Stat label="الماس الأسبوعي" value={sum?.this_week ?? null} />
            <Stat label="الماس الأسبوع الماضي" value={sum?.last_week ?? null} />
            <div>
              <p className="text-xs text-muted-foreground">العمولة المتوقعة{sum?.commission_percent != null ? ` (${sum.commission_percent}%)` : ""}</p>
              {commission == null
                ? <p className="mt-0.5 text-xs font-semibold text-muted-foreground">النسبة هتتحدد في سياسة التطبيق</p>
                : <Diamonds value={commission} className="mt-0.5 text-2xl" />}
            </div>
          </div>
        </div>
        <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t pt-3">
          <p className="truncate font-display text-base font-extrabold">{state.agency.name}</p>
          <CodeChip code={state.agency.code} />
        </div>
      </section>

      <div className="mx-4 mt-4 space-y-3">
        <AgencyMenuCard to="/agency/members" icon={<Users className="size-6" />} title="قائمة الأعضاء" hint={`أعضاء الوكالة${sum ? ` (${sum.members})` : ""}`} />
        <AgencyMenuCard to="/agency/requests" icon={<ClipboardList className="size-6" />} title="قائمة الطلبات" hint="طلبات الانضمام للوكالة" count={sum?.pending_requests} />
        <AgencyMenuCard to="/agency/income" icon={<Gem className="size-6" />} title="دخل الأعضاء" hint="عرض دخل جميع الأعضاء" />
        <AgencyMenuCard to="/agency/my-income" icon={<Wallet className="size-6" />} title="تفاصيل دخلي" hint="عرض سجل الدخل السابق" />
      </div>
    </>
  );
}

function Stat({ label, value }: { label: string; value: number | null }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <Diamonds value={value} className="mt-0.5 text-2xl" />
    </div>
  );
}

function HostHome({ state }: { state: Extract<AgencyState, { kind: "host" }> }) {
  return (
    <>
      <div className="relative -mt-2 flex justify-center">
        <AgencyCrest className="w-40" />
      </div>
      <section className="relative mx-4 -mt-6 rounded-[2rem] border bg-card p-5 shadow-soft">
        <p className="flex items-center gap-1.5 text-xs font-semibold text-primary"><BadgeCheck className="size-4" /> إنت مضيف مفعّل في الوكالة</p>
        <p className="mt-2 font-display text-xl font-extrabold">{state.agency.name}</p>
        <div className="mt-2"><CodeChip code={state.agency.code} /></div>
        <div className="mt-4 flex items-center gap-3 border-t pt-3">
          <PersonAvatar person={state.owner} size="size-11" />
          <PersonName person={state.owner} badge={<span className="text-[10px] font-bold text-primary">الوكيل</span>} />
        </div>
        <p className="mt-3 text-xs text-muted-foreground">
          من يوم انضمامك ({new Date(state.joined_at).toLocaleDateString("en-CA")}) كل الهدايا اللي بتوصلك بتتحسب في دخلك ودخل الوكالة.
        </p>
      </section>
      <div className="mx-4 mt-4">
        <AgencyMenuCard to="/agency/my-income" icon={<Wallet className="size-6" />} title="تفاصيل دخلي" hint="عرض سجل الدخل السابق" />
      </div>
    </>
  );
}

function JoinOrApply({ state, reload }: { state: Extract<AgencyState, { kind: "none" }>; reload: () => void }) {
  const [code, setCode] = useState("");
  const [found, setFound] = useState<FoundAgency | null | undefined>(undefined);
  const [busy, setBusy] = useState(false);

  async function search(e: React.FormEvent) {
    e.preventDefault();
    const c = parseAgencyCode(code);
    if (c == null) { toast.error("اكتب كود وكالة صحيح (أرقام بس)"); return; }
    setBusy(true);
    try { setFound(await findAgency(c)); } catch (err) { toast.error(agencyErrorMessage(err)); } finally { setBusy(false); }
  }
  async function join(id: string) {
    setBusy(true);
    try { await requestJoin(id); toast.success("اتبعت طلب الانضمام للوكيل"); setFound(undefined); setCode(""); reload(); }
    catch (err) { toast.error(agencyErrorMessage(err)); } finally { setBusy(false); }
  }
  async function cancel(id: string) {
    setBusy(true);
    try { await cancelJoin(id); toast.success("اتلغى الطلب"); reload(); }
    catch (err) { toast.error(agencyErrorMessage(err)); } finally { setBusy(false); }
  }

  const app = state.application;
  return (
    <>
      <div className="flex justify-center"><AgencyCrest className="w-36" /></div>

      {state.request ? (
        <section className="mx-4 mt-2 rounded-[1.5rem] border bg-card p-5 shadow-soft">
          <p className="text-xs font-semibold text-primary">طلب انضمام مستني رد الوكيل</p>
          <p className="mt-1 font-display text-lg font-extrabold">{state.request.agency?.name ?? "وكالة"}</p>
          {state.request.agency && <p className="text-xs text-muted-foreground" dir="ltr">كود: {state.request.agency.code}</p>}
          <Button variant="outline" disabled={busy} onClick={() => cancel(state.request!.id)} className="mt-3 w-full rounded-full">إلغاء الطلب</Button>
        </section>
      ) : (
        <section className="mx-4 mt-2 rounded-[1.5rem] border bg-card p-5 shadow-soft">
          <h2 className="font-display text-lg font-extrabold">انضم لوكالة كمضيف</h2>
          <p className="mt-1 text-xs text-muted-foreground">اكتب كود الوكالة، وابعت طلب انضمام للوكيل. دخلك يتحسب للوكالة بعد ما يقبلك.</p>
          <form onSubmit={search} className="mt-3 flex gap-2">
            <Input value={code} onChange={(e) => { setCode(e.target.value); setFound(undefined); }} inputMode="numeric" placeholder="كود الوكالة" dir="ltr" className="rounded-full text-center" maxLength={9} />
            <Button type="submit" disabled={busy} className="shrink-0 rounded-full"><Search className="size-4" /> بحث</Button>
          </form>
          {found === null && <p className="mt-3 text-center text-sm text-muted-foreground">مافيش وكالة بالكود ده.</p>}
          {found && (
            <div className="mt-3 flex items-center gap-3 rounded-2xl bg-secondary p-3">
              <PersonAvatar person={found.owner} size="size-12" />
              <div className="min-w-0 flex-1">
                <p className="truncate font-bold">{found.name}</p>
                <p className="text-xs text-muted-foreground">كود {found.code} · {found.members} عضو · الوكيل {found.owner?.display_name ?? "—"}</p>
              </div>
              <Button size="sm" disabled={busy} onClick={() => join(found.id)} className="shrink-0 rounded-full">طلب انضمام</Button>
            </div>
          )}
        </section>
      )}

      <section className="mx-4 mt-3 rounded-[1.5rem] border bg-card p-5 shadow-soft">
        <h2 className="font-display text-lg font-extrabold">عايز تبقى وكيل؟</h2>
        {app?.status === "pending" ? (
          <p className="mt-2 text-sm text-muted-foreground">طلبك لفتح وكالة «{app.agency_name}» وصل للإدارة ومستني المراجعة.</p>
        ) : (
          <>
            {app?.status === "rejected" && (
              <p className="mt-2 rounded-xl bg-destructive/10 px-3 py-2 text-xs text-destructive">
                طلبك الأخير اترفض{app.reject_reason ? `: ${app.reject_reason}` : "."} تقدر تقدّم تاني.
              </p>
            )}
            <p className="mt-1 text-xs text-muted-foreground">قدّم طلب ببياناتك، ولما الإدارة توافق هتاخد كود وكالة تلقائي.</p>
            <Button asChild disabled={!!state.request} className="mt-3 w-full rounded-full">
              <Link to="/agency/apply">قدّم طلب فتح وكالة</Link>
            </Button>
          </>
        )}
      </section>
    </>
  );
}
