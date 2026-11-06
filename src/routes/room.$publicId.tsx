import { vipChatBubbleArt, vipProfileCardArt } from "@/lib/vip-art";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { Gift, Loader2, Lock, Mic, MessageCircle, Power, Share2, SendHorizontal, User, Users, X } from "lucide-react";
import { RoomRanking } from "@/components/RoomRanking";
import { RoomViewers } from "@/components/RoomViewers";
import trophyButton from "@/assets/rank/trophy-button.webp";
import coinIcon from "@/assets/coin.webp";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { VipProfileCard } from "@/components/VipProfileCard";
import { VipBadge } from "@/components/VipBadge";
import { VipEntrance } from "@/components/VipEntrance";
import { useAccount } from "@/hooks/use-account";
import { activeVipLevel, vipTier } from "@/lib/vip";
import { shownId } from "@/lib/special-id";
import {
  COIN_AMOUNTS, ROOM_HEARTBEAT_MS, ROOM_POLL_MS, endParty, enterRoom, getPeople, getRoomByOwnerPublicId, getRoomState, kickFromRoom,
  leaveRoom, leaveSeat, roomTheme, roomThemeStyle, sendRoomMessage, takeSeat, throwRoomCoins,
  type EnterResult, type Room, type RoomMessage, type RoomPerson, type Seat,
} from "@/lib/rooms";

