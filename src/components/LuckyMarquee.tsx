import { useEffect, useRef, useState } from "react";
import { Flame } from "lucide-react";
import { bigWinsSince, latestSpin, type BigWin } from "@/lib/lucky";

/** Banner that flies across the top of every room when anyone, in any room, hits a big lucky/crazy multiplier. */
export function LuckyMarquee({ active }: { active: boolean }) {
  const [queue, setQueue] = useState<BigWin[]>([]);
  const cursor = useRef<number | null>(null);

  useEffect(() => {
    if (!active) { setQueue([]); return; }
    let live = true;
    let busy = false;
    const check = async () => {
      if (busy) return;
      busy = true;
      try {
        if (cursor.current === null) { cursor.current = await latestSpin(); return; }
        const wins = await bigWinsSince(cursor.current);
        if (!live || !wins.length) return;
        cursor.current = Math.max(cursor.current, ...wins.map((w) => w.id));
        setQueue((q) => [...q, ...wins].slice(-5));
      } finally { busy = false; }
    };
    void check();
    const t = setInterval(check, 4000);
    return () => { live = false; clearInterval(t); };
  }, [active]);

  const win = queue[0];
  if (!win) return null;
  return (
    <div className="pointer-events-none fixed inset-x-0 top-14 z-50 overflow-hidden" role="status" aria-live="polite">
      <div key={win.id} onAnimationEnd={() => setQueue((q) => q.slice(1))}
        className="inline-flex w-max items-center gap-2 whitespace-nowrap rounded-full bg-destructive px-4 py-1.5 text-sm font-black text-destructive-foreground shadow-lg animate-[lucky-marquee_9s_linear_forwards]">
        <Flame className="size-4" />
        <span>{win.sender_name} كسب <bdi dir="ltr">x{win.multiplier}</bdi> من {win.gift_name} = <bdi dir="ltr">{win.prize.toLocaleString("en")}</bdi> كوينز في روم {win.room_name}</span>
        <Flame className="size-4" />
      </div>
    </div>
  );
}
