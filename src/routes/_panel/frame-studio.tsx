import { createFileRoute } from "@tanstack/react-router";
import { PageContainer } from "@ant-design/pro-components";
import {
  DownloadOutlined, FileAddOutlined, FolderOpenOutlined, PlayCircleOutlined, PlusOutlined, RedoOutlined, SaveOutlined, StarOutlined, UndoOutlined,
} from "@ant-design/icons";
import { Alert, App, Button, Card, Col, Empty, Input, InputNumber, Modal, Row, Select, Slider, Space, Typography, Upload } from "antd";
import { useCallback, useEffect, useRef, useState } from "react";
import { pageHead } from "@/components/meta";
import { Preview } from "@/components/frame-studio/Preview";
import { LayerList } from "@/components/frame-studio/LayerList";
import { LayerProps } from "@/components/frame-studio/LayerProps";
import { PublishModal } from "@/components/frame-studio/PublishModal";
import { SvgaPlayer } from "@/components/SvgaPlayer";
import { LIMITS, frameCount, newDesign, newLayer, newSparkles, resize, uid, type Design, type Layer } from "@/lib/svga/motion";
import { exportSvga, readPiece } from "@/lib/svga/render";
import { downloadFile, downloadProject, loadCurrent, readProject, saveCurrent } from "@/lib/svga/design-store";

export const Route = createFileRoute("/_panel/frame-studio")({
  head: pageHead("صانع الإطارات SVGA", "تجميع قطع الإطار وتحريكها وتصدير ملف SVGA ونشره في متجر فولي"),
  component: FrameStudio,
});

const PIECE_TYPES = ["image/png", "image/webp"];
const kb = (n: number) => (n > 1024 * 1024 ? `${(n / 1024 / 1024).toFixed(1)} ميجا` : `${Math.round(n / 1024)} ك.ب`);

/** Undo/redo history; quick changes in a row (dragging, sliders) count as one step. */
function useHistory(initial: Design) {
  const [design, setState] = useState(initial);
  const past = useRef<Design[]>([]), future = useRef<Design[]>([]), last = useRef(0);
  const set = useCallback((next: Design | ((d: Design) => Design), merge = false) => {
    setState((cur) => {
      const n = typeof next === "function" ? next(cur) : next;
      if (n === cur) return cur;
      const now = Date.now();
      if (!merge && now - last.current > 500) { past.current = [...past.current.slice(-49), cur]; future.current = []; }
      last.current = now;
      return n;
    });
  }, []);
  const undo = () => setState((cur) => { const p = past.current.pop(); if (!p) return cur; future.current.push(cur); last.current = 0; return p; });
  const redo = () => setState((cur) => { const f = future.current.pop(); if (!f) return cur; past.current.push(cur); last.current = 0; return f; });
  const reset = (d: Design) => { past.current = []; future.current = []; setState(d); };
  return { design, set, undo, redo, reset, canUndo: past.current.length > 0, canRedo: future.current.length > 0 };
}