export const Route = createFileRoute("/room/$publicId")({
  head: () => ({
    meta: [
      { title: "روم الحفلة — voli" },
      { name: "description", content: "ادخل الروم، اطلع على المايك واتكلم مع الناس على voli." },
      { property: "og:title", content: "روم الحفلة — voli" },
      { property: "og:description", content: "ادخل الروم، اطلع على المايك واتكلم مع الناس على voli." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: RoomPage,
});

type Status = "loading" | "missing" | "offline" | "password" | "kicked" | "inside" | "error";
type Tab = "all" | "chat" | "gifts";

/** 12500 -> 12.5K: keeps the coin count inside the trophy button. */
const shortCoins = (n: number) => (n >= 1e6 ? `${(n / 1e6).toFixed(1)}M` : n >= 1e3 ? `${(n / 1e3).toFixed(1)}K` : String(n));

function RoomPage() {
  const { publicId } = Route.useParams();
  const { session, profile, reload } = useAccount();
  const me = session?.user.id;
  const navigate = useNavigate();

  const [status, setStatus] = useState<Status>("loading");
  const [owner, setOwner] = useState<RoomPerson | null>(null);
  const [room, setRoom] = useState<Room | null>(null);
  const [members, setMembers] = useState<string[]>([]);
  const [seats, setSeats] = useState<Seat[]>([]);
  const [messages, setMessages] = useState<RoomMessage[]>([]);
  const [people, setPeople] = useState<Record<string, RoomPerson>>({});
  const [password, setPassword] = useState("");
  const [tab, setTab] = useState<Tab>("all");
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [picked, setPicked] = useState<RoomPerson | null>(null);
  const [exitOpen, setExitOpen] = useState(false);
  const [entrance, setEntrance] = useState(false);
  const [joins, setJoins] = useState<Join[]>([]);
  const [entrances, setEntrances] = useState<Join[]>([]);
  const [listOpen, setListOpen] = useState(false);
  const [rankOpen, setRankOpen] = useState(false);
  /** Coins thrown in this room, and the throw the member is about to make. */
  const [coins, setCoins] = useState(0);
  const [amount, setAmount] = useState<number>(COIN_AMOUNTS[0]);
  const [throwing, setThrowing] = useState(false);
  const balance = Number(profile?.coins ?? 0);
  const endRef = useRef<HTMLDivElement>(null);
  const peopleRef = useRef(people);
  peopleRef.current = people;
  const seenRef = useRef<Set<string> | null>(null);

  const isOwner = !!me && owner?.auth_id === me;

  const handleEnter = useCallback((res: EnterResult) => {
    if (res === "ok") { setStatus("inside"); return true; }
    setStatus(res === "wrong_password" ? "password" : res === "kicked" ? "kicked" : res === "not_live" ? "offline" : "missing");
    return false;
  }, []);

  // Find the room and try to enter.
  useEffect(() => {
    if (!me) return;
    let active = true;
    (async () => {
      try {
        const found = await getRoomByOwnerPublicId(Number(publicId));
        if (!active) return;
        if (!found) return setStatus("missing");
        setOwner(found.owner);
        setPeople((p) => ({ ...p, [found.owner.auth_id]: found.owner }));
        setRoom(found.room);
        if (!found.room) return setStatus("missing");
        if (!found.room.is_live) return setStatus("offline");
        const ok = handleEnter(await enterRoom(found.room.id));
        if (ok && active) setEntrance(true);
      } catch {
        if (active) setStatus("error");
      }
    })();
    return () => { active = false; };
  }, [me, publicId, handleEnter]);

  const roomId = room?.id;
  const inside = status === "inside";

  // Live refresh + "still here" heartbeat while inside; leave when the page closes.
  useEffect(() => {
    if (!inside || !roomId) return;
    let active = true;
    const load = async () => {
      const s = await getRoomState(roomId).catch(() => null);
      if (!active || !s) return;
      if (s.room && !s.room.is_live) { setStatus("offline"); return; }
      if (s.room) setRoom(s.room);
      setMembers(s.members);
      setSeats(s.seats);
      setCoins(s.coins);
      setMessages((prev) => (prev.length === s.messages.length && prev.at(-1)?.id === s.messages.at(-1)?.id ? prev : s.messages));
      const unknown = [...new Set([...s.members, ...s.seats.map((x) => x.auth_id), ...s.messages.map((m) => m.sender_id)])]
        .filter((id) => !peopleRef.current[id]);
      if (unknown.length) {
        const found = await getPeople({ ids: unknown }).catch(() => []);
        if (!active) return;
        if (found.length) {
          const add = Object.fromEntries(found.map((x) => [x.auth_id, x]));
          peopleRef.current = { ...peopleRef.current, ...add };
          setPeople((p) => ({ ...p, ...add }));
        }
      }
      // Announce members who just came in (the first load only remembers who is already here).
      const seen = seenRef.current;
      seenRef.current = new Set(s.members);
      if (seen) {
        const now = new Date().toISOString();
        const fresh = s.members.filter((id) => !seen.has(id) && id !== me).map((id) => ({ key: `${id}-${now}`, auth_id: id, at: now }));
        if (fresh.length) {
          setJoins((j) => [...j, ...fresh].slice(-50));
          setEntrances((q) => [...q, ...fresh.filter((x) => activeVipLevel(peopleRef.current[x.auth_id]) > 0)]);
        }
      }
      // Removed by the owner or a moderator.
      if (me && !s.members.includes(me)) {
        const res = await enterRoom(roomId).catch(() => null);
        if (active && res && res !== "ok") handleEnter(res);
      }
    };
    load();
    const poll = setInterval(load, ROOM_POLL_MS);
    const beat = setInterval(() => { enterRoom(roomId).then((r) => active && r !== "ok" && handleEnter(r)).catch(() => {}); }, ROOM_HEARTBEAT_MS);
    const bye = () => { leaveRoom(roomId).catch(() => {}); };
    window.addEventListener("pagehide", bye);
    return () => { active = false; clearInterval(poll); clearInterval(beat); window.removeEventListener("pagehide", bye); };
  }, [inside, roomId, me, handleEnter]);

  // Leaving the page inside the app also leaves the room.
  useEffect(() => {
    if (!roomId) return;
    return () => { leaveRoom(roomId).catch(() => {}); };
  }, [roomId]);

  // My own entrance: a join line for me, and my bar first in line.
  useEffect(() => {
    if (!entrance || !me) return;
    setEntrance(false);
    const j = { key: `${me}-${Date.now()}`, auth_id: me, at: new Date().toISOString() };
    setJoins((x) => [...x, j]);
    if (activeVipLevel(profile) > 0) setEntrances((q) => [j, ...q]);
  }, [entrance, me, profile]);
  // Entrance bars play one after another.
  const shownEntrance = entrances[0];
  useEffect(() => {
    if (!shownEntrance) return;
    const t = setTimeout(() => setEntrances((q) => q.slice(1)), 4500);
    return () => clearTimeout(t);
  }, [shownEntrance]);
  useEffect(() => { endRef.current?.scrollIntoView({ block: "end" }); }, [messages.length, joins.length, tab]);

  async function onPassword(e: React.FormEvent) {
    e.preventDefault();
    if (!roomId) return;
    const res = await enterRoom(roomId, password).catch(() => null);
    if (res === "wrong_password") { toast.error("كلمة السر غلط"); return; }
    if (res && handleEnter(res)) setEntrance(true);
  }

  async function onSeat(no: number) {
    if (!roomId || !me) return;
    const sitter = seats.find((s) => s.seat_no === no);
    if (sitter) {
      if (sitter.auth_id === me) { await leaveSeat(roomId).catch(() => {}); setSeats((s) => s.filter((x) => x.auth_id !== me)); return; }
      const p = people[sitter.auth_id]; if (p) setPicked(p); return;
    }
    const res = await takeSeat(roomId, no).catch(() => null);
    if (res === "ok") setSeats((s) => [...s.filter((x) => x.auth_id !== me), { seat_no: no, auth_id: me }]);
    else toast.error(res === "taken" ? "المايك ده اتاخد" : "مقدرتش تطلع على المايك");
  }

  async function onSend(e: React.FormEvent) {
    e.preventDefault();
    if (!roomId || !me || !text.trim() || sending) return;
    setSending(true);
    try {
      const res = await sendRoomMessage(roomId, text);
      if (res !== "ok") throw new Error(res ?? "");
      setText("");
      const s = await getRoomState(roomId); setMessages(s.messages);
    } catch { toast.error("الرسالة ماتبعتتش"); }
    finally { setSending(false); }
  }

  async function onKick(p: RoomPerson) {
    if (!roomId) return;
    const res = await kickFromRoom(roomId, p.auth_id).catch(() => null);
    if (res === "ok") { toast.success(`${p.display_name} اتطرد من الروم لمدة 10 دقايق`); setPicked(null); }
    else toast.error("مش مسموح تطرد العضو ده");
  }

  async function onShare() {
    const url = window.location.href;
    try {
      if (navigator.share) await navigator.share({ title: room?.name ?? "voli", url });
      else { await navigator.clipboard.writeText(url); toast.success("اتنسخ لينك الروم"); }
    } catch { /* closed */ }
  }

  /** Coins out of my own balance into the room; the database answers with the room's new total. */
  async function onThrow() {
    if (!roomId || throwing || balance < amount) return;
    setThrowing(true);
    try {
      setCoins(await throwRoomCoins(roomId, amount));
      reload();
      toast.success(`رميت ${amount} كوينز في الروم`);
    } catch (e) {
      const hint = (e as { hint?: string } | null)?.hint;
      toast.error(hint === "not_enough_coins" ? "رصيدك من الكوينز مش كفاية" : hint === "not_in_room" ? "لازم تكون جوه الروم" : "مقدرتش ارمي الكوينز");
    } finally { setThrowing(false); }
  }

  async function exit(end: boolean) {
    if (roomId) await (end ? endParty() : leaveRoom(roomId)).catch(() => {});
    navigate({ to: "/" });
  }

  const theme = roomTheme(room?.theme);
  const myVip = activeVipLevel(profile);
  /** A VIP tier with its own picture gets the framed profile card; everyone else keeps the plain sheet. */
  const cardArt = picked ? vipProfileCardArt(activeVipLevel(picked)) : null;

  return (
    <div className="h-dvh overflow-hidden bg-muted md:p-8">
      <div className={`relative mx-auto flex h-full w-full max-w-md flex-col overflow-hidden text-on-media md:rounded-[2.5rem] md:border ${theme.className}`} style={roomThemeStyle(room?.theme)}>
        {status !== "inside" ? (
          <Gate status={status} isOwner={isOwner} password={password} setPassword={setPassword} onPassword={onPassword} />
        ) : room && owner ? (
          <>
            <header className="px-4 pt-4">
              <div className="flex items-center gap-3">
                {room.cover_url ? (
                  <img src={room.cover_url} alt="" className="size-12 shrink-0 rounded-xl object-cover" />
                ) : (
                  <span className="grid size-12 shrink-0 place-items-center rounded-xl bg-overlay"><User className="size-6" /></span>
                )}
                <div className="min-w-0 flex-1 text-start">
                  <p className="flex items-center gap-1.5 font-bold">
                    {room.locked && <Lock className="size-3.5 shrink-0 opacity-70" aria-label="مقفول" />}
                    <span className="truncate">{room.name}</span>
                  </p>
                  <p className="text-xs opacity-80"><bdi dir="ltr">ID:{shownId(owner)}</bdi></p>
                </div>
                <Button variant="ghost" size="icon" aria-label="خروج" onClick={() => (isOwner ? setExitOpen(true) : exit(false))} className="rounded-full text-on-media hover:bg-overlay">
                  <Power className="size-6" />
                </Button>
              </div>
              <div className="mt-3 flex items-center justify-between">
                <button type="button" onClick={() => setListOpen(true)} className="inline-flex items-center gap-1 rounded-full bg-overlay px-2.5 py-0.5 text-xs" aria-label={`${members.length} في الروم`}>
                  <span className="flex -space-x-1.5 rtl:space-x-reverse">
                    {members.slice(0, 3).map((id) => people[id] && <Avatar key={id} person={people[id]} className="size-5 text-[9px] ring-1 ring-on-media/40" />)}
                  </span>
                  <Users className="size-3.5" /> <span className="tabular-nums">{members.length}</span>
                </button>
                {/* The ranking opener takes the spot the owner label used to hold, at the end of the row. */}
                <button type="button" onClick={() => setRankOpen(true)}
                  className="relative inline-flex shrink-0 transition active:scale-95"
                  aria-label={`ترتيب الدعم والمدعوين — ${coins.toLocaleString("en")} كوينز مرمية في الروم`}>
                  <img src={trophyButton} alt="" className="block h-7 w-auto" />
                  {/* The shine is masked to the artwork itself, so it never spills past the gold frame. */}
                  <span aria-hidden className="rank-sweep pointer-events-none absolute inset-0"
                    style={{ WebkitMaskImage: `url(${trophyButton})`, maskImage: `url(${trophyButton})`, WebkitMaskSize: "100% 100%", maskSize: "100% 100%" }} />
                  <span className="absolute inset-y-0 flex items-center justify-center gap-1 text-[10px] font-black tabular-nums text-rank-gold [text-shadow:0_1px_2px_rgba(0,0,0,0.85)]"
                    style={{ left: "32%", right: "7%" }}>
                    <img src={coinIcon} alt="" className="size-2.5 shrink-0" />
                    {shortCoins(coins)}
                  </span>
                </button>
              </div>
            </header>

            <section aria-label="المايكات" className="grid grid-cols-5 gap-x-2 gap-y-3 px-4 pt-5">
              {Array.from({ length: room.seat_count }, (_, i) => i + 1).map((no) => {
                const sitter = seats.find((s) => s.seat_no === no);
                const p = sitter ? people[sitter.auth_id] : undefined;
                return (
                  <button key={no} type="button" onClick={() => onSeat(no)} className="flex flex-col items-center gap-1" aria-label={p ? `${p.display_name} على مايك ${no}` : `مايك ${no} فاضي`}>
                    {p ? (
                      <Avatar person={p} className={`size-14 ring-2 ${sitter?.auth_id === me ? "ring-primary" : "ring-on-media/30"}`} />
                    ) : (
                      <span className="grid size-14 place-items-center rounded-full border-2 border-on-media/15 bg-overlay"><Mic className="size-6 opacity-70" /></span>
                    )}
                    <span className="w-full truncate text-center text-xs opacity-80">{p ? p.display_name : no}</span>
                  </button>
                );
              })}
            </section>

            <nav className="mt-4 flex gap-5 px-4" aria-label="الدردشة">
              {([["all", "الكل"], ["chat", "الدردشة"], ["gifts", "هدية"]] as const).map(([key, label]) => (
                <button key={key} type="button" onClick={() => setTab(key)} aria-pressed={tab === key}
                  className={`relative pb-2 text-base font-bold transition ${tab === key ? "" : "opacity-50"}`}>
                  {label}
                  {tab === key && <span className="absolute inset-x-1/3 bottom-0 h-1 rounded-full bg-on-media" />}
                </button>
              ))}
            </nav>

            <div className="min-h-0 flex-1 space-y-2 overflow-y-auto px-4 py-2">
              {tab === "gifts" ? (
                <div className="rounded-2xl bg-overlay p-3">
                  <p className="flex items-center gap-1.5 text-sm font-bold">
                    <img src={coinIcon} alt="" className="size-4" /> ارمِ كوينز في الروم
                  </p>
                  <p className="mt-1 text-xs opacity-70">
                    رصيدك <bdi dir="ltr">{balance.toLocaleString("en")}</bdi> · المتجمع في الروم <bdi dir="ltr">{coins.toLocaleString("en")}</bdi>
                  </p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {COIN_AMOUNTS.map((a) => (
                      <button key={a} type="button" onClick={() => setAmount(a)} aria-pressed={amount === a}
                        className={`rounded-full px-3 py-1 text-sm font-bold tabular-nums transition ${amount === a ? "bg-rank-gold text-background" : "bg-background/15 opacity-70"}`}>
                        {a}
                      </button>
                    ))}
                  </div>
                  <Button type="button" onClick={onThrow} disabled={throwing || balance < amount} className="mt-3 w-full rounded-full">
                    {throwing ? <Loader2 className="animate-spin" /> : <img src={coinIcon} alt="" className="size-4" />}
                    ارمِ {amount} كوينز
                  </Button>
                  {balance < amount && <p className="mt-1 text-center text-xs text-destructive">رصيدك من الكوينز مش كفاية</p>}
                </div>
              ) : (
                <>
                  {tab === "all" && (
                    <>
                      <Card><p className="text-sm text-primary">مرحبًا بك في voli، يرجى الالتزام بمواصفات المنصة.</p></Card>
                      {room.announcement && (
                        <Card>
                          <p className="mb-1 text-xs font-bold opacity-70">إعلان الروم</p>
                          <p className="whitespace-pre-wrap break-words text-sm">{room.announcement}</p>
                        </Card>
                      )}
                      <Card className="flex items-center gap-3">
                        <p className="flex-1 text-sm">شارك الروم ده مع صحابك!</p>
                        <Button size="sm" onClick={onShare} className="rounded-full"><Share2 /> مشاركة</Button>
                      </Card>
                    </>
                  )}
                  {feed(messages, tab === "all" ? joins : []).map((item) => {
                    if ("auth_id" in item) {
                      const jp = people[item.auth_id];
                      return (
                        <p key={item.key} className="flex w-fit max-w-full items-center gap-1.5 rounded-full bg-overlay px-3 py-1 text-xs">
                          <span className={`truncate font-semibold ${vipTier(activeVipLevel(jp))?.text ?? ""}`}>{jp?.display_name ?? "…"}</span>
                          <VipBadge level={activeVipLevel(jp)} />
                          <span className="shrink-0 opacity-80">دخل الروم</span>
                        </p>
                      );
                    }
                    const m = item;
                    const p = people[m.sender_id];
                    const lvl = activeVipLevel(p);
                    return (
                      <div key={m.id} className="flex items-start gap-2">
                        {p && <Avatar person={p} className="size-8" />}
                        <div className="min-w-0 flex-1">
                          <p className="flex items-center gap-1 text-xs">
                            <span className={`truncate font-semibold ${vipTier(lvl)?.text ?? "opacity-70"}`}>{p?.display_name ?? "…"}</span>
                            <VipBadge level={lvl} />
                          </p>
                          <ChatBubble level={lvl} body={m.body} />
                        </div>
                      </div>
                    );
                  })}
                  {tab === "chat" && messages.length === 0 && <p className="py-10 text-center text-sm opacity-70">مفيش رسايل لسه</p>}
                  <div ref={endRef} />
                </>
              )}
            </div>

            <form onSubmit={onSend} className="flex items-center gap-2 px-4 pb-4 pt-2">
              <label className="flex min-w-0 flex-1 items-center gap-2 rounded-full bg-overlay px-4 py-2.5">
                <MessageCircle className="size-5 shrink-0 opacity-70" />
                <input aria-label="اكتب في الروم" placeholder="قول حاجة…" value={text} maxLength={300} onChange={(e) => setText(e.target.value)}
                  className="w-full bg-transparent text-sm outline-none placeholder:text-on-media/50" />
              </label>
              {text.trim() ? (
                <Button type="submit" size="icon" aria-label="إرسال" disabled={sending} className="size-11 rounded-full">
                  {sending ? <Loader2 className="animate-spin" /> : <SendHorizontal className="-scale-x-100" />}
                </Button>
              ) : (
                <Button type="button" size="icon" variant="ghost" aria-label="هدية" onClick={() => setTab("gifts")} className="size-11 rounded-full bg-overlay text-on-media">
                  <Gift className="size-5" />
                </Button>
              )}
            </form>

            {shownEntrance && (() => {
              const ep = shownEntrance.auth_id === me && profile ? { ...profile, vip: myVip } : people[shownEntrance.auth_id] && { ...people[shownEntrance.auth_id], vip: activeVipLevel(people[shownEntrance.auth_id]) };
              return ep && ep.vip > 0 ? (
                <div key={shownEntrance.key} className="pointer-events-none absolute inset-x-0 top-1/3 px-3">
                  <VipEntrance level={ep.vip} name={ep.display_name ?? ""} />
                </div>
              ) : null;
            })()}
          </>
        ) : null}
      </div>

      {picked && cardArt ? (
        <Sheet open onOpenChange={(o) => !o && setPicked(null)}>
          <SheetContent side="bottom" className="w-full max-w-none gap-0 border-0 bg-transparent p-0 shadow-none [&>button]:hidden">
            <SheetTitle className="sr-only">ملف {picked.display_name}</SheetTitle>
            <div className="relative mx-auto w-full max-w-[calc(70dvh*0.866)]">
              <button type="button" onClick={() => setPicked(null)} aria-label="إغلاق"
                className="absolute -top-11 right-0 grid size-8 place-items-center rounded-full bg-overlay text-on-media">
                <X className="size-4" />
              </button>
              <VipProfileCard art={cardArt}
                avatar={<Avatar person={picked} className="size-full text-3xl" />}
                name={picked.display_name} id={shownId(picked)}>
                <Button asChild size="sm" className="h-9 w-full rounded-full bg-rank-gold font-bold text-vip-on hover:bg-rank-gold/90">
                  <Link to="/user/$publicId" params={{ publicId: String(picked.public_id) }}>الملف الشخصي</Link>
                </Button>
                {picked.auth_id !== me && picked.auth_id !== owner?.auth_id && (
                  <Button size="sm" variant="destructive" onClick={() => onKick(picked)} className="h-9 w-full rounded-full">طرد من الروم</Button>
                )}
              </VipProfileCard>
            </div>
          </SheetContent>
        </Sheet>
      ) : (
        <Sheet open={!!picked} onOpenChange={(o) => !o && setPicked(null)}>
          <SheetContent side="bottom" className="mx-auto max-w-md rounded-t-3xl">
            {picked && (
              <>
                <SheetHeader className="items-center text-center">
                  <Avatar person={picked} className="size-16" />
                  <SheetTitle className="flex items-center gap-1.5">{picked.display_name} <VipBadge level={activeVipLevel(picked)} /></SheetTitle>
                  <p className="text-xs text-muted-foreground" dir="ltr">ID:{shownId(picked)}</p>
                </SheetHeader>
                <div className="grid gap-2 p-4">
                  <Button asChild variant="secondary" className="h-12 rounded-full">
                    <Link to="/user/$publicId" params={{ publicId: String(picked.public_id) }}>الملف الشخصي</Link>
                  </Button>
                  {picked.auth_id !== me && picked.auth_id !== owner?.auth_id && (
                    <Button variant="destructive" onClick={() => onKick(picked)} className="h-12 rounded-full">طرد من الروم</Button>
                  )}
                </div>
              </>
            )}
          </SheetContent>
        </Sheet>
      )}

      <RoomViewers open={listOpen} onOpenChange={setListOpen} members={members} people={people} ownerId={owner?.auth_id}
        seated={new Set(seats.map((x) => x.auth_id))} me={me} onPick={(p) => { setListOpen(false); setPicked(p); }} />

      <RoomRanking open={rankOpen} onOpenChange={setRankOpen} />

      <Sheet open={exitOpen} onOpenChange={setExitOpen}>
        <SheetContent side="bottom" className="mx-auto max-w-md rounded-t-3xl">
          <SheetHeader><SheetTitle>خروج من الروم</SheetTitle></SheetHeader>
          <div className="grid gap-2 p-4">
            <Button variant="destructive" onClick={() => exit(true)} className="h-12 rounded-full">إنهاء الحفلة</Button>
            <Button variant="secondary" onClick={() => exit(false)} className="h-12 rounded-full">خروج والحفلة شغالة</Button>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}

type Join = { key: string; auth_id: string; at: string };

/** Chat messages and "came in" lines in time order. */
function feed(messages: RoomMessage[], joins: Join[]): (RoomMessage | Join)[] {
  const time = (x: RoomMessage | Join) => ("auth_id" in x ? x.at : x.created_at);
  return [...messages, ...joins].sort((a, b) => time(a).localeCompare(time(b)));
}

function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <div className={`rounded-2xl bg-overlay px-4 py-3 ${className}`}>{children}</div>;
}

function Avatar({ person, className = "" }: { person: RoomPerson; className?: string }) {
  return person.avatar_url ? (
    <img src={person.avatar_url} alt="" className={`shrink-0 rounded-full object-cover ${className}`} />
  ) : (
    <span className={`grid shrink-0 place-items-center rounded-full bg-secondary font-bold text-secondary-foreground ${className}`}>
      {person.display_name.trim().charAt(0) || "؟"}
    </span>
  );
}

function Gate({ status, isOwner, password, setPassword, onPassword }: {
  status: Status; isOwner: boolean; password: string; setPassword: (v: string) => void; onPassword: (e: React.FormEvent) => void;
}) {
  const back = (
    <Button asChild variant="secondary" className="rounded-full"><Link to="/">الرئيسية</Link></Button>
  );
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-4 p-8 text-center">
      {status === "loading" && <Loader2 className="size-8 animate-spin" aria-label="جاري الدخول" />}
      {status === "password" && (
        <form onSubmit={onPassword} className="w-full space-y-3">
          <Lock className="mx-auto size-10" />
          <p className="font-bold">الروم ده مقفول</p>
          <input aria-label="كلمة سر الروم" inputMode="numeric" dir="ltr" maxLength={8} autoFocus value={password}
            onChange={(e) => setPassword(e.target.value.replace(/\D/g, ""))} placeholder="كلمة السر"
            className="w-full rounded-2xl bg-overlay px-4 py-3 text-center text-lg tracking-[0.4em] outline-none" />
          <Button type="submit" className="h-12 w-full rounded-full">دخول</Button>
          {back}
        </form>
      )}
      {status === "offline" && (
        <>
          <p className="font-bold">الحفلة مش شغالة دلوقتي</p>
          {isOwner ? <Button asChild className="rounded-full"><Link to="/room/new">ابدأ الحفلة</Link></Button> : back}
        </>
      )}
      {status === "missing" && (<><p className="font-bold">مفيش روم بالـ ID ده</p>{back}</>)}
      {status === "kicked" && (<><p className="font-bold">اتطردت من الروم ده، تقدر ترجع بعد شوية</p>{back}</>)}
      {status === "error" && (<><p className="font-bold">الروم مافتحش. اتأكد إن تحديث الرومات اتشغّل في قاعدة البيانات</p>{back}</>)}
    </div>
  );
}

/** Room chat bubble: VIP tiers with their own picture get a stretchable framed bubble. */
function ChatBubble({ level, body }: { level: number; body: string }) {
  const art = vipChatBubbleArt(level);
  if (!art) {
    return <p className="mt-0.5 inline-block whitespace-pre-wrap break-words rounded-2xl rounded-ss-sm bg-overlay px-3 py-1.5 text-sm">{body}</p>;
  }
  const { slice: s, border: b } = art;
  return (
    <p
      className="vip-bubble-shine mt-0.5 box-border inline-block min-h-11 min-w-20 max-w-full whitespace-pre-wrap [overflow-wrap:anywhere] text-sm text-vip-bubble-foreground"
      style={{
        borderStyle: "solid",
        borderWidth: `${b.top}px ${b.right}px ${b.bottom}px ${b.left}px`,
        borderImage: `url(${art.url}) ${s.top} ${s.right} ${s.bottom} ${s.left} fill / ${b.top}px ${b.right}px ${b.bottom}px ${b.left}px stretch`,
        padding: "4px 10px",
        textShadow: "0 1px 2px var(--vip-bubble-shadow)",
      }}
    >
      {body}
    </p>
  );
}
