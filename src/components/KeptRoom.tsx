import { useEffect } from "react";
import { useNavigate, useRouterState } from "@tanstack/react-router";
import { X } from "lucide-react";
import { RoomView } from "@/components/RoomView";
import { closeRoom, isRoomOnScreen, useKeptRoom } from "@/lib/room-keeper";
import { useAccount } from "@/hooks/use-account";

/**
 * The kept room: full screen on its own page, otherwise hidden but still connected, with a
 * floating bubble to go back in or leave. Leaving a room page that never got inside drops it.
 */
export function KeptRoom() {
  const { publicId, info } = useKeptRoom();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const { session, ready } = useAccount();
  const navigate = useNavigate();
  const onScreen = isRoomOnScreen(pathname, publicId);
  const inside = !!info?.inside;

  useEffect(() => {
    if (!publicId) return;
    if ((ready && !session) || (!onScreen && !inside)) closeRoom();
  }, [publicId, onScreen, inside, ready, session]);

  if (!publicId) return null;
  return (
    <>
      <div className={onScreen ? "fixed inset-0 z-40" : "hidden"} aria-hidden={!onScreen}>
        <RoomView key={publicId} publicId={publicId} minimized={!onScreen} />
      </div>
      {!onScreen && inside && (
        <div className="fixed bottom-24 start-3 z-40 flex items-center gap-1 rounded-full bg-card/95 p-1 shadow-lg ring-1 ring-border backdrop-blur" dir="rtl">
          <button type="button" onClick={() => navigate({ to: "/room/$publicId", params: { publicId } })}
            aria-label={`رجوع لروم ${info?.name ?? ""}`} className="relative size-14 shrink-0 overflow-hidden rounded-full ring-2 ring-primary">
            {info?.picture
              ? <img src={info.picture} alt="" className="size-full animate-[spin_8s_linear_infinite] object-cover" />
              : <span className="grid size-full place-items-center bg-secondary text-lg font-bold text-secondary-foreground">{info?.name.trim().charAt(0) || "؟"}</span>}
            <span aria-hidden className="absolute inset-x-0 bottom-1 flex h-3 items-end justify-center gap-0.5">
              {[0, 1, 2].map((i) => (
                <span key={i} className={`w-0.5 rounded-full bg-on-media ${info?.speaking ? "animate-pulse" : ""}`}
                  style={{ height: info?.speaking ? `${[60, 100, 75][i]}%` : "35%", animationDelay: `${i * 150}ms` }} />
              ))}
            </span>
          </button>
          <button type="button" onClick={closeRoom} aria-label="خروج من الروم"
            className="grid size-9 place-items-center rounded-full bg-muted text-muted-foreground transition hover:text-foreground">
            <X className="size-4" />
          </button>
        </div>
      )}
    </>
  );
}
