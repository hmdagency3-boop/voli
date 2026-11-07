import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Empty, PageTitle, Panel } from "@/components/admin/AdminShell";
import { parseWhole, Pill, useAction, useLoad } from "@/components/admin/admin-ui";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { fmt, getGifts, getVipPrices, updateGift, updateVipPrice, type AdminGift, type VipTierPrice } from "@/lib/admin";
import { GIFT_ART } from "@/lib/gifts";

export const Route = createFileRoute("/admin/gifts")({
  head: () => ({
    meta: [
      { title: "الهدايا والأسعار — إدارة voli" },
      { name: "description", content: "أسعار الهدايا وباقات VIP على voli." },
      { property: "og:title", content: "الهدايا والأسعار — إدارة voli" },
      { property: "og:description", content: "أسعار الهدايا وباقات VIP على voli." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: GiftsPage,
});

function GiftsPage() {
  return (
    <>
      <PageTitle title="الهدايا والأسعار" hint="أي تغيير بيظهر للأعضاء على طول" />
      <Tabs defaultValue="gifts" dir="rtl">
        <TabsList className="mb-4 rounded-full">
          <TabsTrigger value="gifts" className="rounded-full">الهدايا</TabsTrigger>
          <TabsTrigger value="vip" className="rounded-full">أسعار VIP</TabsTrigger>
        </TabsList>
        <TabsContent value="gifts"><GiftsList /></TabsContent>
        <TabsContent value="vip"><VipPrices /></TabsContent>
      </Tabs>
    </>
  );
}

function GiftsList() {
  const { data, failed, reload } = useLoad(getGifts, []);
  if (failed) return <Empty>ماقدرناش نحمّل الهدايا.</Empty>;
  if (!data) return <Empty>…</Empty>;
  return <div className="grid gap-3 md:grid-cols-2">{data.map((g) => <GiftRow key={g.key} gift={g} reload={reload} />)}</div>;
}

function GiftRow({ gift, reload }: { gift: AdminGift; reload: () => void }) {
  const { busy, run } = useAction();
  const [name, setName] = useState(gift.name);
  const [price, setPrice] = useState(String(gift.price));
  const [sort, setSort] = useState(String(gift.sort));
  const [active, setActive] = useState(gift.active);
  useEffect(() => { setName(gift.name); setPrice(String(gift.price)); setSort(String(gift.sort)); setActive(gift.active); }, [gift]);
  const p = parseWhole(price), s = parseWhole(sort);
  const changed = name !== gift.name || p !== gift.price || s !== gift.sort || active !== gift.active;
  const valid = name.trim().length > 0 && p != null && p > 0 && s != null;
  const art = GIFT_ART[gift.key];
  return (
    <Panel>
      <div className="flex items-start gap-3">
        {art ? <img src={art} alt="" className="size-14 shrink-0 object-contain" /> : <span className="grid size-14 shrink-0 place-items-center rounded-xl bg-secondary text-xs">?</span>}
        <div className="min-w-0 flex-1 space-y-2">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs text-muted-foreground" dir="ltr">{gift.key}</span>
            <div className="flex items-center gap-2">
              {!art && <Pill tone="danger">مالهاش صورة</Pill>}
              <label className="flex items-center gap-2 text-xs">ظاهرة <Switch checked={active} onCheckedChange={setActive} /></label>
            </div>
          </div>
          <Input value={name} onChange={(e) => setName(e.target.value)} maxLength={40} />
          <div className="grid grid-cols-2 gap-2">
            <label className="text-xs text-muted-foreground">السعر<Input value={price} onChange={(e) => setPrice(e.target.value)} inputMode="numeric" dir="ltr" className="mt-1" /></label>
            <label className="text-xs text-muted-foreground">الترتيب<Input value={sort} onChange={(e) => setSort(e.target.value)} inputMode="numeric" dir="ltr" className="mt-1" /></label>
          </div>
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs text-muted-foreground">اتبعتت {fmt(gift.sent_count)} مرة · {fmt(gift.sent_value)} كوينز</span>
            <Button size="sm" disabled={busy || !changed || !valid}
              onClick={() => run(() => updateGift({ key: gift.key, name: name.trim(), price: p ?? 0, sort: s ?? 0, active }), "اتحفظت الهدية", reload)}>حفظ</Button>
          </div>
        </div>
      </div>
    </Panel>
  );
}

function VipPrices() {
  const { data, failed, reload } = useLoad(getVipPrices, []);
  if (failed) return <Empty>ماقدرناش نحمّل باقات VIP.</Empty>;
  if (!data) return <Empty>…</Empty>;
  return <div className="space-y-3">{data.map((t) => <VipRow key={t.level} tier={t} reload={reload} />)}</div>;
}

function VipRow({ tier, reload }: { tier: VipTierPrice; reload: () => void }) {
  const { busy, run } = useAction();
  const [price, setPrice] = useState(tier.price_coins == null ? "" : String(tier.price_coins));
  const [days, setDays] = useState(String(tier.duration_days));
  const [salary, setSalary] = useState(tier.monthly_salary_coins == null ? "" : String(tier.monthly_salary_coins));
  const p = price.trim() === "" ? null : parseWhole(price);
  const d = parseWhole(days);
  const s = salary.trim() === "" ? null : parseWhole(salary);
  const valid = (price.trim() === "" || (p != null && p > 0)) && d != null && d > 0 && (salary.trim() === "" || (s != null && s > 0));
  const changed = p !== tier.price_coins || d !== tier.duration_days || s !== tier.monthly_salary_coins;
  return (
    <Panel>
      <div className="grid items-end gap-3 md:grid-cols-[1fr_repeat(3,10rem)_auto]">
        <div>
          <p className="font-bold">VIP {tier.level}</p>
          <p className="text-xs text-muted-foreground">{tier.name_ar}{tier.price_coins == null && " · مش للبيع"}</p>
        </div>
        <label className="text-xs text-muted-foreground">السعر بالكوينز<Input value={price} onChange={(e) => setPrice(e.target.value)} placeholder="فاضي = مش للبيع" inputMode="numeric" dir="ltr" className="mt-1" /></label>
        <label className="text-xs text-muted-foreground">المدة بالأيام<Input value={days} onChange={(e) => setDays(e.target.value)} inputMode="numeric" dir="ltr" className="mt-1" /></label>
        <label className="text-xs text-muted-foreground">راتب شهري<Input value={salary} onChange={(e) => setSalary(e.target.value)} placeholder="فاضي = مفيش" inputMode="numeric" dir="ltr" className="mt-1" /></label>
        <Button disabled={busy || !changed || !valid}
          onClick={() => run(() => updateVipPrice({ ...tier, price_coins: p, duration_days: d ?? 30, monthly_salary_coins: s }), "اتحفظ السعر", reload)}>حفظ</Button>
      </div>
    </Panel>
  );
}
