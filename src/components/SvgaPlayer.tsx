import { useEffect, useRef, useState, type ReactNode } from "react";

type SvgaModule = typeof import("svgaplayerweb");
type VideoItem = InstanceType<SvgaModule["VideoEntity"]>;

/** The player library touches `window` when it loads, so it is only ever loaded in the browser, once. */
let lib: Promise<SvgaModule> | null = null;
const loadLib = () =>
  (lib ??= import("svgaplayerweb").then((m) => ((m as unknown as { default?: SvgaModule }).default ?? m) as SvgaModule));

/** Each animation file is downloaded and parsed once, then shared by every player showing it (room seats, previews). */
const parsed = new Map<string, Promise<VideoItem>>();
function loadItem(url: string): Promise<VideoItem> {
  let p = parsed.get(url);
  if (!p) {
    p = loadLib().then((SVGA) => new Promise<VideoItem>((resolve, reject) => {
      new SVGA.Parser().load(url, resolve, (e) => reject(e ?? new Error("svga")));
    }));
    p.catch(() => parsed.delete(url));
    parsed.set(url, p);
  }
  return p;
}

/**
 * Plays an SVGA animation inside its box (sized by className), looping forever and fitted without cropping.
 * Until it is ready, or if it cannot play, `fallback` (usually the item's still picture) shows instead.
 * className must give the box its size and a position (relative or absolute); the library scales its own canvas to it.
 */
export function SvgaPlayer({ url, fallback = null, className = "" }: { url: string; fallback?: ReactNode; className?: string }) {
  const box = useRef<HTMLDivElement>(null);
  const [state, setState] = useState<"loading" | "playing" | "failed">("loading");

  useEffect(() => {
    const el = box.current;
    if (!el) return;
    let active = true;
    let player: InstanceType<SvgaModule["Player"]> | null = null;
    setState("loading");
    Promise.all([loadLib(), loadItem(url)])
      .then(([SVGA, item]) => {
        if (!active) return;
        player = new SVGA.Player(el);
        player.loops = 0;
        player.clearsAfterStop = false;
        player.setContentMode("AspectFit");
        player.setVideoItem(item);
        player.startAnimation();
        setState("playing");
      })
      .catch(() => { if (active) setState("failed"); });
    return () => {
      active = false;
      if (player) {
        player.stopAnimation(true);
        player.clear();
      }
      el.querySelectorAll("canvas").forEach((c) => c.remove());
    };
  }, [url]);

  return (
    <span className={`block overflow-hidden ${className}`}>
      <div ref={box} dir="ltr" aria-hidden className={`absolute inset-0 ${state === "playing" ? "" : "invisible"}`} />
      {state !== "playing" && fallback}
    </span>
  );
}
