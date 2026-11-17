import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronDown, Clover, Flame, Loader2, Play, Users, Zap } from "lucide-react";
import { toast } from "sonner";
import coinIcon from "@/assets/coin.webp";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { supabase } from "@/lib/supabase";
import { levelProgress, type Threshold } from "@/lib/levels";
import { GIFT_QUANTITIES, getGiftCatalog, giftCost, giftErrorMessage, sendRoomGift, type Gift } from "@/lib/gifts";
import type { RoomPerson } from "@/lib/rooms";
import { type GiftKind } from "@/lib/gifts";
import { COMBO_WINDOW_MS, maxMultiplier, nextCombo, playWinSound, sendLuckyGift, type LuckyResult } from "@/lib/lucky";

const TABS: { kind: GiftKind; label: string }[] = [
  { kind: "normal", label: "عادية" }, { kind: "lucky", label: "هدايا الحظ" }, { kind: "crazy", label: "هدايا المجنون" },
];
const LUCKY_QUANTITIES = [1, 5, 10, 30, 66, 99] as const;

/** Someone who can get a gift: people on the mics (with their seat number) plus anyone picked from their profile. */
export type GiftTarget = { person: RoomPerson; seat?: number };

export type GiftSent = { gift: Gift; quantity: number; to: RoomPerson[]; total: number };

/** One lucky/crazy throw; the box stays open so the sender can keep the combo going. */
export type LuckySent = { gift: Gift; quantity: number; to: RoomPerson[]; result: LuckyResult; combo: number };

