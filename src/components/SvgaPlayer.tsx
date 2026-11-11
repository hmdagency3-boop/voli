import { Alert, Spin } from "antd";
import { useEffect, useRef, useState } from "react";

type SvgaLib = {
  Parser: new () => { load: (url: string, ok: (v: unknown) => void, fail?: (e: unknown) => void) => void };
  Player: new (el: HTMLElement) => { loops: number; setVideoItem: (v: unknown) => void; startAnimation: () => void; stopAnimation: (clear?: boolean) => void; clear: () => void };
};
let lib: Promise<SvgaLib> | null = null;
/** The web SVGA player loads only in the browser (it needs window). */
const loadLib = () => (lib ??= import("svgaplayerweb").then((m) => ((m as unknown as { default?: SvgaLib }).default ?? (m as unknown as SvgaLib))));

/** Plays an .svga file (link or blob link) over a dark background with an optional sample avatar under it. */
export function SvgaPlayer({ src, size = 300, avatar }: { src: string; size?: number; avatar?: number }) {
  const box = useRef<HTMLDivElement>(null);
  const [state, setState] = useState<"loading" | "ok" | "error">("loading");
  useEffect(() => {
    let stop: (() => void) | undefined, live = true;
    setState("loading");
    loadLib().then((SVGA) => {
      if (!live || !box.current) return;
      const player = new SVGA.Player(box.current);
      player.loops = 0;
      new SVGA.Parser().load(src, (v) => {
        if (!live) return;
        player.setVideoItem(v); player.startAnimation(); setState("ok");
      }, () => live && setState("error"));
      stop = () => { player.stopAnimation(true); player.clear(); };
    }).catch(() => live && setState("error"));
    return () => { live = false; stop?.(); };
  }, [src]);
  return (
    <div style={{ position: "relative", width: size, height: size, margin: "0 auto", borderRadius: 12, background: "#1b1c22" }}>
      {avatar ? (
        <div style={{
          position: "absolute", left: "50%", top: "50%", width: size * avatar, height: size * avatar, transform: "translate(-50%,-50%)",
          borderRadius: "50%", background: "radial-gradient(circle at 50% 38%, #8a8fa3 0 18%, #5b6072 19% 100%)",
        }} />
      ) : null}
      <div ref={box} data-testid="svga-player" style={{ position: "absolute", inset: 0 }} />
      {state === "loading" && <Spin style={{ position: "absolute", left: "50%", top: "50%", transform: "translate(-50%,-50%)" }} />}
      {state === "error" && <Alert type="error" showIcon message="تعذّر تشغيل ملف SVGA" style={{ position: "absolute", insetInline: 12, top: 12 }} />}
    </div>
  );
}
