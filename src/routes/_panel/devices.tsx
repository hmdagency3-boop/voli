import { createFileRoute, Link } from "@tanstack/react-router";
import { PageContainer } from "@ant-design/pro-components";
import { Alert, Button, Descriptions, Input, Space, Table, Tag, Typography } from "antd";
import { useState } from "react";
import { pageHead } from "@/components/meta";
import { useLoad } from "@/components/hooks";
import {
  DEVICES_PAGE, HARDWARE_LABELS, fmtDate, getDeviceConnections, getDeviceDetails, getDevices,
  type DeviceIp, type DeviceRow, type LinkedAccount,
} from "@/lib/admin";

const show = (v: unknown) => (v === true ? "نعم" : v === false ? "لا" : v === undefined || v === null || v === "" ? "—" : String(v));

/** Phone details the Voli app reported, every IP the phone used, and other accounts on the same phone. */
function DeviceMore({ row }: { row: DeviceRow }) {
  const { data, loading, error } = useLoad(() => getDeviceDetails(row.auth_id, row.device_id), [row.auth_id, row.device_id]);
  if (error) return <Alert type="warning" message={error} showIcon />;
  if (loading) return <Typography.Text type="secondary">جارٍ التحميل…</Typography.Text>;
  if (!data) return <Typography.Text type="secondary">لا توجد تفاصيل</Typography.Text>;
  const hw = data.hardware;
  const items = HARDWARE_LABELS.filter(([k]) => hw[k] !== undefined && hw[k] !== null && hw[k] !== "").map(([k, label]) => ({ key: k, label, children: show(hw[k]) }));
  return (
    <Space direction="vertical" size="middle" className="w-full">
      <Descriptions size="small" bordered column={{ xs: 1, md: 2 }} title={`المصدر: ${data.source === "app" ? "تطبيق أندرويد" : data.source === "web" ? "متصفح" : "غير معروف"}`} items={[
        { key: "d", label: "معرّف الجهاز", children: <bdi>{data.device_id}</bdi> },
        { key: "f", label: "بصمة الجهاز", children: <bdi className="break-all">{data.fingerprint ?? "—"}</bdi> },
        { key: "a", label: "Android ID", children: <bdi>{data.android_id ?? "—"}</bdi> },
        { key: "w", label: "Widevine ID (مشفّر)", children: <bdi className="break-all">{data.widevine_id ?? "—"}</bdi> },
        { key: "i", label: "أول IP", children: <bdi>{data.first_ip ?? "—"}</bdi> },
        ...items,
      ]} />
      <Table<DeviceIp> size="small" rowKey="ip" pagination={false} dataSource={data.ips} scroll={{ x: 700 }} title={() => "سجل عناوين IP لهذا الجهاز"}
        columns={[
          { title: "IP", dataIndex: "ip", render: (v: string) => <bdi>{v}</bdi> },
          { title: "الشبكة", render: (_, r) => [r.network, r.carrier].filter(Boolean).join(" — ") || "—" },
          { title: "الدولة", dataIndex: "country", render: show },
          { title: "VPN", dataIndex: "vpn", render: (v: boolean) => (v ? <Tag color="orange">VPN</Tag> : "—") },
          { title: "المصدر", dataIndex: "from_header", render: (v: boolean) => (v ? "قاعدة البيانات (حقيقي)" : "بلّغ به التطبيق") },
          { title: "مرات الظهور", dataIndex: "seen_count" },
          { title: "آخر ظهور", dataIndex: "last_seen", render: fmtDate },
          { title: "أول ظهور", dataIndex: "first_seen", render: fmtDate },
        ]} />
      {data.same_phone.length > 0 && (
        <Alert type="warning" showIcon message="حسابات أخرى على نفس الهاتف (نفس البصمة أو المعرّف)" description={
          <Space wrap>{data.same_phone.map((a) => <Link key={`${a.auth_id}${a.device_id}`} to="/members/$authId" params={{ authId: a.auth_id }}>{a.display_name ?? "—"} ({a.public_id ?? "—"})</Link>)}</Space>} />
      )}
    </Space>
  );
}

export const Route = createFileRoute("/_panel/devices")({
  validateSearch: (search: Record<string, unknown>): { member?: string | undefined } => ({ member: typeof search['member'] === 'string' || typeof search['member'] === 'number' ? String(search['member']) : undefined }),
  head: pageHead("الأجهزة والحسابات المرتبطة", "سجل أجهزة أعضاء فولي والحسابات التي استخدمت نفس الأجهزة"),
  component: Devices,
});

