import { DeleteOutlined, ThunderboltOutlined } from "@ant-design/icons";
import { Button, ColorPicker, Divider, Input, InputNumber, Slider, Space, Switch, Tooltip, Typography, Upload } from "antd";
import type { ReactNode } from "react";
import {
  ANIM_PRESETS, DEFAULT_GLOW, DEFAULT_SHINE, newAnim, presetOf, RECIPES, wingPivot, type Anim, type AnimType, type Layer,
} from "@/lib/svga/motion";

function Num({ label, value, min, max, step = 1, unit, onChange }: {
  label: ReactNode; value: number; min: number; max: number; step?: number; unit?: string; onChange: (v: number) => void;
}) {
  return (
    <div style={{ marginBottom: 6 }}>
      <Typography.Text type="secondary" style={{ fontSize: 12 }}>{label}</Typography.Text>
      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
        <Slider style={{ flex: 1, margin: "4px 6px" }} min={min} max={max} step={step} value={value} onChange={(v) => onChange(v as number)} />
        <InputNumber size="small" style={{ width: 84 }} min={min} max={max} step={step} value={Number(value.toFixed(step < 1 ? 2 : 0))}
          onChange={(v) => v != null && onChange(Number(v))} suffix={unit} />
      </div>
    </div>
  );
}
const hex = (c: { toHexString: () => string }) => c.toHexString().slice(0, 7);

const PIVOTS: { label: string; v: [number, number] }[] = [
  { label: "المنتصف", v: [0.5, 0.5] }, { label: "فوق", v: [0.5, 0] }, { label: "تحت", v: [0.5, 1] },
  { label: "الطرف اليمين", v: [1, 0.5] }, { label: "الطرف الشمال", v: [0, 0.5] },
];

