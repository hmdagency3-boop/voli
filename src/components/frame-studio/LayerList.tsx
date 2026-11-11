import { ArrowDownOutlined, ArrowUpOutlined, CopyOutlined, DeleteOutlined, EyeInvisibleOutlined, EyeOutlined, StarOutlined } from "@ant-design/icons";
import { Button, Empty, Tag, Tooltip } from "antd";
import type { Layer } from "@/lib/svga/motion";

export const isStatic = (l: Layer) => !l.anims.length && !l.glow && !l.shine && l.kind !== "sparkles";

/** Pieces from top (drawn last) to bottom. */
export function LayerList({ layers, selected, onSelect, onMove, onToggle, onCopy, onDelete }: {
  layers: Layer[]; selected: string | null;
  onSelect: (id: string) => void; onMove: (id: string, by: 1 | -1) => void;
  onToggle: (id: string) => void; onCopy: (id: string) => void; onDelete: (id: string) => void;
}) {
  if (!layers.length) return <Empty description="ارفع قطع الإطار (PNG شفاف) عشان تبدأ" />;
  const top = [...layers].reverse();
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      {top.map((l, i) => (
        <div key={l.id} role="button" tabIndex={0} aria-label={`طبقة ${l.name}`} onClick={() => onSelect(l.id)}
          onKeyDown={(e) => { if (e.key === "Enter") onSelect(l.id); }}
          style={{
            display: "flex", alignItems: "center", gap: 8, padding: 6, borderRadius: 8, cursor: "pointer",
            border: `1px solid ${l.id === selected ? "#1677ff" : "#f0f0f0"}`, background: l.id === selected ? "#e6f4ff" : "#fff",
            opacity: l.visible ? 1 : 0.5,
          }}>
          <div style={{ width: 40, height: 40, flex: "none", borderRadius: 6, background: "#1b1c22", display: "grid", placeItems: "center", overflow: "hidden" }}>
            {l.kind === "sparkles" ? <StarOutlined style={{ color: "#ffe58f", fontSize: 20 }} /> : <img src={l.src} alt="" style={{ maxWidth: "100%", maxHeight: "100%" }} />}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{l.name}</div>
            <div style={{ display: "flex", gap: 2, flexWrap: "wrap" }}>
              {isStatic(l) ? <Tag style={{ margin: 0 }}>ثابت</Tag> : <Tag color="purple" style={{ margin: 0 }}>متحرك</Tag>}
              {l.mirror && <Tag color="cyan" style={{ margin: 0 }}>+ معكوس</Tag>}
              {l.glow && <Tag color="gold" style={{ margin: 0 }}>توهج</Tag>}
              {l.shine && <Tag color="blue" style={{ margin: 0 }}>لمعة</Tag>}
            </div>
          </div>
          <div style={{ display: "flex", flexDirection: "column" }} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: "flex" }}>
              <Tooltip title="لفوق"><Button size="small" type="text" icon={<ArrowUpOutlined />} disabled={i === 0} onClick={() => onMove(l.id, 1)} aria-label="لفوق" /></Tooltip>
              <Tooltip title="لتحت"><Button size="small" type="text" icon={<ArrowDownOutlined />} disabled={i === top.length - 1} onClick={() => onMove(l.id, -1)} aria-label="لتحت" /></Tooltip>
              <Tooltip title={l.visible ? "إخفاء" : "إظهار"}><Button size="small" type="text" icon={l.visible ? <EyeOutlined /> : <EyeInvisibleOutlined />} onClick={() => onToggle(l.id)} aria-label="إظهار/إخفاء" /></Tooltip>
            </div>
            <div style={{ display: "flex" }}>
              <Tooltip title="نسخة"><Button size="small" type="text" icon={<CopyOutlined />} onClick={() => onCopy(l.id)} aria-label="نسخة" /></Tooltip>
              <Tooltip title="حذف"><Button size="small" type="text" danger icon={<DeleteOutlined />} onClick={() => onDelete(l.id)} aria-label="حذف" /></Tooltip>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
