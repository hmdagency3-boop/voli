import { createFileRoute } from "@tanstack/react-router";
import { EditableProTable, PageContainer } from "@ant-design/pro-components";
import { Alert, Card, Tabs } from "antd";
import { pageHead } from "@/components/meta";
import { useAction, useLoad } from "@/components/hooks";
import { fmt, getGifts, getVipPrices, updateGift, updateVipPrice, type AdminGift, type VipTierPrice } from "@/lib/admin";

export const Route = createFileRoute("/_panel/gifts")({
  head: pageHead("الهدايا والأسعار", "تعديل أسعار الهدايا وباقات VIP في فولي"),
  component: Gifts,
});

function Gifts() {
  const gifts = useLoad(getGifts, []);
  const vip = useLoad(getVipPrices, []);
  const act = useAction();
  return (
    <PageContainer title="الهدايا والأسعار">
      <Card>
        <Tabs items={[
          { key: "g", label: "الهدايا", children: <>
            {gifts.error && <Alert type="error" message={gifts.error} showIcon style={{ marginBottom: 16 }} />}
            <EditableProTable<AdminGift> rowKey="key" loading={gifts.loading} value={gifts.data ?? []} recordCreatorProps={false}
              editable={{ type: "single", onSave: async (_k, r) => { await act(() => updateGift(r), "حُفظت الهدية", gifts.reload); } }}
              columns={[
                { title: "المفتاح", dataIndex: "key", editable: false },
                { title: "الاسم", dataIndex: "name" },
                { title: "السعر", dataIndex: "price", valueType: "digit", render: (_, r) => fmt(r.price) },
                { title: "الترتيب", dataIndex: "sort", valueType: "digit" },
                { title: "معروضة", dataIndex: "active", valueType: "switch" },
                { title: "مرات الإرسال", dataIndex: "sent_count", editable: false, render: (_, r) => fmt(r.sent_count) },
                { title: "القيمة", dataIndex: "sent_value", editable: false, render: (_, r) => fmt(r.sent_value) },
                { title: "", valueType: "option", render: (_, r, _i, a) => <a onClick={() => a?.startEditable?.(r.key)}>تعديل</a> },
              ]} />
          </> },
          { key: "v", label: "أسعار VIP", children: <>
            {vip.error && <Alert type="error" message={vip.error} showIcon style={{ marginBottom: 16 }} />}
            <EditableProTable<VipTierPrice> rowKey="level" loading={vip.loading} value={vip.data ?? []} recordCreatorProps={false}
              editable={{ type: "single", onSave: async (_k, r) => { await act(() => updateVipPrice({ ...r, price_coins: r.price_coins ?? null, monthly_salary_coins: r.monthly_salary_coins ?? null }), "حُفظ السعر", vip.reload); } }}
              columns={[
                { title: "المستوى", dataIndex: "level", editable: false },
                { title: "الاسم", dataIndex: "name_ar", editable: false },
                { title: "السعر (فارغ = غير معروض للبيع)", dataIndex: "price_coins", valueType: "digit", render: (_, r) => r.price_coins == null ? "غير معروض للبيع" : fmt(r.price_coins) },
                { title: "المدة (يوم)", dataIndex: "duration_days", valueType: "digit" },
                { title: "الراتب الشهري", dataIndex: "monthly_salary_coins", valueType: "digit", render: (_, r) => fmt(r.monthly_salary_coins) },
                { title: "", valueType: "option", render: (_, r, _i, a) => <a onClick={() => a?.startEditable?.(r.level)}>تعديل</a> },
              ]} />
          </> },
        ]} />
      </Card>
    </PageContainer>
  );
}