function Devices() {
  const search = Route.useSearch();
  const [member, setMember] = useState(search.member ?? '');
  const [q, setQ] = useState("");
  const [page, setPage] = useState(0);
  const devices = useLoad(() => getDevices(q, page), [q, page]);
  const connections = useLoad(() => member ? getDeviceConnections(member) : Promise.resolve(null), [member]);
  const rows = member ? connections.data?.devices ?? [] : devices.data?.rows ?? [];

  return (
    <PageContainer title="الأجهزة والحسابات المرتبطة" extra={<Link to="/bans"><Button danger>إدارة الحظر</Button></Link>}>
      <Space wrap className="mb-4">
        <Input.Search key={search.member} defaultValue={search.member} allowClear aria-label="بحث روابط الحساب" placeholder="ID الحساب — كل الأجهزة والحسابات المرتبطة" onSearch={setMember} />
        {!member && <Input.Search allowClear placeholder="IP أو الطراز أو الشبكة أو اسم العضو" 
              onSearch={(v) => { setQ(v); setPage(0); }} />
        }
      </Space>
      {(member ? connections.error : devices.error) && <Alert type="error" message={member ? connections.error : devices.error} showIcon className="mb-4" />}
      {member && <>
        <Typography.Title level={4}>الحسابات التي استخدمت أجهزة الحساب {member}</Typography.Title>
        <Table<LinkedAccount> rowKey="auth_id" loading={connections.loading} dataSource={connections.data?.accounts ?? []} scroll={{ x: 650 }}
          columns={[
            { title: 'الحساب', render: (_, r) => <Link to="/members/$authId" params={{ authId: r.auth_id }}>{r.display_name ?? '—'}</Link> },
            { title: 'ID', dataIndex: 'public_id' },
            { title: 'ID المميز', dataIndex: 'special_id' },
            { title: 'الأجهزة المشتركة', render: (_, r) => <Space wrap>{r.devices.map((d) => <Tag key={d}>{d}</Tag>)}</Space> },
            { title: 'أكواد الحظر الفعّالة', render: (_, r) => r.ban_codes.length ? r.ban_codes.map((c) => <Tag key={c} color="red">{c}</Tag>) : <Tag>نشط</Tag> },
            { title: '', render: (_, r) => <Link to="/bans" search={{ member: String(r.public_id) }}><Button size="small" danger>إدارة الحظر</Button></Link> },
          ]} />
      </>}
      <Typography.Title level={4}>{member ? 'كل الأجهزة السابقة للحساب' : 'الأجهزة المسجلة'}</Typography.Title>
            <Table<DeviceRow> rowKey="id" loading={member ? connections.loading : devices.loading} dataSource={rows} scroll={{ x: 1100 }}
              expandable={{ expandedRowRender: (r) => <DeviceMore row={r} /> }}
              pagination={member ? { pageSize: DEVICES_PAGE } : { current: page + 1, pageSize: DEVICES_PAGE, total: devices.data?.total ?? 0, showSizeChanger: false, onChange: (p) => setPage(p - 1) }}
              columns={[
                { title: "العضو", render: (_, r) => <Link to="/members/$authId" params={{ authId: r.auth_id }}>{r.display_name ?? "—"} {r.public_id ? `(${r.public_id})` : ""}</Link> },
                { title: "IP", dataIndex: "ip", render: (v) => v ?? "—" },
                { title: "الهاتف", render: (_, r) => [r.brand, r.model].filter(Boolean).join(" ") || "—" },
                { title: "النظام", dataIndex: "os", render: (v) => v ?? "—" },
                { title: "الشبكة", render: (_, r) => [r.network, r.carrier].filter(Boolean).join(" — ") || "—" },
                { title: "معرّف الجهاز", dataIndex: "device_id", ellipsis: true, width: 160 },
                { title: "بصمة الجهاز", dataIndex: "fingerprint", ellipsis: true, width: 120, render: (v: string | null) => v ? <bdi>{v.slice(0, 12)}…</bdi> : "—" },
                { title: "المصدر", dataIndex: "source", width: 90, render: (v: string | null) => v === "app" ? <Tag color="green">تطبيق</Tag> : v === "web" ? <Tag>متصفح</Tag> : "—" },
                { title: "آخر ظهور", dataIndex: "last_seen", render: fmtDate },
                 { title: "أول ظهور", dataIndex: "first_seen", render: fmtDate },
                 { title: "الحالة", render: (_, r) => r.ban ? <Tag color="red">محظور {r.ban.code ?? ''}</Tag> : <Tag>نشط</Tag> },
                 { title: "", width: 200, fixed: "right", render: (_, r) => <Link to="/bans" search={{ kind: 'device', value: r.device_id }}><Button size="small" danger>حظر الجهاز وحساباته</Button></Link> },
              ]} />
    </PageContainer>
  );
}
