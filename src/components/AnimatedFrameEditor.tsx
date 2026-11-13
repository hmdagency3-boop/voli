import { AimOutlined, BgColorsOutlined, PictureOutlined, ReloadOutlined } from "@ant-design/icons";
import { Alert, Button, Col, ColorPicker, Modal, Progress, Row, Segmented, Slider, Space, Switch, Tabs, Tag, Typography, Upload } from "antd";
import { useEffect, useMemo, useRef, useState } from "react";
import { giftArtProblem } from "@/lib/admin";
import {
  EFFECTS_DEFAULT, encodeAnimatedFrame, extractFrames, FRAME_FPS, FRAME_MAX_FRAMES, FRAME_MAX_SECONDS, FRAME_SIZES, frameCount, keyFrame,
  loadVideo, renderFrame, stepImage, webpEncodeSupported, type FrameEffects, type Keyed,
} from "@/lib/animated-frame";
import { CHROMA_DEFAULT, estimateKey, hexRgb, rgbHex, type ChromaSettings } from "@/lib/chroma-key";
import { buildSequence, CROP_DEFAULT, CROP_MIN_ZOOM, cropRect, sparkleAnchors, type Crop, type LoopMode } from "@/lib/frame-motion";

const CHECKER: React.CSSProperties = {
  backgroundColor: "#fff", backgroundImage: "repeating-conic-gradient(#d9d9d9 0% 25%, #fff 0% 50%)", backgroundSize: "20px 20px",
};
const BG = { checker: CHECKER, dark: { background: "#14151a" }, light: { background: "#f3f0ff" } } as const;
type Bg = keyof typeof BG;
type View = "preview" | "crop";
const PREVIEW = 320;
const kb = (n: number) => (n >= 1024 * 1024 ? `${(n / 1024 / 1024).toFixed(2)} ميجا` : `${Math.round(n / 1024)} ك.ب`);

/** Placeholder member photo for the preview (or the admin's own test photo). */
function drawAvatar(g: CanvasRenderingContext2D, cx: number, cy: number, r: number, img: HTMLImageElement | null) {
  g.save();
  g.beginPath(); g.arc(cx, cy, r, 0, Math.PI * 2); g.clip();
  if (img) {
    const k = (2 * r) / Math.min(img.naturalWidth, img.naturalHeight);
    g.drawImage(img, cx - (img.naturalWidth * k) / 2, cy - (img.naturalHeight * k) / 2, img.naturalWidth * k, img.naturalHeight * k);
  } else {
    const grd = g.createLinearGradient(cx - r, cy - r, cx + r, cy + r);
    grd.addColorStop(0, "#6c7bd9"); grd.addColorStop(1, "#c86dd7");
    g.fillStyle = grd; g.fillRect(cx - r, cy - r, 2 * r, 2 * r);
    g.fillStyle = "rgba(255,255,255,.85)";
    g.beginPath(); g.arc(cx, cy - r * 0.18, r * 0.34, 0, Math.PI * 2); g.fill();
    g.beginPath(); g.ellipse(cx, cy + r * 0.78, r * 0.68, r * 0.55, 0, 0, Math.PI * 2); g.fill();
  }
  g.restore();
}

function AvatarCanvas({ ratio, img, size }: { ratio: number; img: HTMLImageElement | null; size: number }) {
  const [c, setC] = useState<HTMLCanvasElement | null>(null);
  useEffect(() => {
    if (!c) return;
    c.width = c.height = size;
    const g = c.getContext("2d")!;
    g.clearRect(0, 0, size, size);
    drawAvatar(g, size / 2, size / 2, (size * ratio) / 200, img);
  }, [c, ratio, img, size]);
  return <canvas ref={setC} style={{ position: "absolute", inset: 0, width: size, height: size }} />;
}

function Field({ label, children, extra }: { label: React.ReactNode; children: React.ReactNode; extra?: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 10 }}>
      <Typography.Text strong style={{ fontSize: 13 }}>{label}</Typography.Text>
      {children}
      {extra && <Typography.Text type="secondary" style={{ fontSize: 12, display: "block" }}>{extra}</Typography.Text>}
    </div>
  );
}

