import { NO_POSTER } from "@/lib/video-poster";
import { useRoomVideo } from "@/lib/use-room-video";
import type { GiftShow } from "@/lib/gifts";

/**
 * Full-room video for a video gift. Tries to play with sound; when the browser refuses
 * (no tap yet), plays muted. Plays once and always ends (see useRoomVideo).
 */
export function GiftVideo({ show, sender, onDone }: { show: GiftShow; sender?: string | undefined; onDone: () => void }) {
  const { videoProps, visible, ended } = useRoomVideo(onDone, { loadingMs: 12000, longestMs: 30000 });
  if (ended) return null;
  return (
    <div className="pointer-events-none absolute inset-0 z-50 grid place-items-center overflow-hidden" aria-live="polite">
      <video {...videoProps} src={show.video_url} poster={NO_POSTER}
        className={`h-full w-full object-contain transition-opacity duration-200 ${visible ? "opacity-100" : "opacity-0"}`} />
      <p className="absolute inset-x-4 top-24 mx-auto w-fit max-w-full truncate rounded-full bg-overlay px-4 py-1.5 text-sm font-bold text-on-media animate-in fade-in slide-in-from-top-2 duration-500">
        {sender ? `${sender} بعت ` : ""}{show.gift_name || "هدية"} ×{show.quantity}{show.recipients > 1 ? ` لـ ${show.recipients} أشخاص` : ""}
      </p>
    </div>
  );
}
