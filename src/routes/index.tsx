import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Bell, Search, Video } from "lucide-react";
import { BottomNav } from "@/components/BottomNav";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "voli — بثوث مباشرة ترفيهية" },
      { name: "description", content: "تابع البثوث المباشرة على voli." },
      { property: "og:title", content: "voli — بثوث مباشرة ترفيهية" },
      { property: "og:description", content: "تابع البثوث المباشرة على voli." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Index,
});

const categories = ["الكل", "غناء", "ألعاب", "دردشة", "DJ", "كوميديا", "رقص"];

function Index() {
  const [category, setCategory] = useState("الكل");
  return (
    <div className="min-h-screen bg-muted md:py-8">
      <main className="relative mx-auto min-h-screen max-w-md bg-background pb-28 md:min-h-[860px] md:rounded-[2.5rem] md:border md:shadow-soft md:overflow-hidden">
        <header className="flex items-center justify-between px-5 pt-6">
          <div>
            <p className="text-sm text-muted-foreground">أهلاً بك</p>
            <h1 className="font-display text-3xl font-extrabold">voli<span className="text-primary">.</span></h1>
          </div>
          <div className="flex gap-2">
            <Button variant="secondary" size="icon" disabled aria-label="البحث" className="size-11 rounded-full"><Search /></Button>
            <Button variant="secondary" size="icon" disabled aria-label="الإشعارات" className="size-11 rounded-full"><Bell /></Button>
          </div>
        </header>
        <nav aria-label="تصنيفات البث" className="no-scrollbar mt-6 flex gap-2 overflow-x-auto px-5">
          {categories.map((item) => (
            <Button key={item} variant={item === category ? "default" : "secondary"} aria-pressed={item === category} onClick={() => setCategory(item)} className="shrink-0 rounded-full">{item}</Button>
          ))}
        </nav>
        <section className="mt-6 px-5">
          <h2 className="font-display text-lg font-bold">مباشر الآن</h2>
          <div role="status" className="flex min-h-72 flex-col items-center justify-center gap-4 text-muted-foreground">
            <Video className="size-12 text-primary" aria-hidden="true" />
            <p className="text-sm">لا توجد بثوث مباشرة حالياً</p>
          </div>
        </section>
        <BottomNav />
      </main>
    </div>
  );
}