/**
 * Animated store frame from a green-screen video: square crop, chroma key with halo removal,
 * seamless loop (circular / ping-pong), sparkles / shimmer / glow, live preview over an avatar,
 * then a light animated WebP with real transparency that is previewed again before approval.
 */
export function AnimatedFrameEditor({ source, onCancel, onDone }: { source: File | string | null; onCancel: () => void; onDone: (f: File) => void }) {
  const url = useMemo(() => (source instanceof File ? URL.createObjectURL(source) : source), [source]);
  useEffect(() => () => { if (source instanceof File && url) URL.revokeObjectURL(url); }, [source, url]);
  const name = source instanceof File ? source.name : "frame";
  const supported = useMemo(() => webpEncodeSupported(), []);

  const [video, setVideo] = useState<HTMLVideoElement | null>(null);
  const [dur, setDur] = useState(0);
  const [trim, setTrim] = useState<[number, number]>([0, 3]);
  const [fps, setFps] = useState<number>(15);
  const [size, setSize] = useState<number>(320);
  const [quality, setQuality] = useState(0.8);
  const [crop, setCrop] = useState<Crop>(CROP_DEFAULT);
  const [chroma, setChroma] = useState<ChromaSettings>(CHROMA_DEFAULT);
  const [mode, setMode] = useState<LoopMode>("pingpong");
  const [crossfade, setCrossfade] = useState(4);
  const [fx, setFx] = useState<FrameEffects>(EFFECTS_DEFAULT);
  const [avatarRatio, setAvatarRatio] = useState(64);
  const [avatarImg, setAvatarImg] = useState<HTMLImageElement | null>(null);
  const [bg, setBg] = useState<Bg>("dark");
  const [view, setView] = useState<View>("crop");
  const [picking, setPicking] = useState(false);
  const [raw, setRaw] = useState<ImageData[] | null>(null);
  const [reading, setReading] = useState<number | null>(null);
  const [encoding, setEncoding] = useState<number | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [result, setResult] = useState<{ file: File; url: string } | null>(null);
  const autoKey = useRef(true);
  const encAbort = useRef<AbortController | null>(null);

  // Fresh state for every new video.
  useEffect(() => {
    setVideo(null); setDur(0); setRaw(null); setErr(null); setResult(null); setCrop(CROP_DEFAULT); setChroma(CHROMA_DEFAULT);
    setFx(EFFECTS_DEFAULT); setMode("pingpong"); setView("crop"); setPicking(false); autoKey.current = true;
    if (!url) return;
    let alive = true;
    loadVideo(url).then((v) => {
      if (!alive) return;
      const d = Number.isFinite(v.duration) ? v.duration : 0;
      setDur(d); setTrim([0, Math.min(d, 3)]); setVideo(v);
    }, (e: Error) => alive && setErr(e.message));
    return () => { alive = false; };
  }, [url]);
  useEffect(() => () => { if (result) URL.revokeObjectURL(result.url); }, [result]);

  const maxLen = Math.min(FRAME_MAX_SECONDS, FRAME_MAX_FRAMES / fps);
  const changeTrim = (v: number[]) => {
    let [s, e] = v as [number, number];
    if (e - s > maxLen) { if (s !== trim[0]) e = s + maxLen; else s = e - maxLen; }
    setTrim([Math.max(0, s), Math.min(dur, e)]);
  };
  useEffect(() => { if (trim[1] - trim[0] > maxLen) setTrim([trim[0], trim[0] + maxLen]); }, [maxLen]); // eslint-disable-line react-hooks/exhaustive-deps

  // Read the frames (debounced while sliders move).
  useEffect(() => {
    if (!video || !dur || trim[1] - trim[0] < 0.1) return;
    const ac = new AbortController();
    const t = setTimeout(() => {
      setReading(0);
      extractFrames(video, { start: trim[0], end: trim[1], fps, crop, size }, setReading, ac.signal).then((frames) => {
        if (ac.signal.aborted) return;
        if (autoKey.current && frames[0]) {
          autoKey.current = false;
          const key = estimateKey(frames[0].data, frames[0].width, frames[0].height);
          // Only adopt it when the border really is a screen colour (saturated), otherwise keep pure green.
          if (Math.max(...key) - Math.min(...key) > 60) setChroma((c) => ({ ...c, key }));
        }
        setRaw(frames); setReading(null);
      }, (e: Error & { hint?: string }) => { if (e.hint !== "cancelled") { setErr(e.message); setReading(null); } });
    }, 450);
    return () => { clearTimeout(t); ac.abort(); };
  }, [video, dur, trim, fps, crop, size]);

  // Chroma-keyed frames, computed on demand and cached until the settings change.
  const keyed = useMemo(() => {
    const cache = new Map<number, Keyed>();
    return (i: number): Keyed => {
      let k = cache.get(i);
      if (!k) { k = keyFrame(raw![Math.min(i, raw!.length - 1)]!, chroma); cache.set(i, k); }
      return k;
    };
  }, [raw, chroma]);
  const steps = useMemo(() => buildSequence(raw?.length ?? 0, mode, crossfade), [raw, mode, crossfade]);
  const anchors = useMemo(() => {
    if (!raw || !fx.sparkles) return [];
    const first = keyed(steps[0]?.a ?? 0).data;
    return sparkleAnchors((x, y) => first.data[(y * first.width + x) * 4 + 3]! / 255, first.width, fx.sparkleCount);
  }, [raw, keyed, steps, fx.sparkles, fx.sparkleCount]);

  // Live preview over the avatar.
  const [previewEl, setPreviewEl] = useState<HTMLCanvasElement | null>(null);
  useEffect(() => {
    if (!previewEl || !raw || view !== "preview" || result) return;
    previewEl.width = previewEl.height = PREVIEW;
    const g = previewEl.getContext("2d")!;
    const out = document.createElement("canvas"); out.width = out.height = size;
    const og = out.getContext("2d")!;
    let raf = 0, i = 0, last = 0;
    const draw = () => {
      const step = steps[i % steps.length]!;
      renderFrame(og, stepImage(step, keyed), size, fx, (i % steps.length) / steps.length, anchors);
      g.clearRect(0, 0, PREVIEW, PREVIEW);
      drawAvatar(g, PREVIEW / 2, PREVIEW / 2, (PREVIEW * avatarRatio) / 200, avatarImg);
      g.drawImage(out, 0, 0, PREVIEW, PREVIEW);
    };
    const tick = (now: number) => {
      if (now - last >= 1000 / fps) { last = now; draw(); i = (i + 1) % steps.length; }
      raf = requestAnimationFrame(tick);
    };
    draw();
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [previewEl, raw, view, result, steps, keyed, fx, anchors, size, fps, avatarRatio, avatarImg]);

  // Crop view: the video with the square area; drag to move, wheel / slider to resize, or pick the screen colour.
  const [cropEl, setCropEl] = useState<HTMLCanvasElement | null>(null);
  const [liveVideo, setLiveVideo] = useState<HTMLVideoElement | null>(null);
  const drag = useRef<{ x: number; y: number; c: Crop } | null>(null);
  const geo = useRef({ k: 1, w: 0, h: 0 });
  useEffect(() => {
    if (!cropEl || !liveVideo || view !== "crop" || result) return;
    let raf = 0;
    const g = cropEl.getContext("2d")!;
    const tick = () => {
      const v = liveVideo;
      if (v.readyState >= 2 && v.videoWidth) {
        const k = Math.min(PREVIEW * 1.25 / v.videoWidth, 340 / v.videoHeight);
        const w = Math.round(v.videoWidth * k), h = Math.round(v.videoHeight * k);
        if (cropEl.width !== w || cropEl.height !== h) { cropEl.width = w; cropEl.height = h; }
        geo.current = { k, w, h };
        if (v.currentTime < trim[0] - 0.05 || v.currentTime > trim[1]) v.currentTime = trim[0];
        g.drawImage(v, 0, 0, w, h);
        const { sx, sy, side } = cropRect(v.videoWidth, v.videoHeight, crop);
        const [x, y, s] = [sx * k, sy * k, side * k];
        g.fillStyle = "rgba(0,0,0,.55)";
        g.fillRect(0, 0, w, y); g.fillRect(0, y + s, w, h - y - s); g.fillRect(0, y, x, s); g.fillRect(x + s, y, w - x - s, s);
        g.strokeStyle = "#ffd36b"; g.lineWidth = 2; g.strokeRect(x + 1, y + 1, s - 2, s - 2);
        g.setLineDash([4, 4]); g.strokeStyle = "rgba(255,255,255,.8)";
        g.beginPath(); g.arc(x + s / 2, y + s / 2, (s * avatarRatio) / 200, 0, Math.PI * 2); g.stroke(); g.setLineDash([]);
      }
      raf = requestAnimationFrame(tick);
    };
    tick();
    return () => cancelAnimationFrame(raf);
  }, [cropEl, liveVideo, view, result, crop, trim, avatarRatio]);

  const pointer = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    return { x: ((e.clientX - r.left) / r.width) * geo.current.w, y: ((e.clientY - r.top) / r.height) * geo.current.h };
  };
  const onDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const p = pointer(e);
    if (picking && liveVideo) {
      const s = document.createElement("canvas"); s.width = s.height = 1;
      const sg = s.getContext("2d", { willReadFrequently: true })!;
      const k = geo.current.k;
      sg.drawImage(liveVideo, Math.floor(p.x / k), Math.floor(p.y / k), 1, 1, 0, 0, 1, 1);
      try {
        const [r, g, b] = sg.getImageData(0, 0, 1, 1).data;
        setChroma((c) => ({ ...c, key: [r!, g!, b!] })); autoKey.current = false;
      } catch { setErr("تعذّر قراءة اللون من الفيديو ده."); }
      setPicking(false);
      return;
    }
    e.currentTarget.setPointerCapture(e.pointerId);
    drag.current = { ...p, c: crop };
  };
  const onMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const d = drag.current, v = liveVideo;
    if (!d || !v) return;
    const p = pointer(e), k = geo.current.k;
    const { side } = cropRect(v.videoWidth, v.videoHeight, d.c);
    const half = side / 2;
    const cx = Math.min(1 - half / v.videoWidth, Math.max(half / v.videoWidth, d.c.cx + (p.x - d.x) / k / v.videoWidth));
    const cy = Math.min(1 - half / v.videoHeight, Math.max(half / v.videoHeight, d.c.cy + (p.y - d.y) / k / v.videoHeight));
    setCrop({ ...d.c, cx, cy });
  };
  const onWheel = (e: React.WheelEvent) => setCrop((c) => ({ ...c, zoom: Math.min(1, Math.max(CROP_MIN_ZOOM, c.zoom - e.deltaY * 0.0008)) }));

  const make = async () => {
    if (!raw) return;
    setErr(null); setEncoding(0);
    encAbort.current = new AbortController();
    try {
      const file = await encodeAnimatedFrame({ steps, keyed, size, fps, fx, anchors, quality, name }, setEncoding, encAbort.current.signal);
      const problem = giftArtProblem(file);
      if (problem) throw new Error(`${problem} (${kb(file.size)}). قلّل المقاس أو المدة أو الجودة أو عدد الفريمات في الثانية.`);
      setResult({ file, url: URL.createObjectURL(file) });
    } catch (e) {
      const hint = (e as { hint?: string }).hint;
      if (hint !== "cancelled") setErr((e as Error).message);
    } finally { setEncoding(null); encAbort.current = null; }
  };
  const busy = encoding !== null;
  const cancel = () => { if (busy) encAbort.current?.abort(); else onCancel(); };
  const set = <K extends keyof ChromaSettings>(k: K) => (v: ChromaSettings[K]) => setChroma((c) => ({ ...c, [k]: v }));
  const setF = <K extends keyof FrameEffects>(k: K) => (v: FrameEffects[K]) => setFx((o) => ({ ...o, [k]: v }));
  const n = frameCount(trim[0], trim[1], fps);
  const loopFrames = buildSequence(n, mode, crossfade).length;

  const footer = result ? [
    <Button key="back" onClick={() => setResult(null)}>رجوع للتعديل</Button>,
    <Button key="ok" type="primary" onClick={() => onDone(result.file)}>اعتماد الإطار</Button>,
  ] : [
    <Button key="c" onClick={cancel}>{busy ? "إيقاف" : "إلغاء"}</Button>,
    <Button key="make" type="primary" loading={busy} disabled={!raw || !supported || reading !== null} onClick={make}>إنشاء الإطار المتحرك</Button>,
  ];

  return (
    <Modal open={!!source} title="إطار متحرك من فيديو (شاشة خضراء)" width={980} centered maskClosable={false} destroyOnHidden
      onCancel={cancel} footer={footer}>
      {url && <video ref={setLiveVideo} src={url} crossOrigin="anonymous" muted loop autoPlay playsInline style={{ display: "none" }} />}
      {result ? (
        <Space direction="vertical" size={12} style={{ width: "100%", alignItems: "center" }}>
          <div style={{ ...BG[bg], borderRadius: 12, padding: 16 }}>
            <div style={{ position: "relative", width: PREVIEW, height: PREVIEW }}>
              <AvatarCanvas ratio={avatarRatio} img={avatarImg} size={PREVIEW} />
              <img src={result.url} alt="الإطار المتحرك النهائي" style={{ position: "absolute", inset: 0, width: PREVIEW, height: PREVIEW }} />
            </div>
          </div>
          <Segmented<Bg> value={bg} onChange={setBg} options={[
            { value: "dark", label: "غرفة غامقة" }, { value: "light", label: "غرفة فاتحة" }, { value: "checker", label: "خلفية شفافة" },
          ]} />
          <Space wrap>
            <Tag color="green">Animated WebP شفاف</Tag>
            <Tag>{size}×{size}</Tag>
            <Tag>{steps.length} فريم · {(steps.length / fps).toFixed(1)} ث لكل دورة</Tag>
            <Tag color={result.file.size > 2 * 1024 * 1024 ? "orange" : "blue"}>الحجم {kb(result.file.size)}</Tag>
          </Space>
          <Typography.Text type="secondary">ده الملف النهائي نفسه اللي هيترفع، بيتكرر بلا نهاية. لو مناسب اضغط «اعتماد الإطار».</Typography.Text>
        </Space>
      ) : (
        <Row gutter={20}>
          <Col xs={24} md={11}>
            <Space direction="vertical" size={10} style={{ width: "100%" }}>
              <Segmented<View> block value={view} onChange={(v) => { setView(v); setPicking(false); }} options={[
                { value: "crop", label: "قص المربع / لون الخلفية" }, { value: "preview", label: "معاينة فوق صورة العضو" },
              ]} />
              <div style={{ ...(view === "preview" ? BG[bg] : BG.dark), borderRadius: 12, minHeight: 352, display: "flex", alignItems: "center", justifyContent: "center", padding: 12, position: "relative" }}>
                {view === "crop" ? (
                  <canvas ref={setCropEl} aria-label="منطقة الإطار على الفيديو" onPointerDown={onDown} onPointerMove={onMove}
                    onPointerUp={() => { drag.current = null; }} onWheel={onWheel}
                    style={{ maxWidth: "100%", cursor: picking ? "crosshair" : "move", touchAction: "none", borderRadius: 6 }} />
                ) : raw ? (
                  <canvas ref={setPreviewEl} aria-label="معاينة الإطار فوق صورة العضو" style={{ width: PREVIEW, height: PREVIEW }} />
                ) : <Typography.Text type="secondary">جارٍ تجهيز المعاينة…</Typography.Text>}
              </div>
              {view === "crop" ? (
                <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                  {picking ? "اضغط على الخلفية الخضراء في الفيديو لاختيار لونها." : "اسحب المربع الأصفر لمكان الإطار، والعجلة أو شريط «مقاس منطقة الإطار» لتكبيره وتصغيره. الدائرة المتقطعة = مكان صورة العضو."}
                </Typography.Text>
              ) : (
                <Segmented<Bg> block value={bg} onChange={setBg} options={[
                  { value: "dark", label: "غرفة غامقة" }, { value: "light", label: "غرفة فاتحة" }, { value: "checker", label: "خلفية شفافة" },
                ]} />
              )}
              <Field label={`مقاس صورة العضو داخل الإطار: ${avatarRatio}%`}>
                <Slider min={35} max={95} value={avatarRatio} onChange={setAvatarRatio} />
              </Field>
              <Upload accept="image/*" showUploadList={false} beforeUpload={(f) => {
                const u = URL.createObjectURL(f); const img = new Image(); img.onload = () => setAvatarImg(img); img.src = u; return false;
              }}>
                <Button size="small" icon={<PictureOutlined />}>صورة تجربة للعضو</Button>
              </Upload>
              {reading !== null && <Progress percent={reading} size="small" status="active" format={(p) => `قراءة الفريمات ${p}%`} />}
              {busy && <Progress percent={encoding ?? 0} status="active" format={(p) => `حفظ ${p}%`} />}
            </Space>
          </Col>
          <Col xs={24} md={13}>
            <Tabs size="small" items={[
              { key: "crop", label: "القص والمقاس", children: <>
                <Field label={`مقاس منطقة الإطار: ${Math.round(crop.zoom * 100)}% من الفيديو`}>
                  <Slider min={Math.round(CROP_MIN_ZOOM * 100)} max={100} value={Math.round(crop.zoom * 100)}
                    onChange={(z) => setCrop((c) => ({ ...c, zoom: z / 100 }))} />
                  <Button size="small" icon={<AimOutlined />} onClick={() => setCrop((c) => ({ ...c, cx: 0.5, cy: 0.5 }))}>توسيط</Button>
                </Field>
                <Field label="مقاس الإطار النهائي (بكسل)" extra="320 مناسب لمعظم الشاشات وخفيف.">
                  <Segmented<number> block value={size} onChange={setSize} options={FRAME_SIZES.map((s) => ({ value: s, label: `${s}` }))} />
                </Field>
                <Field label={`الجزء المستخدم من الفيديو: ${trim[0].toFixed(1)} → ${trim[1].toFixed(1)} ث`} extra={`حتى ${maxLen.toFixed(1)} ث. ${n} فريم.`}>
                  <Slider range min={0} max={dur || 1} step={0.05} value={trim} disabled={!dur} onChange={changeTrim} />
                </Field>
                <Field label="فريمات في الثانية" extra="أقل = ملف أخف، أكثر = حركة أنعم.">
                  <Segmented<number> block value={fps} onChange={setFps} options={FRAME_FPS.map((f) => ({ value: f, label: `${f}` }))} />
                </Field>
                <Field label={`جودة الصورة: ${Math.round(quality * 100)}%`}>
                  <Slider min={50} max={95} value={Math.round(quality * 100)} onChange={(q) => setQuality(q / 100)} />
                </Field>
              </> },
              { key: "key", label: "تفريغ الأخضر", children: <>
                <Field label="لون الخلفية المراد إزالتها">
                  <Space wrap>
                    <ColorPicker value={rgbHex(chroma.key)} disabledAlpha onChange={(c) => { autoKey.current = false; set("key")(hexRgb(c.toHexString())); }} />
                    <Button size="small" icon={<BgColorsOutlined />} type={picking ? "primary" : "default"}
                      onClick={() => { setView("crop"); setPicking((p) => !p); }}>التقاط من الفيديو</Button>
                    <Button size="small" icon={<ReloadOutlined />} onClick={() => setChroma((c) => ({ ...CHROMA_DEFAULT, key: c.key }))}>القيم الافتراضية</Button>
                  </Space>
                </Field>
                <Field label={`دقة التفريغ (قرب اللون): ${Math.round(chroma.similarity * 100)}`} extra="زوّدها لو فاضل أخضر، قلّلها لو بدأ الإطار نفسه يختفي.">
                  <Slider min={2} max={45} value={Math.round(chroma.similarity * 100)} onChange={(v) => set("similarity")(v / 100)} />
                </Field>
                <Field label={`تدرّج الحافة: ${Math.round(chroma.smoothness * 100)}`}>
                  <Slider min={1} max={35} value={Math.round(chroma.smoothness * 100)} onChange={(v) => set("smoothness")(v / 100)} />
                </Field>
                <Field label={`إزالة الهالة الخضراء: ${Math.round(chroma.spill * 100)}%`}>
                  <Slider min={0} max={100} value={Math.round(chroma.spill * 100)} onChange={(v) => set("spill")(v / 100)} />
                </Field>
                <Field label={`تقليص الحواف: ${chroma.choke} بكسل`} extra="يقص الخط الأخضر الرفيع اللي حوالين الإطار.">
                  <Slider min={0} max={4} value={chroma.choke} onChange={set("choke")} />
                </Field>
                <Field label={`نعومة الأطراف: ${chroma.feather} بكسل`}>
                  <Slider min={0} max={4} value={chroma.feather} onChange={set("feather")} />
                </Field>
              </> },
              { key: "loop", label: "الحركة", children: <>
                <Field label="نوع التكرار (بلا نهاية)">
                  <Segmented<LoopMode> block value={mode} onChange={setMode} options={[
                    { value: "pingpong", label: "ذهاب وإياب (Ping-Pong)" }, { value: "loop", label: "دائري (Loop)" },
                  ]} />
                </Field>
                {mode === "pingpong"
                  ? <Alert type="info" showIcon message="الحركة تمشي لقدّام وبعدها ترجع بالعكس بدون تكرار فريم الالتفاف، فمفيش أي قفزة." />
                  : <Field label={`دمج النهاية بالبداية: ${crossfade} فريم`} extra="آخر الفريمات تذوب في أولها، فالدورة تكمل من غير قطع. 0 = بدون دمج.">
                      <Slider min={0} max={12} value={crossfade} onChange={setCrossfade} />
                    </Field>}
                <Typography.Text type="secondary">الدورة الواحدة: {loopFrames} فريم ≈ {(loopFrames / fps).toFixed(1)} ث.</Typography.Text>
              </> },
              { key: "fx", label: "المؤثرات", children: <>
                <Field label={`سرعة المؤثرات: ${fx.cycles} مرة في الدورة`} extra="عدد صحيح دايمًا، علشان المؤثر يكمل مع الحركة بسلاسة.">
                  <Slider min={1} max={4} value={fx.cycles} onChange={setF("cycles")} />
                </Field>
                <Field label={<Space>لمعات وبريق (Sparkles) <Switch size="small" checked={fx.sparkles} onChange={setF("sparkles")} /></Space>}>
                  {fx.sparkles && <Space direction="vertical" style={{ width: "100%" }}>
                    <Slider min={2} max={30} value={fx.sparkleCount} onChange={setF("sparkleCount")} tooltip={{ formatter: (v) => `${v} لمعة` }} />
                    <Slider min={2} max={8} value={fx.sparkleSize} onChange={setF("sparkleSize")} tooltip={{ formatter: (v) => `الحجم ${v}` }} />
                    <ColorPicker value={fx.sparkleColor} disabledAlpha onChange={(c) => setF("sparkleColor")(c.toHexString())} showText={() => "اللون"} />
                  </Space>}
                </Field>
                <Field label={<Space>لمعة متحركة (Shimmer) <Switch size="small" checked={fx.shimmer} onChange={setF("shimmer")} /></Space>}>
                  {fx.shimmer && <Slider min={15} max={100} value={Math.round(fx.shimmerStrength * 100)} onChange={(v) => setF("shimmerStrength")(v / 100)}
                    tooltip={{ formatter: (v) => `القوة ${v}%` }} />}
                </Field>
                <Field label={<Space>توهج (Glow) <Switch size="small" checked={fx.glow} onChange={setF("glow")} /></Space>}>
                  {fx.glow && <Space direction="vertical" style={{ width: "100%" }}>
                    <Slider min={1} max={10} value={fx.glowSize} onChange={setF("glowSize")} tooltip={{ formatter: (v) => `الحجم ${v}` }} />
                    <Space>
                      <ColorPicker value={fx.glowColor} disabledAlpha onChange={(c) => setF("glowColor")(c.toHexString())} showText={() => "اللون"} />
                      <Switch checked={fx.pulse} onChange={setF("pulse")} checkedChildren="نبض (Pulse)" unCheckedChildren="ثابت" />
                    </Space>
                  </Space>}
                </Field>
              </> },
            ]} />
          </Col>
        </Row>
      )}
      {!supported && <Alert type="warning" showIcon style={{ marginTop: 12 }} message="المتصفح ده مش بيقدر يحفظ WebP. افتح اللوحة من Chrome أو Edge." />}
      {err && <Alert type="error" showIcon style={{ marginTop: 12 }} message={err} />}
    </Modal>
  );
}
