import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Bell, Search, Eye,  Flame, Megaphone } from "lucide-react";
import { BottomNav } from "@/components/BottomNav";
import live1 from "@/assets/live1.jpg";
import live2 from "@/assets/live2.jpg";
import live3 from "@/assets/live3.jpg";
import live4 from "@/assets/live4.jpg";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Diwan — بثوث مباشرة ترفيهية" },
      { name: "description", content: "تابع أحلى البثوث المباشرة: غناء، ألعاب، دردشة وحفلات DJ لحظة بلحظة." },
      { property: "og:title", content: "Diwan — بثوث مباشرة ترفيهية" },
      { property: "og:description", content: "تابع أحلى البثوث المباشرة لحظة بلحظة." },
    ],
  }),
  component: Index,
});

const categories = ["الكل", "غناء", "ألعاب", "دردشة", "DJ", "كوميديا", "رقص"];
const stories = [
  { name: "سارة", img: live1 }, { name: "عمر", img: live2 }, { name: "ليلى", img: live3 },
  { name: "كريم", img: live4 }, { name: "نور", img: live3 }, { name: "يوسف", img: live2 },
];
const lives = [
  { name: "سارة ستار", title: "سهرة أغاني 🎤", viewers: "12.4K", img: live1, cat: "غناء" },
  { name: "عمر جيمر", title: "تحدي ببجي 🔥", viewers: "8.1K", img: live2, cat: "ألعاب" },
  { name: "ليلى", title: "دردشة الصبح ☀️", viewers: "3.2K", img: live3, cat: "دردشة" },
  { name: "DJ كريم", title: "بارتي الخميس 🎧", viewers: "21K", img: live4, cat: "DJ" },
];

function Index() {
  const [cat, setCat] = useState("الكل");
  const shown = cat === "الكل" ? lives : lives.filter((l) => l.cat === cat);

  return (
    <div className="min-h-screen bg-muted md:py-8">
      <main className="relative mx-auto min-h-screen max-w-md bg-background pb-28 md:min-h-[860px] md:rounded-[2.5rem] md:border md:shadow-soft md:overflow-hidden">
        <header className="flex items-center justify-between px-5 pt-6">
          <div>
            <p className="text-sm text-muted-foreground">أهلاً يوسف 👋</p>
            <h1 className="font-display text-3xl font-extrabold tracking-tight">
              Diwan<span className="text-primary">.</span>
            </h1>
          </div>
          <div className="flex gap-2">
            <IconBtn><Search className="size-5" /></IconBtn>
            <IconBtn dot><Bell className="size-5" /></IconBtn>
          </div>
        </header>

        <section className="no-scrollbar mt-5 flex gap-4 overflow-x-auto px-5">
          {stories.map((s, i) => (
            <button key={i} className="flex shrink-0 flex-col items-center gap-1.5">
              <span className="rounded-full bg-brand p-[2.5px]">
                <img src={s.img} alt={s.name} loading="lazy" className="size-16 rounded-full border-[3px] border-background object-cover" />
              </span>
              <span className="text-xs font-semibold">{s.name}</span>
            </button>
          ))}
        </section>

        <BannerCarousel />

        <nav className="no-scrollbar mt-6 flex gap-2 overflow-x-auto px-5">
          {categories.map((c) => (
            <button key={c} onClick={() => setCat(c)}
              className={`shrink-0 rounded-full px-4 py-2 text-sm font-semibold transition ${c === cat ? "bg-foreground text-background" : "bg-secondary text-secondary-foreground hover:bg-border"}`}>
              {c}
            </button>
          ))}
        </nav>

        <div className="mt-6 flex items-center justify-between px-5">
          <h3 className="flex items-center gap-1.5 font-display text-lg font-bold"><Flame className="size-5 text-primary" /> مباشر الآن</h3>
          <button className="text-sm font-semibold text-primary">عرض الكل</button>
        </div>

        <section className="mt-3 grid grid-cols-2 gap-3 px-5">
          {shown.map((l) => (
            <article key={l.name} className="group relative overflow-hidden rounded-3xl">
              <img src={l.img} alt={l.name} loading="lazy" width={768} height={1024} className="aspect-[3/4] w-full object-cover transition duration-500 group-hover:scale-105" />
              <div className="absolute inset-0 bg-media-fade" />
              <LiveBadge className="absolute top-2.5 right-2.5" />
              <span className="absolute top-2.5 left-2.5 flex items-center gap-1 rounded-full bg-overlay px-2 py-1 text-[11px] font-semibold text-on-media backdrop-blur">
                <Eye className="size-3" />{l.viewers}
              </span>
              <div className="absolute bottom-3 right-3 left-3 text-on-media">
                <p className="text-sm font-bold leading-tight">{l.title}</p>
                <p className="text-xs opacity-80">{l.name}</p>
              </div>
            </article>
          ))}
        </section>

        <BottomNav />
      </main>
    </div>
  );
}

function LiveBadge({ className = "" }: { className?: string }) {
  return (
    <span className={`flex items-center gap-1 rounded-full bg-live px-2 py-0.5 text-[11px] font-bold text-on-media ${className}`}>
      <span className="size-1.5 rounded-full bg-on-media animate-live" /> مباشر
    </span>
  );
}

function IconBtn({ children, dot }: { children: React.ReactNode; dot?: boolean }) {
  return (
    <button className="relative grid size-11 place-items-center rounded-full bg-secondary">
      {children}
      {dot && <span className="absolute top-2.5 right-2.5 size-2 rounded-full bg-primary ring-2 ring-secondary" />}
    </button>
  );
}


const banners = [
  { img: live4, tag: "حدث رسمي", title: "مهرجان الخميس الكبير", sub: "جوائز وهدايا لأقوى المضيفين" },
  { img: live1, tag: "مسابقة", title: "نجم الغناء ٢٠٢٦", sub: "سجّل دلوقتي وابدأ بثك" },
  { img: live2, tag: "بطولة", title: "بطولة الجيمرز الشهرية", sub: "جائزة ١٠٠ ألف ماسة" },
];

function BannerCarousel() {
  const [i, setI] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setI((v) => (v + 1) % banners.length), 4000);
    return () => clearInterval(t);
  }, []);
  return (
    <section className="mx-5 mt-6">
      <div className="relative h-44 overflow-hidden rounded-3xl shadow-soft">
        {banners.map((b, idx) => (
          <div key={idx} className={`absolute inset-0 transition-opacity duration-700 ${idx === i ? "opacity-100" : "opacity-0 pointer-events-none"}`}>
            <img src={b.img} alt={b.title} width={768} height={1024} className="h-full w-full object-cover" />
            <div className="absolute inset-0 bg-media-fade" />
            <span className="absolute top-3 right-3 flex items-center gap-1 rounded-full bg-brand px-2.5 py-1 text-[11px] font-bold text-primary-foreground">
              <Megaphone className="size-3" /> {b.tag}
            </span>
            <div className="absolute bottom-4 right-4 left-4 text-on-media">
              <h2 className="font-display text-xl font-bold leading-tight">{b.title}</h2>
              <p className="text-xs opacity-85">{b.sub}</p>
            </div>
          </div>
        ))}
      </div>
      <div className="mt-2.5 flex justify-center gap-1.5">
        {banners.map((_, idx) => (
          <button key={idx} aria-label={`بانر ${idx + 1}`} onClick={() => setI(idx)}
            className={`h-1.5 rounded-full transition-all ${idx === i ? "w-6 bg-primary" : "w-1.5 bg-border"}`} />
        ))}
      </div>
    </section>
  );
}
