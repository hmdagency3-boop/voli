import type { ReactNode } from "react";
import { SvgaPlayer } from "@/components/SvgaPlayer";

const FRAME_BOX =
  "pointer-events-none absolute left-1/2 top-1/2 z-10 aspect-square w-[150%] max-w-none -translate-x-1/2 -translate-y-1/2 select-none";

/**
 * A store frame (headwear) drawn around a round profile picture. The frame is square with an empty middle;
 * it is drawn larger than the picture so its ring sits outside it, and never blocks taps. A frame with an
 * SVGA animation plays it on a loop in the same square; otherwise (or while it loads) its still picture shows.
 */
export function HeadwearFrame({ art, svga, children, className = "" }: {
  art?: string | null | undefined; svga?: string | null | undefined; children: ReactNode; className?: string;
}) {
  if (!art && !svga) return <>{children}</>;
  const still = art ? <img src={art} alt="" aria-hidden draggable={false} className="size-full object-contain" /> : null;
  return (
    <span className={`relative inline-grid shrink-0 ${className}`}>
      {children}
      {svga
        ? <SvgaPlayer url={svga} fallback={still} className={FRAME_BOX} />
        : <img src={art!} alt="" aria-hidden draggable={false} className={`${FRAME_BOX} object-contain`} />}
    </span>
  );
}