/** Settings of the selected piece: place, turning point, mirror copy, moves and effects. */
export function LayerProps({ layer, size, onChange, onReplace, toast }: {
  layer: Layer; size: number; onChange: (fn: (l: Layer) => Layer) => void; onReplace: (f: File) => void; toast: (t: string) => void;
}) {
  const l = layer;
  const set = (p: Partial<Layer>) => onChange((x) => ({ ...x, ...p }));
  const setAnim = (id: string, p: Partial<Anim>) => onChange((x) => ({ ...x, anims: x.anims.map((a) => (a.id === id ? { ...a, ...p } : a)) }));
  const addAnim = (t: AnimType) => {
    if (l.anims.some((a) => a.type === t)) { toast(`حركة «${presetOf(t).label}» موجودة بالفعل على القطعة`); return; }
    onChange((x) => {
      const out = { ...x, anims: [...x.anims, newAnim(t)] };
      if (t === "flap" && x.pivotX === 0.5 && x.pivotY === 0.5) { const [px, py] = wingPivot(x, size); out.pivotX = px; out.pivotY = py; }
      return out;
    });
  };
  return (
    <div>
      <Input value={l.name} maxLength={30} onChange={(e) => set({ name: e.target.value })} prefix="الاسم:" style={{ marginBottom: 10 }} aria-label="اسم القطعة" />
      {l.kind === "image" && (
        <Upload accept="image/png,image/webp" showUploadList={false} beforeUpload={(f) => { onReplace(f); return false; }}>
          <Button size="small" style={{ marginBottom: 8 }}>تغيير صورة القطعة</Button>
        </Upload>
      )}

      <Divider titlePlacement="start" plain style={{ margin: "8px 0" }}>وصفات جاهزة</Divider>
      <Space wrap size={[6, 6]}>
        {RECIPES.filter((r) => l.kind === "image" || r.key === "tail").map((r) => (
          <Tooltip key={r.key} title={r.hint}>
            <Button size="small" icon={<ThunderboltOutlined />} onClick={() => onChange((x) => r.apply(x, size))}>{r.label}</Button>
          </Tooltip>
        ))}
      </Space>

      <Divider titlePlacement="start" plain style={{ margin: "12px 0 8px" }}>المكان والحجم</Divider>
      <Num label="أفقي (X)" value={l.x} min={-size * 0.25} max={size * 1.25} onChange={(x) => set({ x })} />
      <Num label="رأسي (Y)" value={l.y} min={-size * 0.25} max={size * 1.25} onChange={(y) => set({ y })} />
      <Num label="الحجم" value={l.scale * 100} min={5} max={300} unit="%" onChange={(v) => set({ scale: v / 100 })} />
      <Num label="الزاوية" value={l.rotation} min={-180} max={180} unit="°" onChange={(rotation) => set({ rotation })} />
      <Num label="الشفافية" value={l.opacity * 100} min={0} max={100} unit="%" onChange={(v) => set({ opacity: v / 100 })} />

      <Divider titlePlacement="start" plain style={{ margin: "12px 0 8px" }}>نقطة الدوران (المفصل)</Divider>
      <Space wrap size={[4, 4]} style={{ marginBottom: 6 }}>
        {PIVOTS.map((p) => <Button key={p.label} size="small" onClick={() => set({ pivotX: p.v[0], pivotY: p.v[1] })}>{p.label}</Button>)}
        <Button size="small" type="dashed" onClick={() => { const [pivotX, pivotY] = wingPivot(l, size); set({ pivotX, pivotY }); }}>مفصل جناح</Button>
      </Space>
      <Num label="أفقي داخل القطعة" value={l.pivotX * 100} min={0} max={100} unit="%" onChange={(v) => set({ pivotX: v / 100 })} />
      <Num label="رأسي داخل القطعة" value={l.pivotY * 100} min={0} max={100} unit="%" onChange={(v) => set({ pivotY: v / 100 })} />
      <Typography.Text type="secondary" style={{ fontSize: 12 }}>النقطة الحمرا في المعاينة. الجناح يلف حوالين المفصل، والتاج ينبض من قاعدته.</Typography.Text>

      <div style={{ display: "flex", alignItems: "center", gap: 8, margin: "12px 0", padding: 8, background: "#f6ffed", borderRadius: 8 }}>
        <Switch checked={l.mirror} onChange={(mirror) => set({ mirror })} />
        <div>
          <div style={{ fontWeight: 500 }}>نسخة معكوسة على الجنب التاني</div>
          <Typography.Text type="secondary" style={{ fontSize: 12 }}>نفس القطعة ونفس الحركة بالعكس (سيمتري) — اعمل الجناح اليمين بس.</Typography.Text>
        </div>
      </div>

      <Divider titlePlacement="start" plain style={{ margin: "12px 0 8px" }}>حركات جاهزة</Divider>
      <Space wrap size={[6, 6]}>
        {ANIM_PRESETS.map((p) => (
          <Tooltip key={p.type} title={p.hint}><Button size="small" onClick={() => addAnim(p.type)}>+ {p.label}</Button></Tooltip>
        ))}
      </Space>
      {!l.anims.length && <Typography.Paragraph type="secondary" style={{ fontSize: 12, marginTop: 6 }}>القطعة ثابتة. ضيف حركة أو أكتر (تقدر تجمع نبض + طفو مثلاً).</Typography.Paragraph>}
      {l.anims.map((a) => {
        const p = presetOf(a.type);
        return (
          <div key={a.id} style={{ border: "1px solid #f0f0f0", borderRadius: 8, padding: 8, marginTop: 8 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <b>{p.label}</b>
              <Button size="small" type="text" danger icon={<DeleteOutlined />} aria-label={`حذف ${p.label}`}
                onClick={() => onChange((x) => ({ ...x, anims: x.anims.filter((y) => y.id !== a.id) }))} />
            </div>
            <Num label={p.amountLabel} value={a.amount} min={p.min} max={p.max} step={p.step} unit={p.unit} onChange={(amount) => setAnim(a.id, { amount })} />
            {a.type !== "spin" && <Num label="عدد المرات في اللفة الواحدة" value={a.cycles} min={1} max={8} onChange={(cycles) => setAnim(a.id, { cycles })} />}
            <Num label="تأخير البداية" value={a.phase * 100} min={0} max={100} step={5} unit="%" onChange={(v) => setAnim(a.id, { phase: v / 100 })} />
          </div>
        );
      })}

      {l.kind === "image" && (
        <>
          <Divider titlePlacement="start" plain style={{ margin: "12px 0 8px" }}>الإضاءة واللمعان</Divider>
          <div style={{ border: "1px solid #f0f0f0", borderRadius: 8, padding: 8 }}>
            <Space><Switch checked={!!l.glow} onChange={(on) => set({ glow: on ? { ...DEFAULT_GLOW } : null })} /><b>توهج (إضاءة حوالين القطعة)</b></Space>
            {l.glow && (() => { const g = l.glow; const sg = (p: Partial<typeof g>) => set({ glow: { ...g, ...p } }); return (
              <div style={{ marginTop: 8 }}>
                <Space style={{ marginBottom: 6 }}>اللون <ColorPicker disabledAlpha value={g.color} onChangeComplete={(c) => sg({ color: hex(c) })} /></Space>
                <Num label="انتشار الضوء" value={g.blur} min={2} max={40} onChange={(blur) => sg({ blur })} />
                <Num label="أقل إضاءة" value={g.min * 100} min={0} max={100} unit="%" onChange={(v) => sg({ min: Math.min(v / 100, g.max) })} />
                <Num label="أعلى إضاءة" value={g.max * 100} min={0} max={100} unit="%" onChange={(v) => sg({ max: Math.max(v / 100, g.min) })} />
                <Num label="نبضات الضوء في اللفة" value={g.cycles} min={1} max={8} onChange={(cycles) => sg({ cycles })} />
              </div>
            ); })()}
          </div>
          <div style={{ border: "1px solid #f0f0f0", borderRadius: 8, padding: 8, marginTop: 8 }}>
            <Space><Switch checked={!!l.shine} onChange={(on) => set({ shine: on ? { ...DEFAULT_SHINE } : null })} /><b>لمعة متحركة (بتعدّي على القطعة)</b></Space>
            {l.shine && (() => { const s = l.shine; const ss = (p: Partial<typeof s>) => set({ shine: { ...s, ...p } }); return (
              <div style={{ marginTop: 8 }}>
                <Num label="عرض اللمعة" value={s.width * 100} min={4} max={60} unit="%" onChange={(v) => ss({ width: v / 100 })} />
                <Num label="ميل اللمعة" value={s.angle} min={-90} max={90} unit="°" onChange={(angle) => ss({ angle })} />
                <Num label="قوة اللمعة" value={s.strength * 100} min={10} max={100} unit="%" onChange={(v) => ss({ strength: v / 100 })} />
                <Num label="سرعة المرور (جزء من الوقت)" value={s.sweep * 100} min={15} max={100} step={5} unit="%" onChange={(v) => ss({ sweep: v / 100 })} />
                <Num label="مرات اللمعة في اللفة" value={s.cycles} min={1} max={4} onChange={(cycles) => ss({ cycles })} />
              </div>
            ); })()}
          </div>
        </>
      )}

      {l.kind === "sparkles" && l.sparkles && (() => { const s = l.sparkles; const ss = (p: Partial<typeof s>) => set({ sparkles: { ...s, ...p } }); return (
        <>
          <Divider titlePlacement="start" plain style={{ margin: "12px 0 8px" }}>النجوم</Divider>
          <Space style={{ marginBottom: 6 }}>اللون <ColorPicker disabledAlpha value={s.color} onChangeComplete={(c) => ss({ color: hex(c) })} /></Space>
          <Num label="العدد" value={s.count} min={1} max={24} onChange={(count) => ss({ count })} />
          <Num label="حجم النجمة" value={s.size} min={4} max={size * 0.2} onChange={(v) => ss({ size: v })} />
          <Num label="مساحة الدايرة" value={(l.w / size) * 100} min={20} max={120} unit="%" onChange={(v) => set({ w: (v / 100) * size, h: (v / 100) * size })} />
          <Num label="مرات اللمعان في اللفة" value={s.cycles} min={1} max={6} onChange={(cycles) => ss({ cycles })} />
          <Button size="small" onClick={() => ss({ seed: Math.floor(Math.random() * 1e6) })}>توزيع جديد للنجوم</Button>
        </>
      ); })()}
    </div>
  );
}
