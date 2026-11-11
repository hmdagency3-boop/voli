import { CaretRightOutlined, PauseOutlined } from "@ant-design/icons";
import { Button, Segmented, Slider, Space, Switch, Typography } from "antd";
import { useEffect, useRef, useState } from "react";
import { apply, hitLayer, mirrorMat, mul, restMatrix, type Design } from "@/lib/svga/motion";
import { build, drawFrame, type Built } from "@/lib/svga/render";

type Bg = "dark" | "light" | "check";
const BG: Record<Bg, string> = { dark: "#1b1c22", light: "#f2f3f5", check: "" };

/** Live preview of the frame (same sprites as the exported file) with drag-to-move for pieces. */
export function Preview({ design, selected, onSelect, onMove, onBuilt }: {
  design: Design; selected: string | null;
  onSelect: (id: string | null) => void;
  /** Move by (dx, dy) frame units; begin=true on the first move of a drag. */
  onMove: (id: string, dx: number, dy: number, begin: boolean) => void;
  onBuilt?: (b: Built) => void;
}) {
  const ref = useRef<HTMLCanvasElement>(null);
  const [built, setBuilt] = useState<Built | null>(null);
  const [playing, setPlaying] = useState(true);
  const [frame, setFrame] = useState(0);
  const [bg, setBg] = useState<Bg>("dark");
  const [guide, setGuide] = useState(true);
  const [outline, setOutline] = useState(true);
  const drag = useRef<{ id: string; mirrored: boolean; x: number; y: number; moved: boolean } | null>(null);
  const view = 420;

  useEffect(() => {
    let live = true;
    const t = setTimeout(() => { build(design).then((b) => { if (live) { setBuilt(b); onBuilt?.(b); } }).catch(() => undefined); }, 60);
    return () => { live = false; clearTimeout(t); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [design]);

  const frames = built?.plan.frames ?? 1;
  useEffect(() => {
    if (!playing) return;
    let raf = 0; const start = performance.now() - (frame / design.fps) * 1000;
    const tick = (now: number) => { setFrame(Math.floor(((now - start) / 1000) * design.fps) % frames); raf = requestAnimationFrame(tick); };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playing, frames, design.fps]);

  useEffect(() => {
    const c = ref.current; if (!c || !built) return;
    const dpr = window.devicePixelRatio || 1;
    if (c.width !== view * dpr) { c.width = view * dpr; c.height = view * dpr; }
    const x = c.getContext("2d")!;
    const scale = (view * dpr) / design.size;
    x.setTransform(1, 0, 0, 1, 0, 0);
    x.clearRect(0, 0, c.width, c.height);
    if (guide) {
      const r = (design.size * design.avatar * scale) / 2, m = c.width / 2;
      const g = x.createRadialGradient(m, m - r * 0.25, r * 0.1, m, m, r);
      g.addColorStop(0, "#9aa0b4"); g.addColorStop(1, "#4d5263");
      x.fillStyle = g; x.beginPath(); x.arc(m, m, r, 0, Math.PI * 2); x.fill();
      x.fillStyle = "#c9cdd8"; x.beginPath(); x.arc(m, m - r * 0.22, r * 0.3, 0, Math.PI * 2); x.fill();
      x.beginPath(); x.ellipse(m, m + r * 0.55, r * 0.55, r * 0.38, 0, Math.PI, 0); x.fill();
    }
    drawFrame(x, built, Math.min(frame, built.plan.frames - 1), scale);
    const l = design.layers.find((i) => i.id === selected);
    if (outline && l && l.visible) {
      const ms = [restMatrix(l)];
      if (l.mirror) ms.push(mul(mirrorMat(design.size), ms[0]!));
      x.setTransform(1, 0, 0, 1, 0, 0);
      ms.forEach((m, i) => {
        const pts = ([[0, 0], [l.w, 0], [l.w, l.h], [0, l.h]] as const).map(([u, v]) => apply(m, u, v));
        x.strokeStyle = i ? "rgba(64,169,255,0.5)" : "#40a9ff"; x.lineWidth = 1.5 * dpr; x.setLineDash([6 * dpr, 4 * dpr]);
        x.beginPath(); pts.forEach(([px, py], j) => (j ? x.lineTo(px * scale, py * scale) : x.moveTo(px * scale, py * scale))); x.closePath(); x.stroke();
        const [px, py] = apply(m, l.pivotX * l.w, l.pivotY * l.h);
        x.setLineDash([]); x.fillStyle = "#ff4d4f"; x.beginPath(); x.arc(px * scale, py * scale, 4 * dpr, 0, Math.PI * 2); x.fill();
      });
    }
  }, [built, frame, guide, outline, selected, design]);

  const toUnits = (e: React.PointerEvent) => {
    const r = ref.current!.getBoundingClientRect();
    return [((e.clientX - r.left) / r.width) * design.size, ((e.clientY - r.top) / r.height) * design.size] as const;
  };
  return (
    <div>
      <canvas ref={ref} aria-label="معاينة الإطار" style={{
        width: "100%", maxWidth: view, aspectRatio: "1", display: "block", margin: "0 auto", borderRadius: 12, cursor: "grab", touchAction: "none",
        background: bg === "check" ? "repeating-conic-gradient(#d9d9d9 0 25%, #fff 0 50%) 50% / 20px 20px" : BG[bg],
      }}
        onPointerDown={(e) => {
          const [x, y] = toUnits(e);
          const hit = hitLayer(design, x, y);
          onSelect(hit?.id ?? null);
          if (hit) { drag.current = { ...hit, x, y, moved: false }; (e.target as HTMLElement).setPointerCapture(e.pointerId); }
        }}
        onPointerMove={(e) => {
          const d = drag.current; if (!d) return;
          const [x, y] = toUnits(e);
          const dx = x - d.x, dy = y - d.y;
          if (!d.moved && Math.hypot(dx, dy) < 1) return;
          onMove(d.id, d.mirrored ? -dx : dx, dy, !d.moved);
          d.moved = true; d.x = x; d.y = y;
        }}
        onPointerUp={() => { drag.current = null; }} />
      <Space wrap style={{ marginTop: 12, width: "100%", justifyContent: "center" }}>
        <Button shape="circle" icon={playing ? <PauseOutlined /> : <CaretRightOutlined />} onClick={() => setPlaying((p) => !p)} aria-label={playing ? "إيقاف" : "تشغيل"} />
        <Slider style={{ width: 220 }} min={0} max={Math.max(0, frames - 1)} value={Math.min(frame, frames - 1)}
          onChange={(v) => { setPlaying(false); setFrame(v as number); }} tooltip={{ formatter: (v) => `فريم ${(v ?? 0) + 1} من ${frames}` }} />
        <Typography.Text type="secondary" style={{ fontVariantNumeric: "tabular-nums" }}>{((Math.min(frame, frames - 1)) / design.fps).toFixed(2)}ث</Typography.Text>
      </Space>
      <Space wrap style={{ marginTop: 8, width: "100%", justifyContent: "center" }}>
        <Segmented<Bg> size="small" value={bg} onChange={setBg} options={[{ value: "dark", label: "غامق" }, { value: "light", label: "فاتح" }, { value: "check", label: "شفاف" }]} />
        <span><Switch size="small" checked={guide} onChange={setGuide} /> صورة العضو</span>
        <span><Switch size="small" checked={outline} onChange={setOutline} /> حدود القطعة</span>
      </Space>
    </div>
  );
}
