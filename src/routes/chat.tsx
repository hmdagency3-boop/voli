import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Search, SquarePen, Megaphone, CheckCheck } from "lucide-react";
import { BottomNav } from "@/components/BottomNav";
import live1 from "@/assets/live1.jpg";
import live2 from "@/assets/live2.jpg";
import live3 from "@/assets/live3.jpg";
import live4 from "@/assets/live4.jpg";

export const Route = createFileRoute("/chat")({
  head: () => ({
    meta: [
      { title: "الدردشات — Diwan" },
      { name: "description", content: "رسائلك ومحادثاتك مع المضيفين والأصدقاء على Diwan." },
      { property: "og:title", content: "الدردشات — Diwan" },
      { property: "og:description", content: "رسائلك ومحادثاتك على Diwan." },
    ],
  }),
  component: ChatPage,
});

const online = [
  { name: "سارة", img: live1 }, { name: "عمر", img: live2 }, { name: "ليلى", img: live3 }, { name: "كريم", img: live4 },
];

const chats = [
  { name: "سارة ستار", img: live1, msg: "شكراً على الهدية 😍❤️", time: "الآن", unread: 3, online: true, live: true },
  { name: "عمر جيمر", img: live2, msg: "تعالى البث النهارده الساعة ٩", time: "٥ د", unread: 1, online: true },
  { name: "ليلى", img: live3, msg: "تمام اتفقنا 👍", time: "١ س", read: true },
  { name: "DJ كريم", img: live4, msg: "رسالة صوتية 🎙️", time: "أمس", online: true },
  { name: "نور", img: live3, msg: "صورة 📷", time: "أمس", read: true },
];

const tabs = ["الكل", "غير مقروءة", "الأصدقاء"];

function ChatPage() {
  const [tab, setTab] = useState("الكل");
  const list = tab === "غير مقروءة" ? chats.filter((c) => c.unread) : tab === "الأصدقاء" ? chats.filter((c) => c.online) : chats;

  return (
    <div className="min-h-screen bg-muted md:py-8">
      <main className="relative mx-auto min-h-screen max-w-md bg-background pb-28 md:min-h-[860px] md:rounded-[2.5rem] md:border md:shadow-soft md:overflow-hidden">
        <header className="flex items-center justify-between px-5 pt-6">
          <h1 className="font-display text-3xl font-extrabold tracking-tight">دردشة<span className="text-primary">.</span></h1>
          <button aria-label="رسالة جديدة" className="grid size-11 place-items-center rounded-full bg-brand text-primary-foreground shadow-soft">
            <SquarePen className="size-5" />
          </button>
        </header>

        <div className="mx-5 mt-5 flex items-center gap-2 rounded-full bg-secondary px-4 py-3">
          <Search className="size-4 text-muted-foreground" />
          <input placeholder="دوّر على محادثة..." className="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground" />
        </div>

        <section className="no-scrollbar mt-5 flex gap-4 overflow-x-auto px-5">
          {online.map((o) => (
            <div key={o.name} className="flex shrink-0 flex-col items-center gap-1.5">
              <span className="relative">
                <img src={o.img} alt={o.name} loading="lazy" className="size-14 rounded-full object-cover" />
                <span className="absolute bottom-0.5 left-0.5 size-3.5 rounded-full border-2 border-background bg-chart-2" />
              </span>
              <span className="text-xs font-semibold">{o.name}</span>
            </div>
          ))}
        </section>

        <nav className="mt-5 flex gap-2 px-5">
          {tabs.map((t) => (
            <button key={t} onClick={() => setTab(t)}
              className={`rounded-full px-4 py-2 text-sm font-semibold transition ${t === tab ? "bg-foreground text-background" : "bg-secondary text-secondary-foreground"}`}>
              {t}
            </button>
          ))}
        </nav>

        <ul className="mt-4 px-3">
          <li className="flex items-center gap-3 rounded-2xl p-2 hover:bg-secondary">
            <span className="grid size-14 shrink-0 place-items-center rounded-full bg-brand text-primary-foreground"><Megaphone className="size-6" /></span>
            <div className="min-w-0 flex-1">
              <p className="font-bold">فريق Diwan <span className="mr-1 rounded-full bg-accent px-1.5 py-0.5 text-[10px] text-accent-foreground">رسمي</span></p>
              <p className="truncate text-sm text-muted-foreground">مهرجان الخميس الكبير بدأ! 🎉</p>
            </div>
            <span className="text-xs text-muted-foreground">١٠ د</span>
          </li>
          {list.map((c) => (
            <li key={c.name} className="flex items-center gap-3 rounded-2xl p-2 hover:bg-secondary">
              <span className="relative shrink-0">
                <img src={c.img} alt={c.name} loading="lazy" className={`size-14 rounded-full object-cover ${c.live ? "ring-2 ring-live ring-offset-2 ring-offset-background" : ""}`} />
                {c.online && <span className="absolute bottom-0.5 left-0.5 size-3.5 rounded-full border-2 border-background bg-chart-2" />}
              </span>
              <div className="min-w-0 flex-1">
                <p className="font-bold">{c.name}</p>
                <p className={`truncate text-sm ${c.unread ? "font-semibold text-foreground" : "text-muted-foreground"}`}>{c.msg}</p>
              </div>
              <div className="flex flex-col items-end gap-1">
                <span className="text-xs text-muted-foreground">{c.time}</span>
                {c.unread ? (
                  <span className="grid size-5 place-items-center rounded-full bg-primary text-[11px] font-bold text-primary-foreground">{c.unread}</span>
                ) : c.read ? <CheckCheck className="size-4 text-primary" /> : null}
              </div>
            </li>
          ))}
        </ul>

        <BottomNav />
      </main>
    </div>
  );
}
