import { useEffect, useRef, useState } from "react";
import { NO_POSTER } from "@/lib/video-poster";
import type { GiftShow } from "@/lib/gifts";

/** Longest a gift video may hold the room, in case it never reports that it ended. */
const MAX_MS = 30000;

/**
 * Full-room video for a video gift. Tries to play with sound; when the browser refuses
 * (no tap yet), plays muted. Ends on its own, on error, or after MAX_MS.
 */
export function GiftVideo({ show, sender, onDone }: { show: GiftShow; sender?: string | undefined; onDone: () => void }) {
  const ref = useRef<HTMLVideoElement>(null);
  /** Hidden until the first frame plays, so the phone's grey play-button placeholder never shows. */
  const [playing, setPlaying] = useState(false);
  const done = useRef(onDone);
  done.current = onDone;

  useEffect(() => {
    const v = ref.current;
    const finish = () => done.current();
    if (v) {
      v.muted = false;
      v.play().catch(() => { v.muted = true; v.play().catch(finish); });
    }
    const t = setTimeout(finish, MAX_MS);
    return () => clearTimeout(t);
  }, [show.id]);

  return (
    <div className="pointer-events-none absolute inset-0 z-50 grid place-items-center overflow-hidden" aria-live="polite">
      <video ref={ref} src={show.video_url} poster={NO_POSTER} playsInline preload="auto"
          onPlaying={() => setPlaying(true)} onEnded={() => done.current()} onError={() => done.current()}
        onTimeUpdate={(e) => { const v = e.currentTarget; if (Number.isFinite(v.duration) && v.duration > 0 && v.currentTime >= v.duration - 0.1) done.current(); }}
        className={`h-full w-full object-contain transition-opacity duration-200 ${playing ? "opacity-100" : "opacity-0"}`} />
      <p className="absolute inset-x-4 top-24 mx-auto w-fit max-w-full truncate rounded-full bg-overlay px-4 py-1.5 text-sm font-bold text-on-media animate-in fade-in slide-in-from-top-2 duration-500">
        {sender ? `${sender} بعت ` : ""}{show.gift_name || "هدية"} ×{show.quantity}{show.recipients > 1 ? ` لـ ${show.recipients} أشخاص` : ""}
      </p>
    </div>
  );
}