function FrameStudio() {
  const { message, modal } = App.useApp();
  const h = useHistory(newDesign());
  const { design, set } = h;
  const [ready, setReady] = useState(false);
  const [selected, setSelected] = useState<string | null>(null);
  const [final, setFinal] = useState<{ url: string; size: number } | null>(null);
  const [busy, setBusy] = useState(false);
  const pending = useRef<File[]>([]);
  const flush = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => { loadCurrent().then((d) => { if (d) h.reset(d); setReady(true); }); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, []);
  useEffect(() => { if (!ready) return; const t = setTimeout(() => saveCurrent(design), 500); return () => clearTimeout(t); }, [design, ready]);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!(e.ctrlKey || e.metaKey) || (e.target as HTMLElement)?.closest("input,textarea")) return;
      if (e.key.toLowerCase() === "z") { e.preventDefault(); if (e.shiftKey) h.redo(); else h.undo(); }
      if (e.key.toLowerCase() === "y") { e.preventDefault(); h.redo(); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  const layer = design.layers.find((l) => l.id === selected) ?? null;
  const patch = (id: string, fn: (l: Layer) => Layer, merge = false) =>
    set((d) => ({ ...d, layers: d.layers.map((l) => (l.id === id ? fn(l) : l)) }), merge);

  /** Pieces chosen together keep their sizes relative to each other; the biggest fits the frame. */
  const addPieces = async (files: File[]) => {
    const ok = files.filter((f) => PIECE_TYPES.includes(f.type) && f.size <= 8 * 1024 * 1024);
    if (ok.length < files.length) message.warning("بعض الملفات اتجاهلت: القطع لازم تكون PNG أو WebP شفاف، حتى 8 ميجا");
    if (!ok.length) return;
    try {
      const pieces = await Promise.all(ok.map((f) => readPiece(f, Math.max(600, design.size * 2))));
      set((d) => {
        const biggest = Math.max(...pieces.map((p) => Math.max(p.px, p.py)));
        const unit = d.unit && biggest * d.unit <= d.size * 1.05 ? d.unit : Math.min(1, d.size / biggest);
        const added = pieces.map((p, i) => newLayer({
          name: ok[i]!.name.replace(/\.[^.]+$/, "").slice(0, 30) || "قطعة", src: p.src,
          w: p.px * unit, h: p.py * unit, x: d.size / 2, y: d.size / 2,
        }));
        setSelected(added[added.length - 1]!.id);
        return { ...d, unit, layers: [...d.layers, ...added] };
      });
    } catch { message.error("تعذّر قراءة صورة من الصور"); }
  };
  const replacePiece = async (id: string, f: File) => {
    if (!PIECE_TYPES.includes(f.type)) { message.error("القطعة لازم تكون PNG أو WebP"); return; }
    const p = await readPiece(f, Math.max(600, design.size * 2));
    patch(id, (l) => ({ ...l, src: p.src, h: (l.w * p.py) / p.px }));
  };
  const moveZ = (id: string, by: 1 | -1) => set((d) => {
    const i = d.layers.findIndex((l) => l.id === id), j = i + by;
    if (i < 0 || j < 0 || j >= d.layers.length) return d;
    const layers = [...d.layers]; const a = layers[i]!; layers[i] = layers[j]!; layers[j] = a;
    return { ...d, layers };
  });

  const exportFinal = async () => {
    setBusy(true);
    try {
      const f = await exportSvga(design);
      if (final) URL.revokeObjectURL(final.url);
      setFinal({ url: URL.createObjectURL(f), size: f.size });
      return f;
    } catch { message.error("تعذّر تجهيز ملف SVGA"); return null; } finally { setBusy(false); }
  };

  return (
    <PageContainer title="صانع الإطارات SVGA"
      subTitle="ارفع قطع الإطار، رتّب الطبقات، ضيف حركات جاهزة وإضاءة ولمعة، وبعدين صدّر SVGA أو انشره في المتجر"
      extra={[
        <Upload key="add" multiple accept={PIECE_TYPES.join(",")} showUploadList={false}
          beforeUpload={(f) => { pending.current.push(f); clearTimeout(flush.current); flush.current = setTimeout(() => { const all = pending.current; pending.current = []; addPieces(all); }, 50); return false; }}>
          <Button type="primary" ghost icon={<PlusOutlined />}>إضافة قطع</Button>
        </Upload>,
        <Button key="stars" icon={<StarOutlined />} onClick={() => { const s = newSparkles(design.size); set((d) => ({ ...d, layers: [...d.layers, s] })); setSelected(s.id); }}>نجوم لامعة</Button>,
        <Button key="undo" icon={<UndoOutlined />} disabled={!h.canUndo} onClick={h.undo} aria-label="تراجع" />,
        <Button key="redo" icon={<RedoOutlined />} disabled={!h.canRedo} onClick={h.redo} aria-label="إعادة" />,
      ]}>
      <Row gutter={[16, 16]}>
        <Col xs={24} xl={6}>
          <Card size="small" title="الطبقات (اللي فوق بيترسم فوق)" styles={{ body: { maxHeight: 640, overflow: "auto" } }}>
            <LayerList layers={design.layers} selected={selected} onSelect={setSelected} onMove={moveZ}
              onToggle={(id) => patch(id, (l) => ({ ...l, visible: !l.visible }))}
              onCopy={(id) => set((d) => {
                const i = d.layers.findIndex((l) => l.id === id); if (i < 0) return d;
                const src = d.layers[i]!; const c: Layer = { ...src, id: uid(), name: `${src.name} (نسخة)`, x: src.x + 10, y: src.y + 10 };
                setSelected(c.id);
                return { ...d, layers: [...d.layers.slice(0, i + 1), c, ...d.layers.slice(i + 1)] };
              })}
              onDelete={(id) => { set((d) => ({ ...d, layers: d.layers.filter((l) => l.id !== id) })); if (selected === id) setSelected(null); }} />
          </Card>
          <Card size="small" title="إعدادات الإطار" style={{ marginTop: 16 }}>
            <Input value={design.name} maxLength={40} prefix="الاسم:" aria-label="اسم الإطار" onChange={(e) => set((d) => ({ ...d, name: e.target.value }), true)} style={{ marginBottom: 10 }} />
            <Space wrap>
              <span>المقاس <InputNumber size="small" min={LIMITS.size[0]} max={LIMITS.size[1]} value={design.size} style={{ width: 80 }}
                onChange={(v) => v && set((d) => resize(d, Number(v)))} /></span>
              <span>فريم/ث <Select size="small" value={design.fps} style={{ width: 70 }} onChange={(fps) => set((d) => ({ ...d, fps }))}
                options={[15, 20, 24, 30].map((v) => ({ value: v, label: v }))} /></span>
            </Space>
            <div style={{ marginTop: 10 }}>
              <Typography.Text type="secondary" style={{ fontSize: 12 }}>مدة اللفة: {design.seconds} ثانية ({frameCount(design)} فريم) — الحركة بتتكرر من غير قفلة</Typography.Text>
              <Slider min={LIMITS.seconds[0]} max={LIMITS.seconds[1]} step={0.5} value={design.seconds} onChange={(v) => set((d) => ({ ...d, seconds: v as number }))} />
              <Typography.Text type="secondary" style={{ fontSize: 12 }}>مقاس صورة العضو في النص: {Math.round(design.avatar * 100)}% (للمعاينة بس)</Typography.Text>
              <Slider min={20} max={95} value={Math.round(design.avatar * 100)} onChange={(v) => set((d) => ({ ...d, avatar: (v as number) / 100 }), true)} />
            </div>
          </Card>
        </Col>
        <Col xs={24} xl={10}>
          <Card size="small" title="المعاينة" extra={<Typography.Text type="secondary" style={{ fontSize: 12 }}>اسحب القطعة بالماوس لتحريك مكانها</Typography.Text>}>
            <Preview design={design} selected={selected} onSelect={setSelected}
              onMove={(id, dx, dy, begin) => patch(id, (l) => ({ ...l, x: l.x + dx, y: l.y + dy }), !begin)} />
          </Card>
          <Card size="small" title="الملف النهائي" style={{ marginTop: 16 }}>
            <Space wrap>
              <Button icon={<PlayCircleOutlined />} loading={busy} disabled={!design.layers.length} onClick={exportFinal}>تشغيل ملف SVGA الحقيقي</Button>
              <Button icon={<DownloadOutlined />} disabled={!design.layers.length || busy} onClick={async () => { const f = await exportFinal(); if (f) downloadFile(f); }}>تنزيل SVGA</Button>
              <PublishModal design={design} disabled={!design.layers.length} />
            </Space>
            <Space wrap style={{ marginTop: 10 }}>
              <Button size="small" icon={<SaveOutlined />} onClick={() => downloadProject(design)}>حفظ ملف المشروع</Button>
              <Upload accept=".json,application/json" showUploadList={false} beforeUpload={(f) => {
                readProject(f).then((d) => { if (d) { h.reset(d); setSelected(null); message.success("اتفتح المشروع"); } else message.error("ملف المشروع غير صالح"); });
                return false;
              }}><Button size="small" icon={<FolderOpenOutlined />}>فتح ملف مشروع</Button></Upload>
              <Button size="small" danger icon={<FileAddOutlined />} onClick={() => modal.confirm({
                title: "تبدأ إطار جديد؟", content: "الشغل الحالي هيتمسح من المتصفح (احفظ ملف المشروع الأول لو محتاجه).", okText: "إطار جديد", cancelText: "إلغاء",
                okButtonProps: { danger: true }, onOk: () => { h.reset(newDesign()); setSelected(null); },
              })}>إطار جديد</Button>
            </Space>
            <Typography.Paragraph type="secondary" style={{ fontSize: 12, marginTop: 10, marginBottom: 0 }}>
              الشغل بيتحفظ تلقائي في المتصفح ده. «ملف المشروع» بيفتح الإطار تاني للتعديل على أي جهاز.
            </Typography.Paragraph>
          </Card>
        </Col>
        <Col xs={24} xl={8}>
          <Card size="small" title={layer ? `القطعة: ${layer.name}` : "القطعة"} styles={{ body: { maxHeight: 900, overflow: "auto" } }}>
            {layer
              ? <LayerProps layer={layer} size={design.size} onChange={(fn) => patch(layer.id, fn)} onReplace={(f) => replacePiece(layer.id, f)} toast={(t) => message.info(t)} />
              : <Empty description="اختار قطعة من الطبقات أو اضغط عليها في المعاينة" />}
          </Card>
          <Alert style={{ marginTop: 16 }} type="info" showIcon message="نصايح"
            description={<ul style={{ paddingInlineStart: 18, margin: 0 }}>
              <li>صدّر القطع من برنامج التصميم بنفس مقاس الإطار الكامل والباقي شفاف، فتترص في أماكنها لوحدها.</li>
              <li>الإطار اللي في النص سيبه ثابت أو ضيفله لمعة بس، والحركة للإضافات (أجنحة، تاج، زينة).</li>
              <li>اعمل جناح واحد وفعّل «نسخة معكوسة»، والجناح التاني بيتعمل ويتحرك سيمتري.</li>
            </ul>} />
        </Col>
      </Row>
      <Modal open={!!final} title={`ملف SVGA الحقيقي — ${final ? kb(final.size) : ""}`} footer={null} centered width={400}
        onCancel={() => { if (final) URL.revokeObjectURL(final.url); setFinal(null); }} destroyOnHidden>
        {final && <SvgaPlayer src={final.url} size={340} avatar={design.avatar} />}
        {final && final.size > 2 * 1024 * 1024 && <Alert style={{ marginTop: 12 }} type="warning" showIcon message="الملف كبير: صغّر صور القطع أو قلّل عدد الفريمات عشان يحمل بسرعة في التطبيق" />}
        <Typography.Paragraph type="secondary" style={{ fontSize: 12, marginTop: 10, marginBottom: 0 }}>ده تشغيل الملف نفسه بمشغل SVGA الرسمي، زي ما هيظهر في التطبيق.</Typography.Paragraph>
      </Modal>
    </PageContainer>
  );
}
