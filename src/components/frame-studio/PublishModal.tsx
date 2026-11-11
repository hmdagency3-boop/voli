import { ModalForm, ProFormDigit, ProFormSelect, ProFormText } from "@ant-design/pro-components";
import { Alert, App, Button, Slider, Typography } from "antd";
import { CloudUploadOutlined } from "@ant-design/icons";
import { useEffect, useState } from "react";
import { useAction } from "@/components/hooks";
import { frameCount, type Design } from "@/lib/svga/motion";
import { exportSvga, thumbnail } from "@/lib/svga/render";
import { createSvgaItem, STORE_DAYS_MAX, STORE_STYLES, storeUploadText, type StoreStyle } from "@/lib/store";

/** Publishes the design as a store frame: .svga animation + a still picture taken from one frame. */
export function PublishModal({ design, disabled }: { design: Design; disabled?: boolean }) {
  const act = useAction();
  const { message } = App.useApp();
  const [open, setOpen] = useState(false);
  const [frame, setFrame] = useState(0);
  const [thumb, setThumb] = useState<string | null>(null);
  const frames = frameCount(design);
  useEffect(() => {
    if (!open) return;
    let url: string | null = null, live = true;
    thumbnail(design, frame, 256).then((f) => { if (!live) return; url = URL.createObjectURL(f); setThumb(url); });
    return () => { live = false; if (url) URL.revokeObjectURL(url); };
  }, [open, frame, design]);
  return (
    <>
      <Button type="primary" icon={<CloudUploadOutlined />} disabled={!!disabled} onClick={() => setOpen(true)}>نشر في المتجر</Button>
      <ModalForm<{ name: string; style: StoreStyle; price: number; days: number; sort?: number }>
        title="نشر الإطار في المتجر" width={480} open={open} modalProps={{ destroyOnHidden: true, onCancel: () => setOpen(false) }}
        initialValues={{ name: design.name.slice(0, 40), style: "luxury", days: 30 }}
        onFinish={async (v) => {
          const key = "publish-svga";
          const ok = await act(async () => {
            try {
              message.open({ key, type: "loading", content: "جارٍ تجهيز ملف SVGA…", duration: 0 });
              const [svga, art] = await Promise.all([exportSvga({ ...design, name: v.name }), thumbnail(design, frame, 512)]);
              await createSvgaItem({ kind: "frame", style: v.style, name: v.name, price: v.price, days: v.days, sort: v.sort ?? null, art, svga },
                (s) => message.open({ key, type: "loading", content: storeUploadText(s), duration: 0 }));
            } finally { message.destroy(key); }
          }, "اتنشر الإطار في المتجر بحركته");
          if (ok) setOpen(false);
          return ok;
        }}>
        <ProFormText name="name" label="الاسم في المتجر" rules={[{ required: true, message: "اكتب الاسم" }, { max: 40 }]} />
        <ProFormSelect name="style" label="التصنيف" options={STORE_STYLES} rules={[{ required: true }]} />
        <ProFormDigit name="price" label="السعر (كوينز)" min={1} fieldProps={{ precision: 0 }} rules={[{ required: true, message: "اكتب السعر" }]} />
        <ProFormDigit name="days" label="المدة (يوم)" min={1} max={STORE_DAYS_MAX} fieldProps={{ precision: 0 }} rules={[{ required: true, message: "اكتب المدة" }]} />
        <ProFormDigit name="sort" label="الترتيب (فارغ = في الآخر)" min={0} fieldProps={{ precision: 0 }} />
        <Typography.Text>صورة المتجر (فريم من الحركة)</Typography.Text>
        <div style={{ display: "flex", gap: 12, alignItems: "center", marginTop: 6 }}>
          <div style={{ width: 96, height: 96, borderRadius: 8, background: "#1b1c22", flex: "none", display: "grid", placeItems: "center" }}>
            {thumb && <img src={thumb} alt="صورة المتجر" style={{ width: 96, height: 96 }} />}
          </div>
          <Slider style={{ flex: 1 }} min={0} max={frames - 1} value={frame} onChange={(x) => setFrame(x as number)} />
        </div>
        <Alert style={{ marginTop: 12 }} type="info" showIcon
          message="الحركة بتشتغل في التطبيق بعد تشغيل ملف 024 في قاعدة بيانات فولي، وبعد ما تطبيق فولي يقرأ ملفات SVGA (الطلب جاهز في sql/024_README.md)." />
      </ModalForm>
    </>
  );
}
