import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Search, SquarePen, MessageCircle } from "lucide-react";
import { AppScreen } from "@/components/AppScreen";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/chat")({
  head: () => ({
    meta: [
      { title: "الدردشات — voli" },
      { name: "description", content: "رسائلك ومحادثاتك على voli." },
      { property: "og:title", content: "الدردشات — voli" },
      { property: "og:description", content: "رسائلك ومحادثاتك على voli." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ChatPage,
});

const tabs = ["الكل", "غير مقروءة", "الأصدقاء"];

function ChatPage() {
  const [tab, setTab] = useState("الكل");
  return (
    <AppScreen>
        <header className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 px-5 pt-6">
          <h1 className="font-display text-3xl font-extrabold">دردشة<span className="text-primary">.</span></h1>
          <Button disabled aria-label="رسالة جديدة" size="icon" className="size-11 rounded-full"><SquarePen /></Button>
        </header>
        <div className="mx-5 mt-5 flex items-center gap-2 rounded-full bg-secondary px-4 py-3">
          <Search className="size-4 text-muted-foreground" />
          <input aria-label="البحث في المحادثات" placeholder="البحث في المحادثات" className="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground" />
        </div>
        <nav aria-label="تصفية المحادثات" className="mt-5 flex gap-2 px-5">
          {tabs.map((item) => (
            <Button key={item} variant={item === tab ? "default" : "secondary"} aria-pressed={item === tab} onClick={() => setTab(item)} className="rounded-full">{item}</Button>
          ))}
        </nav>
        <div role="status" className="flex min-h-72 flex-col items-center justify-center gap-4 px-5 text-muted-foreground">
          <MessageCircle className="size-12 text-primary" aria-hidden="true" />
          <p className="text-sm">{tab === "الأصدقاء" ? "لا يوجد أصدقاء حالياً" : tab === "غير مقروءة" ? "لا توجد رسائل غير مقروءة" : "لا توجد محادثات حالياً"}</p>
        </div>
    </AppScreen>
  );
}
