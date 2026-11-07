import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import { Empty, PageTitle, Panel, Person } from "@/components/admin/AdminShell";
import { Confirm, parseWhole, Pill, useAction, useLoad } from "@/components/admin/admin-ui";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import {
  ACTION_LABELS, banMember, changeCoins, describeAction, editProfile, fmt, fmtDate, fmtDay, getMember, grantVip,
  revokeVip, setRole, setSpecialId, unbanMember, useAdminSession, type AdminMember,
} from "@/lib/admin";
import { activeVipLevel, VIP_TIERS } from "@/lib/vip";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/member/$authId")({
  head: () => ({
    meta: [
      { title: "ملف عضو — إدارة voli" },
      { name: "description", content: "إدارة عضو على voli: كوينز، VIP، آيدي مميز، صلاحيات وحظر." },
      { property: "og:title", content: "ملف عضو — إدارة voli" },
      { property: "og:description", content: "إدارة عضو على voli." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: MemberPage,
});

function MemberPage() {
  const { authId } = Route.useParams();
  const { data, failed, reload } = useLoad(() => getMember(authId), [authId]);

  return (
    <>
      <Link to="/admin/members" className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowRight className="size-4" /> كل الأعضاء
      </Link>
      {failed ? <Empty>ماقدرناش نحمّل العضو ده.</Empty> : !data ? <Empty>…</Empty> : <MemberView m={data} reload={reload} />}
    </>
  );
}

function MemberView({ m, reload }: { m: AdminMember; reload: () => void }) {
  const p = m.profile;
  const vip = activeVipLevel(p);
  return (
    <>
      <PageTitle
        title={p.display_name}
        actions={
          <div className="flex flex-wrap gap-1">
            {m.ban && <Pill tone="danger">محظور</Pill>}
            {m.roles.includes("admin") && <Pill tone="primary">إدارة عليا</Pill>}
            {m.roles.includes("moderator") && <Pill tone="primary">مشرف</Pill>}
            {vip > 0 && <Pill tone="gold">VIP {vip}</Pill>}
          </div>
        }
      />
      <div className="grid gap-4 lg:grid-cols-3">
        <Panel className="lg:col-span-1">
          <Person name={p.display_name} avatar={p.avatar_url} publicId={p.public_id} />
          <dl className="mt-4 space-y-2 text-sm">
            <Row k="الآيدي">{p.public_id}</Row>
            <Row k="الآيدي المميز">{p.special_id ?? "—"}</Row>
            <Row k="الإيميل">{m.email ?? "—"}</Row>
            <Row k="اشترك">{fmtDay(p.created_at)}</Row>
            <Row k="الكوينز">{fmt(p.coins)}</Row>
            <Row k="الكاريزما">{fmt(p.charisma_points)}</Row>
            <Row k="الثروة">{fmt(p.wealth_points)}</Row>
            <Row k="هدايا بعتها">{fmt(m.gifts_sent)}</Row>
            <Row k="هدايا وصلته">{fmt(m.gifts_received)}</Row>
            <Row k="VIP">{vip > 0 ? `${vip} — ${p.vip_expires_at ? `لحد ${fmtDay(p.vip_expires_at)}` : "دائم"}` : "—"}</Row>
            <Row k="الروم">{m.room ? `${m.room.name}${m.room.is_live ? " (شغالة)" : ""}` : "—"}</Row>
            <Row k="الوكالة">
              {m.agency_owned ? `وكيل: ${m.agency_owned.name} (${m.agency_owned.code})`
                : m.agency_member ? `مضيف في ${m.agency_member.name} (${m.agency_member.code})` : "—"}
            </Row>
          </dl>
          {p.bio && <p className="mt-3 rounded-xl bg-secondary/50 p-3 text-xs text-muted-foreground">{p.bio}</p>}
        </Panel>

        <div className="space-y-4 lg:col-span-2">
          <BanPanel m={m} reload={reload} />
          <div className="grid gap-4 md:grid-cols-2">
            <CoinsPanel m={m} reload={reload} />
            <SpecialIdPanel m={m} reload={reload} />
          </div>
          <VipPanel m={m} reload={reload} />
          <div className="grid gap-4 md:grid-cols-2">
            <RolesPanel m={m} reload={reload} />
            <ProfilePanel m={m} reload={reload} />
          </div>
          <Panel title="سجل الإدارة على العضو ده">
            {m.actions.length === 0 ? <p className="text-sm text-muted-foreground">مافيش حاجة لسه.</p> : (
              <ul className="divide-y divide-border/60 text-sm">
                {m.actions.map((a, i) => (
                  <li key={i} className="flex flex-wrap items-center justify-between gap-2 py-2">
                    <span><span className="font-semibold">{ACTION_LABELS[a.action] ?? a.action}</span> <span className="text-muted-foreground">{describeAction(a.action, a.details)}</span></span>
                    <span className="text-xs text-muted-foreground">{a.admin_name ?? "—"} · {fmtDate(a.created_at)}</span>
                  </li>
                ))}
              </ul>
            )}
          </Panel>
        </div>
      </div>
    </>
  );
}

function Row({ k, children }: { k: string; children: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <dt className="text-muted-foreground">{k}</dt>
      <dd className="truncate font-semibold" dir="auto">{children}</dd>
    </div>
  );
}

type PanelProps = { m: AdminMember; reload: () => void };

const BAN_LENGTHS = [
  { v: "1", label: "يوم" }, { v: "3", label: "3 أيام" }, { v: "7", label: "أسبوع" }, { v: "30", label: "شهر" }, { v: "forever", label: "نهائي" },
];

function BanPanel({ m, reload }: PanelProps) {
  const { busy, run } = useAction();
  const [length, setLength] = useState("7");
  const [reason, setReason] = useState("");
  const isAdmin = m.roles.includes("admin");

  if (m.ban) {
    return (
      <Panel title="الحظر" className="border-destructive/40">
        <p className="text-sm">
          محظور {m.ban.until ? `لحد ${fmtDate(m.ban.until)}` : "نهائياً"}{m.ban.reason ? ` — ${m.ban.reason}` : ""}
        </p>
        <Button className="mt-3" variant="secondary" disabled={busy}
          onClick={() => run(() => unbanMember(m.profile.auth_id), "اتفك الحظر", reload)}>فك الحظر</Button>
      </Panel>
    );
  }
  return (
    <Panel title="الحظر">
      {isAdmin ? <p className="text-sm text-muted-foreground">ماينفعش تحظر حد من الإدارة العليا.</p> : (
        <div className="flex flex-col gap-2 md:flex-row">
          <Select value={length} onValueChange={setLength}>
            <SelectTrigger className="md:w-36"><SelectValue /></SelectTrigger>
            <SelectContent>{BAN_LENGTHS.map((b) => <SelectItem key={b.v} value={b.v}>{b.label}</SelectItem>)}</SelectContent>
          </Select>
          <Input value={reason} onChange={(e) => setReason(e.target.value)} maxLength={200} placeholder="السبب (اختياري)" className="flex-1" />
          <Confirm
            destructive
            title={`حظر ${m.profile.display_name}؟`}
            body="هيتقفل دخوله للتطبيق، ويخرج من كل الرومات، والروم بتاعته تتقفل لو شغالة."
            confirm="احظر"
            onConfirm={() => run(async () => {
              const blocked = await banMember(m.profile.auth_id, length === "forever" ? null : Number(length), reason.trim());
              if (!blocked) toast.warning("الحظر اتسجل، بس تسجيل الدخول نفسه ماتقفلش. التطبيق هيمنعه برضه.");
            }, "اتحظر العضو", () => { setReason(""); reload(); })}
            trigger={<Button variant="destructive" disabled={busy}>احظر</Button>}
          />
        </div>
      )}
    </Panel>
  );
}

function CoinsPanel({ m, reload }: PanelProps) {
  const { busy, run } = useAction();
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const n = parseWhole(amount);
  const valid = n != null && n > 0;
  const go = (sign: 1 | -1) => run(() => changeCoins(m.profile.auth_id, sign * (n ?? 0), note.trim()),
    sign > 0 ? "اتضافت الكوينز" : "اتشالت الكوينز", () => { setAmount(""); setNote(""); reload(); });
  return (
    <Panel title={`الكوينز — الرصيد ${fmt(m.profile.coins)}`}>
      <div className="space-y-2">
        <Input value={amount} onChange={(e) => setAmount(e.target.value)} inputMode="numeric" dir="ltr" placeholder="الكمية" />
        <Input value={note} onChange={(e) => setNote(e.target.value)} maxLength={200} placeholder="ملاحظة (اختياري)" />
        <div className="flex gap-2">
          <Button className="flex-1" disabled={busy || !valid} onClick={() => go(1)}>شحن</Button>
          <Confirm
            title="سحب كوينز؟" body={`هيتشال ${fmt(n)} من رصيد العضو.`} confirm="اسحب" destructive
            onConfirm={() => go(-1)}
            trigger={<Button className="flex-1" variant="secondary" disabled={busy || !valid}>سحب</Button>}
          />
        </div>
      </div>
    </Panel>
  );
}

function SpecialIdPanel({ m, reload }: PanelProps) {
  const { busy, run } = useAction();
  const [value, setValue] = useState(m.profile.special_id ?? "");
  useEffect(() => setValue(m.profile.special_id ?? ""), [m.profile.special_id]);
  return (
    <Panel title="الآيدي المميز">
      <div className="space-y-2">
        <Input value={value} onChange={(e) => setValue(e.target.value.replace(/\D/g, "").slice(0, 10))} inputMode="numeric" dir="ltr" placeholder="مثلاً 777" />
        <div className="flex gap-2">
          <Button className="flex-1" disabled={busy || !value || value === m.profile.special_id}
            onClick={() => run(() => setSpecialId(m.profile.auth_id, value), "اتحفظ الآيدي المميز", reload)}>حفظ</Button>
          <Button className="flex-1" variant="secondary" disabled={busy || !m.profile.special_id}
            onClick={() => run(() => setSpecialId(m.profile.auth_id, null), "اتشال الآيدي المميز", reload)}>شيله</Button>
        </div>
      </div>
    </Panel>
  );
}

const SOURCES = [{ v: "admin", label: "منحة إدارة" }, { v: "gift", label: "هدية" }, { v: "event", label: "فعالية" }] as const;

function VipPanel({ m, reload }: PanelProps) {
  const { busy, run } = useAction();
  const [level, setLevel] = useState("1");
  const [days, setDays] = useState("30");
  const [source, setSource] = useState<"admin" | "gift" | "event">("admin");
  const [note, setNote] = useState("");
  const d = days.trim() === "" ? null : parseWhole(days);
  const valid = days.trim() === "" || (d != null && d > 0);
  const now = Date.now();
  return (
    <Panel title="VIP">
      <div className="grid gap-2 md:grid-cols-4">
        <Select value={level} onValueChange={setLevel}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>{VIP_TIERS.map((t) => <SelectItem key={t.level} value={String(t.level)}>VIP {t.level} — {t.nameAr}</SelectItem>)}</SelectContent>
        </Select>
        <Input value={days} onChange={(e) => setDays(e.target.value)} inputMode="numeric" dir="ltr" placeholder="أيام (فاضي = دائم)" />
        <Select value={source} onValueChange={(v) => setSource(v as typeof source)}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>{SOURCES.map((s) => <SelectItem key={s.v} value={s.v}>{s.label}</SelectItem>)}</SelectContent>
        </Select>
        <Input value={note} onChange={(e) => setNote(e.target.value)} maxLength={200} placeholder="ملاحظة" />
      </div>
      <div className="mt-2 flex flex-wrap gap-2">
        <Button disabled={busy || !valid}
          onClick={() => run(() => grantVip(m.profile.auth_id, Number(level), d, source, note.trim()), "اتمنح VIP", () => { setNote(""); reload(); })}>
          امنح VIP {level} {d ? `لمدة ${d} يوم` : "دائم"}
        </Button>
        <Confirm
          destructive title="سحب كل الـ VIP؟" body="كل منح وشراء VIP الشغالة للعضو هتخلص دلوقتي." confirm="اسحب"
          onConfirm={() => run(() => revokeVip(m.profile.auth_id), "اتسحب الـ VIP", reload)}
          trigger={<Button variant="secondary" disabled={busy}>سحب كل الـ VIP</Button>}
        />
      </div>
      {m.vip_grants.length > 0 && (
        <ul className="mt-4 divide-y divide-border/60 text-sm">
          {m.vip_grants.map((g) => {
            const live = new Date(g.starts_at).getTime() <= now && (!g.expires_at || new Date(g.expires_at).getTime() > now);
            return (
              <li key={g.id} className="flex flex-wrap items-center justify-between gap-2 py-2">
                <span className="flex items-center gap-2">
                  <Pill tone={live ? "gold" : "muted"}>VIP {g.level}</Pill>
                  <span className="text-muted-foreground">{({ purchase: "شراء", admin: "منحة إدارة", gift: "هدية", event: "فعالية" } as Record<string, string>)[g.source] ?? g.source}</span>
                  {g.note && <span className="text-xs text-muted-foreground">— {g.note}</span>}
                </span>
                <span className="text-xs text-muted-foreground">{fmtDay(g.starts_at)} ← {g.expires_at ? fmtDay(g.expires_at) : "دائم"}</span>
              </li>
            );
          })}
        </ul>
      )}
    </Panel>
  );
}

function RolesPanel({ m, reload }: PanelProps) {
  const { busy, run } = useAction();
  const { session } = useAdminSession();
  const self = session?.user.id === m.profile.auth_id;
  const toggle = (role: "admin" | "moderator", on: boolean) =>
    run(() => setRole(m.profile.auth_id, role, on), on ? "اتضافت الصلاحية" : "اتشالت الصلاحية", reload);
  return (
    <Panel title="الصلاحيات">
      <div className="space-y-3 text-sm">
        <label className="flex items-center justify-between gap-3">
          <span>مشرف <span className="text-xs text-muted-foreground">(كتم وطرد في الرومات)</span></span>
          <Switch checked={m.roles.includes("moderator")} disabled={busy} onCheckedChange={(v) => toggle("moderator", v)} />
        </label>
        <label className="flex items-center justify-between gap-3">
          <span>إدارة عليا <span className="text-xs text-muted-foreground">(تفتح لوحة الإدارة)</span></span>
          {m.roles.includes("admin") ? (
            <Confirm
              destructive title="شيل الإدارة العليا؟" body="مش هيقدر يفتح لوحة الإدارة تاني." confirm="شيل"
              onConfirm={() => toggle("admin", false)}
              trigger={<Switch checked disabled={busy || self} />}
            />
          ) : (
            <Confirm
              title="إدارة عليا؟" body="هيقدر يعمل كل حاجة في لوحة الإدارة، زيك بالظبط." confirm="أيوه"
              onConfirm={() => toggle("admin", true)}
              trigger={<Switch checked={false} disabled={busy} />}
            />
          )}
        </label>
      </div>
    </Panel>
  );
}

function ProfilePanel({ m, reload }: PanelProps) {
  const { busy, run } = useAction();
  const [name, setName] = useState(m.profile.display_name);
  useEffect(() => setName(m.profile.display_name), [m.profile.display_name]);
  const id = m.profile.auth_id;
  return (
    <Panel title="بيانات العضو">
      <div className="space-y-2">
        <div className="flex gap-2">
          <Input value={name} onChange={(e) => setName(e.target.value)} maxLength={60} />
          <Button disabled={busy || !name.trim() || name.trim() === m.profile.display_name}
            onClick={() => run(() => editProfile(id, { name: name.trim() }), "اتغير الاسم", reload)}>حفظ</Button>
        </div>
        <div className="flex gap-2">
          <Button className="flex-1" variant="secondary" disabled={busy || !m.profile.avatar_url}
            onClick={() => run(() => editProfile(id, { clearAvatar: true }), "اتشالت الصورة", reload)}>شيل الصورة</Button>
          <Button className="flex-1" variant="secondary" disabled={busy || !m.profile.bio}
            onClick={() => run(() => editProfile(id, { clearBio: true }), "اتشالت النبذة", reload)}>شيل النبذة</Button>
        </div>
      </div>
    </Panel>
  );
}
