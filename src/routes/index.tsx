import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Bell, Search, Video } from "lucide-react";
import { AppScreen } from "@/components/AppScreen";
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
    <AppScreen>
        <header className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 px-5 pt-6">
          <div className="min-w-0">
            <p className="text-sm text-muted-foreground">أهلاً بك</p>
            <h1 className="font-display text-3xl font-extrabold">voli<span className="text-primary">.</span></h1>
          </div>
          <div className="flex shrink-0 gap-2">
            <Button asChild variant="secondary" size="icon" aria-label="البحث" className="size-11 rounded-full">
              <Link to="/search"><Search /></Link>
            </Button>
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
    </AppScreen>
  );
}