export function GiftSheet({ open, onOpenChange, roomId, targets, preselect, balance, wealthPoints, onSent, onLucky }: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  roomId: string;
  targets: GiftTarget[];
  /** Who is picked when the box opens (e.g. the person whose profile it was opened from). */
  preselect: string[];
  balance: number;
  wealthPoints: number;
  onSent: (sent: GiftSent) => void;
  onLucky: (sent: LuckySent) => void;
}) {
  const [tab, setTab] = useState<GiftKind>("normal");
  const [combo, setCombo] = useState(0);
  const lastTap = useRef(0);
  const [pop, setPop] = useState<{ key: number; multiplier: number; prize: number } | null>(null);
  const inFlight = useRef(0);
  const [gifts, setGifts] = useState<Gift[] | null>(null);
  const [failed, setFailed] = useState(false);
  const [thresholds, setThresholds] = useState<Threshold[]>([]);
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const [giftKey, setGiftKey] = useState<string | null>(null);
  const [quantity, setQuantity] = useState<number>(GIFT_QUANTITIES[0]);
  const [sending, setSending] = useState(false);

  // Gift list and wealth levels load once, the first time the box opens.
  useEffect(() => {
    if (!open || gifts) return;
    getGiftCatalog().then((g) => { setGifts(g); setGiftKey((k) => k ?? g[0]?.key ?? null); }).catch(() => setFailed(true));
    supabase.from("level_thresholds").select("level, required").eq("kind", "wealth")
      .then(({ data }) => setThresholds(((data ?? []) as Threshold[]).map((t) => ({ level: t.level, required: Number(t.required) }))));
  }, [open, gifts]);

  // Each opening starts from the preselected people (or the first one on the mics).
  useEffect(() => {
    if (!open) return;
    const start = preselect.length ? preselect : targets[0] ? [targets[0].person.auth_id] : [];
    setPicked(new Set(start));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // Someone who leaves the mics/room drops out of the selection.
  const ids = useMemo(() => new Set(targets.map((t) => t.person.auth_id)), [targets]);
  const chosen = [...picked].filter((id) => ids.has(id));
  const allPicked = targets.length > 0 && chosen.length === targets.length;

  const shown = (gifts ?? []).filter((g) => g.kind === tab);
  const gift = shown.find((g) => g.key === giftKey) ?? null;
  const lucky = tab !== "normal";
  const quantities: readonly number[] = lucky ? LUCKY_QUANTITIES : GIFT_QUANTITIES;
  useEffect(() => {
    if (!gifts) return;
    setGiftKey((k) => (gifts.some((g) => g.key === k && g.kind === tab) ? k : gifts.find((g) => g.kind === tab)?.key ?? null));
    setQuantity((q) => (quantities.includes(q) ? q : quantities[0] ?? 1));
    setCombo(0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, gifts]);
  // The combo counter fades out once the window passes without a tap.
  useEffect(() => {
    if (!combo) return;
    const t = setTimeout(() => setCombo(0), COMBO_WINDOW_MS + 200);
    return () => clearTimeout(t);
  }, [combo]);
  useEffect(() => {
    if (!pop) return;
    const t = setTimeout(() => setPop(null), 1400);
    return () => clearTimeout(t);
  }, [pop]);
  const cost = gift ? giftCost(gift.price, quantity, chosen.length) : 0;
  const tooMuch = cost > balance;
  const level = levelProgress(wealthPoints, thresholds);

  const toggle = (id: string) => setPicked((s) => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const toggleAll = () => setPicked(allPicked ? new Set() : new Set(targets.map((t) => t.person.auth_id)));

  // Lucky/crazy: every tap is its own throw; taps don't wait for each other (max 3 at once) and the box stays open.
  async function throwLucky() {
    if (!gift) return;
    if (!chosen.length) { toast.error("اختار مين هياخد الهدية"); return; }
    if (tooMuch) { toast.error("رصيدك من الكوينز مش كفاية"); return; }
    if (inFlight.current >= 3) return;
    const now = Date.now();
    const count = nextCombo(combo, lastTap.current, now);
    lastTap.current = now;
    setCombo(count);
    inFlight.current += 1;
    try {
      const result = await sendLuckyGift(roomId, gift.key, quantity, chosen);
      if (result.multiplier > 0) { setPop({ key: now, multiplier: result.multiplier, prize: result.prize }); playWinSound(result.multiplier); }
      onLucky({ gift, quantity, result, combo: count, to: targets.filter((t) => chosen.includes(t.person.auth_id)).map((t) => t.person) });
    } catch (e) {
      setCombo(0);
      toast.error(giftErrorMessage((e as { hint?: string } | null)?.hint));
    } finally { inFlight.current -= 1; }
  }

  async function send() {
    if (lucky) { void throwLucky(); return; }
    if (!gift || sending) return;
    if (!chosen.length) { toast.error("اختار مين هياخد الهدية"); return; }
    if (tooMuch) { toast.error("رصيدك من الكوينز مش كفاية"); return; }
    setSending(true);
    try {
      const total = await sendRoomGift(roomId, gift.key, quantity, chosen);
      onSent({ gift, quantity, total, to: targets.filter((t) => chosen.includes(t.person.auth_id)).map((t) => t.person) });
    } catch (e) {
      toast.error(giftErrorMessage((e as { hint?: string } | null)?.hint));
    } finally { setSending(false); }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="mx-auto flex max-h-[75dvh] w-full max-w-md flex-col gap-0 rounded-t-3xl border-0 p-0 [&>button]:hidden">
        <SheetTitle className="sr-only">صندوق الهدايا</SheetTitle>

        {/* Who gets the gift */}
        <div className="flex items-center gap-2 px-3 pt-4">
          <button type="button" onClick={toggleAll} disabled={!targets.length} aria-pressed={allPicked}
            className={`inline-flex h-9 shrink-0 items-center gap-1 rounded-full px-3 text-sm font-bold transition disabled:opacity-40 ${allPicked ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground"}`}>
            <Users className="size-4" /> الجميع
          </button>
          <div className="flex min-w-0 flex-1 gap-2.5 overflow-x-auto py-1 ps-1" role="group" aria-label="اختار مين هياخد الهدية">
            {targets.length === 0 && <p className="self-center text-xs text-muted-foreground">مفيش حد على المايك دلوقتي</p>}
            {targets.map(({ person, seat }) => {
              const on = picked.has(person.auth_id);
              return (
                <button key={person.auth_id} type="button" onClick={() => toggle(person.auth_id)} aria-pressed={on}
                  aria-label={`${person.display_name}${seat ? ` — مايك ${seat}` : ""}`}
                  className="relative shrink-0 transition active:scale-95">
                  <TargetAvatar person={person} className={`size-11 ring-2 transition ${on ? "ring-primary" : "opacity-55 ring-transparent"}`} />
                  {seat !== undefined && (
                    <span className={`absolute -bottom-0.5 -start-0.5 grid size-4 place-items-center rounded-full text-[9px] font-black tabular-nums ${on ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground"}`}>
                      {seat}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* My wealth level */}
        <div className="px-4 pb-3 pt-3">
          <div className="h-1.5 overflow-hidden rounded-full bg-secondary">
            <div className="h-full rounded-full bg-rank-crystal transition-all" style={{ width: `${level.percent}%` }} />
          </div>
          <p className="mt-1.5 flex items-center justify-between text-xs text-muted-foreground">
            <span>{level.next ? <>لا يزال بحاجة إلى <bdi dir="ltr">{level.remaining.toLocaleString("en")}</bdi> للترقية</> : "أعلى مستوى"}</span>
            <span className="font-bold text-rank-crystal" dir="ltr">LV{level.level}</span>
          </p>
        </div>

        <div className="flex gap-5 border-t border-border px-4 pt-3" role="tablist">
          {TABS.map((t) => (
            <button key={t.kind} type="button" role="tab" aria-selected={tab === t.kind} onClick={() => setTab(t.kind)}
              className={`relative inline-flex items-center gap-1 pb-2 text-sm font-bold transition ${tab === t.kind ? "text-foreground" : "text-muted-foreground"}`}>
              {t.kind === "lucky" && <Clover className="size-4 text-rank-crystal" />}
              {t.kind === "crazy" && <Flame className="size-4 text-destructive" />}
              {t.label}
              {tab === t.kind && <span className="absolute inset-x-1/4 bottom-0 h-1 rounded-full bg-foreground" />}
            </button>
          ))}
        </div>

        {/* Gifts */}
        <div className="min-h-0 flex-1 overflow-y-auto px-3 py-3">
          {failed ? (
            <p className="py-10 text-center text-sm text-muted-foreground">الهدايا مش جاهزة لسه. اتأكد إن تحديث الهدايا اتشغّل في قاعدة البيانات</p>
          ) : !gifts ? (
            <div className="grid place-items-center py-10"><Loader2 className="size-6 animate-spin" aria-label="جاري التحميل" /></div>
          ) : (
            shown.length === 0 ? <p className="py-10 text-center text-sm text-muted-foreground">{lucky ? "هدايا الحظ مش جاهزة لسه. اتأكد إن تحديث 026 اتشغّل في قاعدة البيانات" : "مفيش هدايا هنا"}</p> :
            <div className="grid grid-cols-4 gap-2">
              {shown.map((g) => (
                <button key={g.key} type="button" onClick={() => setGiftKey(g.key)} aria-pressed={giftKey === g.key}
                  aria-label={g.video ? `${g.name} — هدية فيديو` : undefined}
                  className={`relative flex flex-col items-center rounded-2xl border-2 p-1.5 transition ${giftKey === g.key ? "border-rank-crystal bg-secondary/60" : "border-transparent"}`}>
                  {g.kind !== "normal" && (
                    <span className={`absolute start-1 top-1 z-10 rounded-full px-1.5 text-[10px] font-black tabular-nums animate-[lucky-shine_1.6s_ease-in-out_infinite] ${g.kind === "crazy" ? "bg-destructive text-destructive-foreground" : "bg-rank-crystal text-vip-on"}`} dir="ltr">
                      x{maxMultiplier(g.kind)}
                    </span>
                  )}
                  {g.video && (
                    <span className="absolute end-1 top-1 grid size-5 place-items-center rounded-full bg-rank-crystal text-vip-on" title="هدية فيديو">
                      <Play className="size-3 fill-current" />
                    </span>
                  )}
                  <img src={g.art} alt="" loading="lazy" width={256} height={256} className="aspect-square w-full object-contain" />
                  <span className="mt-1 w-full truncate text-center text-xs">{g.name}</span>
                  <span className="mt-0.5 inline-flex items-center gap-0.5 text-xs font-bold tabular-nums text-muted-foreground">
                    {g.price.toLocaleString("en")} <img src={coinIcon} alt="" className="size-3.5" />
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>

        {lucky && (combo > 0 || pop) && (
          <div className="pointer-events-none relative h-0">
            <div className="absolute -top-16 inset-x-0 flex flex-col items-center gap-1">
              {pop && (
                <p key={pop.key} className={`animate-[lucky-pop_1.4s_ease-out_forwards] text-3xl font-black tabular-nums drop-shadow ${pop.multiplier >= 100 ? "text-destructive" : "text-rank-crystal"}`} dir="ltr">
                  x{pop.multiplier} · +{pop.prize.toLocaleString("en")}
                </p>
              )}
              {combo > 0 && <p key={combo} className="animate-[lucky-pop_1.2s_ease-out_forwards] rounded-full bg-overlay px-3 py-0.5 text-sm font-black text-foreground" dir="ltr">Combo x{combo}</p>}
            </div>
          </div>
        )}

        {/* Balance, count and send */}
        <div className="flex items-center gap-3 border-t border-border px-4 pb-5 pt-3">
          <p className="inline-flex items-center gap-1 text-lg font-black tabular-nums" aria-label={`رصيدك ${balance} كوينز`}>
            <img src={coinIcon} alt="" className="size-6" />
            <bdi dir="ltr">{balance.toLocaleString("en")}</bdi>
          </p>
          <div className="ms-auto flex h-11 items-stretch overflow-hidden rounded-full border-2 border-rank-crystal">
            <DropdownMenu dir="rtl">
              <DropdownMenuTrigger asChild>
                <button type="button" aria-label={`العدد ${quantity}`} className="inline-flex items-center gap-1 px-3 font-bold tabular-nums">
                  {quantity} <ChevronDown className="size-4" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="center" className="min-w-20">
                {quantities.map((q) => (
                  <DropdownMenuItem key={q} onSelect={() => setQuantity(q)} className="justify-center font-bold tabular-nums">{q}</DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
            <Button type="button" onClick={send} disabled={!gift || sending || !chosen.length}
              className="h-full rounded-none rounded-e-full bg-rank-crystal px-6 text-base font-bold text-vip-on hover:bg-rank-crystal/90">
              {sending ? <Loader2 className="animate-spin" /> : lucky ? <span className="inline-flex items-center gap-1"><Zap className="size-4 fill-current" />{combo ? <bdi dir="ltr">x{combo}</bdi> : "ارمي"}</span> : "ارسال"}
            </Button>
          </div>
        </div>
        {gift && chosen.length > 0 && (
          <p className={`-mt-3 px-4 pb-4 text-xs ${tooMuch ? "text-destructive" : "text-muted-foreground"}`}>
            {tooMuch ? "رصيدك من الكوينز مش كفاية · " : ""}
            التكلفة <bdi dir="ltr">{cost.toLocaleString("en")}</bdi> كوينز ({chosen.length > 1 ? `${chosen.length} أشخاص` : "شخص واحد"} × {quantity})
          </p>
        )}
      </SheetContent>
    </Sheet>
  );
}

function TargetAvatar({ person, className = "" }: { person: RoomPerson; className?: string }) {
  return person.avatar_url ? (
    <img src={person.avatar_url} alt="" className={`shrink-0 rounded-full object-cover ${className}`} />
  ) : (
    <span className={`grid shrink-0 place-items-center rounded-full bg-secondary font-bold text-secondary-foreground ${className}`}>
      {person.display_name.trim().charAt(0) || "؟"}
    </span>
  );
}
