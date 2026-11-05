import { createFileRoute } from "@tanstack/react-router";
import {
  Settings, Copy, Gem, Coins, ChevronLeft, Crown, Wallet, Gift, Star,
  Shield, Headphones, Video, Pencil, BadgeCheck, QrCode, TrendingUp,
} from "lucide-react";
import { BottomNav } from "@/components/BottomNav";
import avatar from "@/assets/live2.jpg";

export const Route = createFileRoute("/me")({
  head: () => ({
    meta: [
      { title: "حسابي — Diwan" },
      { name: "description", content: "ملفك الشخصي على Diwan: مستواك، محفظتك، متابعينك وإعداداتك." },
      { property: "og:title", content: "حسابي — Diwan" },
      { property: "og:description", content: "ملفك الشخصي على Diwan." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: MePage,
});

const stats = [
  { label: "متابَعين", value: "248" },
  { label: "متابِعين", value: "12.5K" },
  { label: "زوار", value: "1.8K" },
];

const menu = [
  { icon: Video, label: "بثوثي", hint: "٣٢ بث" },
  { icon: Gift, label: "الهدايا", hint: "" },
  { icon: Crown, label: "VIP", hint: "اشترك" },
  { icon: TrendingUp, label: "المستوى", hint: "Lv.24" },
  { icon: Shield, label: "الخصوصية والأمان", hint: "" },
  { icon: Headphones, label: "المساعدة والدعم", hint: "" },
];

// 2480 من أصل 3000 نقطة للمستوى التالي
const levelProgress = 2480 / 3000;

function MePage() {
  return (
    <div className="min-h-screen bg-muted md:py-8">
      <main className="relative mx-auto min-h-screen max-w-md overflow-hidden bg-background pb-28 md:min-h-[860px] md:rounded-[2.5rem] md:border md:shadow-soft">
        {/* ── الغلاف ── */}
        <div className="relative h-44">
          <div className="absolute inset-0 bg-brand" />
          <div className="absolute inset-0 overflow-hidden" aria-hidden>
            <span className="absolute -top-10 -left-10 size-40 rounded-full bg-primary-foreground/15" />
            <span className="absolute top-16 -right-8 size-28 rounded-full bg-accent/40 blur-2xl" />
            <span className="absolute -bottom-14 right-1/3 size-32 rounded-full bg-primary-foreground/10" />
          </div>

          <div className="absolute top-5 left-5 flex gap-2">
            <button aria-label="رمز QR" className="grid size-10 place-items-center rounded-full bg-overlay text-on-media backdrop-blur transition hover:opacity-80">
              <QrCode className="size-5" />
            </button>
            <button aria-label="الإعدادات" className="grid size-10 place-items-center rounded-full bg-overlay text-on-media backdrop-blur transition hover:opacity-80">
              <Settings className="size-5" />
            </button>
          </div>
        </div>

        {/* ── بطاقة الملف ── */}
        <section className="relative mx-4 -mt-16 rounded-[2rem] border bg-card p-5 shadow-soft">
          <div className="flex items-start gap-4">
            <div className="relative shrink-0">
              <span className="absolute -inset-1 rounded-full bg-gradient-to-tr from-primary to-accent" aria-hidden />
              <img src={avatar} alt="صورتي" className="relative size-20 rounded-full border-[3px] border-card object-cover" />
              <button aria-label="تعديل الصورة" className="absolute bottom-0 left-0 grid size-7 place-items-center rounded-full border-2 border-card bg-secondary text-secondary-foreground transition hover:bg-secondary/80">
                <Pencil className="size-3" />
              </button>
            </div>

            <div className="min-w-0 flex-1 pt-1">
              <h1 className="flex items-center gap-1.5 font-display text-xl font-extrabold">
                <span className="truncate">يوسف الصباح</span>
                <BadgeCheck className="size-5 shrink-0 text-primary" aria-label="حساب موثّق" />
              </h1>
              <button className="mt-1 flex items-center gap-1 rounded-full bg-secondary px-2.5 py-1 text-xs text-muted-foreground transition hover:bg-secondary/70">
                ID: 8820461 <Copy className="size-3" />
              </button>
              <p className="mt-2 text-xs text-muted-foreground">بحب الجيمنج والسهرات الحلوة 🎮✨</p>
            </div>
          </div>

          {/* شريط المستوى */}
          <div className="mt-4">
            <div className="mb-1.5 flex items-center justify-between text-[11px] font-semibold">
              <span className="shrink-0 rounded-full bg-accent px-2 py-0.5 text-accent-foreground">Lv.24</span>
              <span className="min-w-0 flex-1 truncate text-left text-muted-foreground">٢٤٨٠/٣٠٠٠ نقطة</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-secondary">
              <div className="h-full rounded-full bg-brand" style={{ width: `${levelProgress * 100}%` }} />
            </div>
          </div>
        </section>

        {/* ── الإحصائيات ── */}
        <section className="mx-4 mt-3 grid grid-cols-3 rounded-[1.5rem] border bg-card py-4">
          {stats.map((s, i) => (
            <div key={s.label} className={`text-center ${i ? "border-r" : ""}`}>
              <p className="font-display text-lg font-bold">{s.value}</p>
              <p className="mt-0.5 text-[11px] text-muted-foreground">{s.label}</p>
            </div>
          ))}
        </section>

        {/* ── المحفظة ── */}
        <section className="mx-4 mt-3 grid grid-cols-2 gap-3">
          <div className="relative overflow-hidden rounded-[1.5rem] bg-card p-4 ring-1 ring-border">
            <div className="flex items-center gap-2">
              <span className="grid size-9 place-items-center rounded-xl bg-primary/10">
                <Gem className="size-5 text-primary" />
              </span>
              <span className="text-xs font-semibold text-muted-foreground">ماسات</span>
            </div>
            <p className="mt-2 font-display text-2xl font-extrabold tracking-tight">4,320</p>
          </div>
          <div className="relative overflow-hidden rounded-[1.5rem] bg-card p-4 ring-1 ring-border">
            <div className="flex items-center gap-2">
              <span className="grid size-9 place-items-center rounded-xl bg-accent/15">
                <Coins className="size-5 text-accent-foreground" />
              </span>
              <span className="text-xs font-semibold text-muted-foreground">عملات</span>
            </div>
            <p className="mt-2 font-display text-2xl font-extrabold tracking-tight">18,900</p>
          </div>
        </section>

        <button className="mx-4 mt-3 flex w-[calc(100%-2rem)] items-center justify-center gap-2 rounded-full bg-brand py-3.5 font-bold text-primary-foreground shadow-soft transition active:scale-[0.98]">
          <Wallet className="size-5" /> شحن المحفظة
        </button>

        {/* ── بانر VIP ── */}
        <button className="mx-4 mt-4 flex w-[calc(100%-2rem)] items-center gap-3 overflow-hidden rounded-[1.5rem] bg-brand p-4 text-start text-primary-foreground shadow-soft transition active:scale-[0.98]">
          <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-primary-foreground/20">
            <Crown className="size-6" />
          </span>
          <span className="flex-1">
            <span className="block font-display font-extrabold">انضم لنادي VIP</span>
            <span className="block text-xs opacity-90">شارات حصرية، هدايا وخصومات خاصة</span>
          </span>
          <ChevronLeft className="size-5 shrink-0" />
        </button>

        {/* ── القائمة ── */}
        <ul className="mx-4 mt-4 overflow-hidden rounded-[1.5rem] border bg-card">
          {menu.map((m, i) => (
            <li key={m.label}>
              <button className={`flex w-full items-center gap-3 px-4 py-3.5 text-start transition hover:bg-secondary ${i ? "border-t" : ""}`}>
                <span className="grid size-9 place-items-center rounded-xl bg-secondary">
                  <m.icon className="size-[18px] text-foreground" />
                </span>
                <span className="flex-1 text-sm font-semibold">{m.label}</span>
                {m.hint && <span className="text-xs text-muted-foreground">{m.hint}</span>}
                <ChevronLeft className="size-4 text-muted-foreground" />
              </button>
            </li>
          ))}
        </ul>

        <p className="mt-5 text-center text-[11px] text-muted-foreground">Diwan — الإصدار 1.0.0</p>

        <BottomNav />
      </main>
    </div>
  );
}
