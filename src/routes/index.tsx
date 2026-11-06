import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { Bell, Copy, Loader2, Search, User, Video, X } from "lucide-react";
import { toast } from "sonner";
import { AppScreen } from "@/components/AppScreen";
import { Button } from "@/components/ui/button";
import { SpecialIdBadge } from "@/components/SpecialIdBadge";
import { useAccount } from "@/hooks/use-account";
import { shownId } from "@/lib/special-id";
import { parseIdQuery, searchUsersById, type FoundUser } from "@/lib/user-search";

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

type SearchState =
  | { kind: "idle" }
  | { kind: "invalid" }
  | { kind: "loading" }
  | { kind: "done"; users: FoundUser[] }
  | { kind: "error" };

function UserSearch({ onClose }: { onClose: () => void }) {
  const { session, ready } = useAccount();
  const [query, setQuery] = useState("");
  const [state, setState] = useState<SearchState>({ kind: "idle" });
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { inputRef.current?.focus(); }, []);

  useEffect(() => {
    if (!session) return;
    if (!query.trim()) { setState({ kind: "idle" }); return; }
    const id = parseIdQuery(query);
    if (!id) { setState({ kind: "invalid" }); return; }
    let active = true;
    setState({ kind: "loading" });
    const t = setTimeout(() => {
      searchUsersById(id)
        .then((users) => { if (active) setState({ kind: "done", users }); })
        .catch(() => { if (active) setState({ kind: "error" }); });
    }, 300);
    return () => { active = false; clearTimeout(t); };
  }, [query, session]);

  return (
    <section aria-label="البحث عن مستخدم" className="mx-5 mt-4 rounded-[1.5rem] border bg-card p-3 shadow-soft">
      <div className="flex items-center gap-2 rounded-full bg-secondary px-4 py-2.5">
        <Search className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
        <input
          ref={inputRef}
          type="text"
          inputMode="numeric"
          aria-label="ابحث بالـ ID"
          placeholder="ابحث بالـ ID"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          disabled={!session}
          className="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground disabled:opacity-60"
        />
        <button type="button" aria-label="إغلاق البحث" onClick={onClose} className="grid size-6 shrink-0 place-items-center rounded-full text-muted-foreground transition hover:text-foreground">
          <X className="size-4" />
        </button>
      </div>

      <div className="px-1 pt-3 text-sm" aria-live="polite">
        {!ready ? null : !session ? (
          <div className="flex items-center justify-between gap-3 text-muted-foreground">
            <span>سجّل الدخول علشان تقدر تبحث عن المستخدمين</span>
            <Button asChild size="sm" className="rounded-full"><Link to="/login">تسجيل الدخول</Link></Button>
          </div>
        ) : state.kind === "idle" ? (
          <p className="text-muted-foreground">اكتب الـ ID العادي أو الايدي المميز</p>
        ) : state.kind === "invalid" ? (
          <p className="text-muted-foreground">الـ ID أرقام بس</p>
        ) : state.kind === "loading" ? (
          <p className="flex items-center gap-2 text-muted-foreground"><Loader2 className="size-4 animate-spin" /> جاري البحث…</p>
        ) : state.kind === "error" ? (
          <p className="text-destructive">حصلت مشكلة في البحث، حاول تاني</p>
        ) : state.users.length === 0 ? (
          <p className="text-muted-foreground">مفيش مستخدم بالـ ID ده</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {state.users.map((u) => (
              <li key={u.public_id} className="flex items-center gap-3 rounded-2xl bg-secondary/60 p-2.5">
                {u.avatar_url ? (
                  <img src={u.avatar_url} alt="" className="size-11 shrink-0 rounded-full object-cover" />
                ) : (
                  <span className="grid size-11 shrink-0 place-items-center rounded-full bg-secondary text-muted-foreground">
                    <User className="size-5" aria-hidden="true" />
                  </span>
                )}
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold">{u.display_name}</p>
                  <div className="mt-1 text-xs text-muted-foreground">
                    {u.special_id ? (
                      <SpecialIdBadge id={u.special_id} vipLevel={Number(u.vip_level ?? 0)} className="w-20" />
                    ) : (
                      <span dir="ltr">ID: <span className="font-semibold text-foreground">{u.public_id}</span></span>
                    )}
                  </div>
                </div>
                <button
                  type="button"
                  aria-label="نسخ الـ ID"
                  onClick={() => { navigator.clipboard.writeText(shownId(u)); toast.success("تم نسخ الـ ID"); }}
                  className="grid size-8 shrink-0 place-items-center rounded-lg text-muted-foreground transition hover:bg-secondary hover:text-foreground"
                >
                  <Copy className="size-4" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}

function Index() {
  const [category, setCategory] = useState("الكل");
  const [searchOpen, setSearchOpen] = useState(false);
  return (
    <AppScreen>
        <header className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 px-5 pt-6">
          <div className="min-w-0">
            <p className="text-sm text-muted-foreground">أهلاً بك</p>
            <h1 className="font-display text-3xl font-extrabold">voli<span className="text-primary">.</span></h1>
          </div>
          <div className="flex shrink-0 gap-2">
            <Button
              variant={searchOpen ? "default" : "secondary"}
              size="icon"
              aria-label="البحث"
              aria-expanded={searchOpen}
              onClick={() => setSearchOpen((v) => !v)}
              className="size-11 rounded-full"
            ><Search /></Button>
            <Button variant="secondary" size="icon" disabled aria-label="الإشعارات" className="size-11 rounded-full"><Bell /></Button>
          </div>
        </header>
        {searchOpen && <UserSearch onClose={() => setSearchOpen(false)} />}
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
