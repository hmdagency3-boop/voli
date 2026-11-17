import { createFileRoute, Link } from "@tanstack/react-router";
import { PageContainer, ProTable, StatisticCard } from "@ant-design/pro-components";
import { FireOutlined, PoweroffOutlined, ReloadOutlined, SafetyOutlined, ThunderboltOutlined, TrophyOutlined } from "@ant-design/icons";
import { Alert, Avatar, Button, Card, Col, Empty, Form, InputNumber, Popconfirm, Progress, Row, Segmented, Select, Slider, Space, Switch, Tag, Tooltip, Typography } from "antd";
import { useEffect, useState } from "react";
import { pageHead } from "@/components/meta";
import { useAction, useLoad } from "@/components/hooks";
import { fmt, fmtDate } from "@/lib/admin";
import {
  getLuckyGifts, getLuckyOverview, getLuckySpins, LUCKY_KINDS, MULTIPLIERS, platformShare, poolFill, saveLuckySettings, setLuckyGift,
  type LuckyGift, type LuckyKind, type LuckyOverview,
} from "@/lib/lucky";

export const Route = createFileRoute("/_panel/lucky-gifts")({
  head: pageHead("هدايا الحظ والمجنون", "مراقبة أرباح وصناديق هدايا الحظ والمجنون وضبط النسب والمضاعفات"),
  component: LuckyGifts,
});

const REFRESH_MS = 5000;
const kindTag = (k: LuckyKind) => { const x = LUCKY_KINDS.find((v) => v.value === k)!; return <Tag color={x.color}>{x.label}</Tag>; };
const multOptions = MULTIPLIERS.map((m) => ({ value: m, label: `x${m}` }));

function useTicker(reload: () => void, on: boolean) {
  useEffect(() => { if (!on) return; const t = setInterval(reload, REFRESH_MS); return () => clearInterval(t); }, [reload, on]);
}

function Overview({ o }: { o: LuckyOverview }) {
  return (
    <StatisticCard.Group direction="row" style={{ marginBottom: 16 }}>
      <StatisticCard statistic={{ title: "إجمالي كوينز الرمي الداخلة", value: o.total_spent, formatter: (v) => fmt(Number(v)), description: `${fmt(o.spins)} رمية` }} />
      <StatisticCard statistic={{ title: "إجمالي الجوائز المصروفة", value: o.total_won, formatter: (v) => fmt(Number(v)), valueStyle: { color: "#d4380d" }, description: `${fmt(o.wins)} فوز` }} />
      <StatisticCard statistic={{ title: "صافي أرباح المنصة المحقق", value: o.net_profit, formatter: (v) => fmt(Number(v)), valueStyle: { color: o.net_profit >= 0 ? "#389e0d" : "#cf1322" }, description: `حصص أصحاب المايك: ${fmt(o.total_mic)}` }} />
      <StatisticCard statistic={{ title: "رصيد الصناديق الحية", value: o.pools, formatter: (v) => fmt(Number(v)), valueStyle: { color: "#d48806" } }} />
    </StatisticCard.Group>
  );
}

function Settings({ o, onSaved }: { o: LuckyOverview; onSaved: () => void }) {
  const act = useAction();
  const [mic, setMic] = useState(o.mic_pct);
  const [pool, setPool] = useState(o.pool_pct);
  const [floor, setFloor] = useState(o.safety_floor);
  const [big, setBig] = useState(o.big_from);
  const [banner, setBanner] = useState(o.banner_from);
  const plat = platformShare(mic, pool);
  const dirty = mic !== o.mic_pct || pool !== o.pool_pct || floor !== o.safety_floor || big !== o.big_from || banner !== o.banner_from;
  const save = (enabled = o.enabled) => act(() => saveLuckySettings({ mic, pool, safety_floor: floor, big_from: big, banner_from: banner, enabled }),
    enabled === o.enabled ? "تم حفظ الإعدادات" : enabled ? "تم تشغيل هدايا الحظ" : "تم إيقاف هدايا الحظ فوراً", onSaved);

  return (
    <Row gutter={16} style={{ marginBottom: 16 }}>
      <Col xs={24} lg={8}>
        <Card style={{ height: "100%", borderColor: o.enabled ? "#b7eb8f" : "#ffa39e", background: o.enabled ? "#f6ffed" : "#fff1f0" }}>
          <Space direction="vertical" size="middle" style={{ width: "100%", textAlign: "center" }}>
            <PoweroffOutlined style={{ fontSize: 40, color: o.enabled ? "#52c41a" : "#f5222d" }} />
            <Typography.Title level={4} style={{ margin: 0 }}>مفتاح الطوارئ</Typography.Title>
            <Tag color={o.enabled ? "success" : "error"} style={{ fontSize: 14, padding: "4px 12px" }}>
              {o.enabled ? "هدايا الحظ والمجنون تعمل" : "هدايا الحظ والمجنون موقوفة"}
            </Tag>
            <Popconfirm title={o.enabled ? "إيقاف كل رميات الحظ والمجنون فوراً؟" : "إعادة تشغيل هدايا الحظ؟"} description="الهدايا العادية لا تتأثر." onConfirm={() => save(!o.enabled)}>
              <Button danger={o.enabled} type="primary" size="large" icon={<PoweroffOutlined />}>{o.enabled ? "إيقاف طارئ" : "تشغيل"}</Button>
            </Popconfirm>
          </Space>
        </Card>
      </Col>
      <Col xs={24} lg={16}>
        <Card title={<Space><ThunderboltOutlined />النسب والإعدادات</Space>} extra={<Button type="primary" disabled={!dirty || plat === null} onClick={() => save()}>حفظ</Button>}>
          <Form layout="vertical">
            <Row gutter={24}>
              <Col xs={24} md={12}>
                <Form.Item label={`نسبة صاحب المايك: ${mic}%`}>
                  <Slider min={0} max={30} step={0.1} value={mic} onChange={setMic} tooltip={{ formatter: (v) => `${v}%` }} />
                </Form.Item>
                <Form.Item label={`نسبة وعاء الجوائز التراكمي: ${pool}%`}>
                  <Slider min={0} max={95} step={0.1} value={pool} onChange={setPool} tooltip={{ formatter: (v) => `${v}%` }} />
                </Form.Item>
                <Form.Item label="نسبة ربح المنصة الصافي (الباقي تلقائياً)">
                  {plat === null ? <Alert type="error" showIcon message="مجموع المايك والصندوق تجاوز 100%" /> : (
                    <Progress percent={100} success={{ percent: mic + pool }} showInfo={false} strokeColor="#722ed1" />
                  )}
                  <Space wrap style={{ marginTop: 8 }}>
                    <Tag color="green">المايك {mic}%</Tag><Tag color="gold">الصندوق {pool}%</Tag><Tag color="purple">المنصة {plat ?? "—"}%</Tag>
                  </Space>
                </Form.Item>
              </Col>
              <Col xs={24} md={12}>
                <Form.Item label={<Space><SafetyOutlined />صمام الأمان: أقل رصيد للصندوق للسماح بالمضاعفات الكبرى</Space>}>
                  <InputNumber style={{ width: "100%" }} min={0} step={100000} value={floor} onChange={(v) => setFloor(Number(v ?? 0))} formatter={(v) => fmt(Number(v ?? 0))} addonAfter="كوينز" />
                </Form.Item>
                <Form.Item label="المضاعفات الكبرى تبدأ من">
                  <Select value={big} onChange={setBig} options={multOptions} />
                </Form.Item>
                <Form.Item label="حد تفعيل البانر العام في الرومات">
                  <Select value={banner} onChange={setBanner} options={multOptions.map((m) => ({ ...m, label: `${m.label} فما فوق` }))} />
                </Form.Item>
              </Col>
            </Row>
          </Form>
        </Card>
      </Col>
    </Row>
  );
}

function Pools({ gifts, floor }: { gifts: LuckyGift[]; floor: number }) {
  const live = gifts.filter((g) => g.kind !== "normal");
  return (
    <Card title={<Space><TrophyOutlined />الصناديق التراكمية الحية</Space>} style={{ marginBottom: 16 }}>
      {live.length === 0 ? <Empty description="لا توجد هدايا حظ أو مجنون بعد — اختر النوع من الجدول أدناه" /> : (
        <Row gutter={[16, 16]}>
          {live.map((g) => { const f = poolFill(g.pool, floor); return (
            <Col key={g.key} xs={24} sm={12} lg={6}>
              <Card size="small">
                <Space align="center"><Avatar shape="square" src={g.art_url ?? undefined}>{g.name[0]}</Avatar><b>{g.name}</b>{kindTag(g.kind)}</Space>
                <Typography.Title level={4} style={{ margin: "8px 0 4px" }}>{fmt(g.pool)}</Typography.Title>
                <Tooltip title={f.ready ? "يكفي للمضاعفات الكبرى" : "تحت صمام الأمان — المضاعفات الكبرى متوقفة لهذه الهدية"}>
                  <Progress percent={f.percent} status={f.ready ? "success" : "active"} {...(f.ready ? {} : { strokeColor: { from: "#faad14", to: "#fa541c" } })} />
                </Tooltip>
              </Card>
            </Col>
          ); })}
        </Row>
      )}
    </Card>
  );
}

function GiftRow({ g, onSaved }: { g: LuckyGift; onSaved: () => void }) {
  const act = useAction();
  const toggle = (m: number) => {
    const next = g.multipliers.includes(m) ? g.multipliers.filter((x) => x !== m) : [...g.multipliers, m];
    act(() => setLuckyGift(g.key, g.kind, next), `x${m} ${g.multipliers.includes(m) ? "معطّل" : "مفعّل"}`, onSaved);
  };
  return (
    <Space wrap size={4}>
      {MULTIPLIERS.map((m) => { const on = g.multipliers.includes(m); return (
        <Tag.CheckableTag key={m} checked={on} onChange={() => toggle(m)}
          style={{ border: "1px solid #d9d9d9", fontWeight: 600, opacity: g.kind === "normal" ? 0.5 : 1, ...(on && m >= 100 ? { background: "#fa541c" } : {}) }}>
          x{m}
        </Tag.CheckableTag>
      ); })}
    </Space>
  );
}

function LuckyGifts() {
  const act = useAction();
  const [live, setLive] = useState(true);
  const [winsOnly, setWinsOnly] = useState(true);
  const ov = useLoad(getLuckyOverview, []);
  const gifts = useLoad(getLuckyGifts, []);
  const spins = useLoad(() => getLuckySpins(winsOnly), [winsOnly]);
  useTicker(ov.reload, live); useTicker(gifts.reload, live); useTicker(spins.reload, live);
  const reloadAll = () => { ov.reload(); gifts.reload(); spins.reload(); };
  const err = ov.error ?? gifts.error;

  return (
    <PageContainer title={<Space><FireOutlined style={{ color: "#fa541c" }} />هدايا الحظ والمجنون</Space>}
      extra={[
        <Space key="live"><Switch checked={live} onChange={setLive} /><span>{live ? "تحديث مباشر كل 5 ثوانٍ" : "التحديث المباشر متوقف"}</span></Space>,
        <Button key="r" icon={<ReloadOutlined />} onClick={reloadAll}>تحديث</Button>,
      ]}>
      {err && <Alert type="warning" showIcon style={{ marginBottom: 16 }} message={err} description="ملف التحديث: sql/026_lucky_gifts.sql — يُشغَّل مرة واحدة في محرر SQL لقاعدة فولي." />}
      {ov.data && <Overview o={ov.data} />}
      {ov.data && <Settings key={[ov.data.mic_pct, ov.data.pool_pct, ov.data.safety_floor, ov.data.big_from, ov.data.banner_from].join("|")} o={ov.data} onSaved={ov.reload} />}
      {gifts.data && <Pools gifts={gifts.data} floor={ov.data?.safety_floor ?? 0} />}

      <ProTable<LuckyGift>
        headerTitle="إدارة أنواع الهدايا والمضاعفات" rowKey="key" search={false} options={false} pagination={false}
        loading={gifts.loading && !gifts.data} dataSource={gifts.data ?? []} style={{ marginBottom: 16 }}
        columns={[
          { title: "الهدية", render: (_, g) => <Space><Avatar shape="square" src={g.art_url ?? undefined}>{g.name[0]}</Avatar><span>{g.name}</span>{!g.active && <Tag>مخفية</Tag>}</Space> },
          { title: "السعر", dataIndex: "price", render: (_, g) => fmt(g.price) },
          { title: "النوع", width: 220, render: (_, g) => (
            <Segmented size="small" value={g.kind} options={LUCKY_KINDS.map((k) => ({ value: k.value, label: k.label }))}
              onChange={(v) => act(() => setLuckyGift(g.key, v as LuckyKind, g.multipliers), "تم تغيير نوع الهدية", gifts.reload)} />
          ) },
          { title: "المضاعفات المتاحة (اضغط للتفعيل/التعطيل)", render: (_, g) => <GiftRow g={g} onSaved={gifts.reload} /> },
          { title: "الرميات", render: (_, g) => fmt(g.spins) },
          { title: "داخل / مصروف", render: (_, g) => <span>{fmt(g.spent)} / <span style={{ color: "#d4380d" }}>{fmt(g.won)}</span></span> },
        ]}
      />

      <ProTable
        headerTitle={<Space>السجلات الحية{live && <Tag color="red">مباشر</Tag>}</Space>}
        rowKey="id" search={false} options={false} pagination={{ pageSize: 20 }} loading={spins.loading && !spins.data}
        dataSource={spins.data ?? []}
        toolBarRender={() => [<Segmented key="f" value={winsOnly ? "w" : "a"} onChange={(v) => setWinsOnly(v === "w")} options={[{ value: "w", label: "الفائزة فقط" }, { value: "a", label: "كل الرميات" }]} />]}
        columns={[
          { title: "المرسل", render: (_, s) => <Link to="/members/$authId" params={{ authId: s.sender }}>{s.sender_name ?? "—"}</Link> },
          { title: "المستلم", render: (_, s) => <Link to="/members/$authId" params={{ authId: s.receiver }}>{s.receiver_name ?? "—"}</Link> },
          { title: "الهدية", render: (_, s) => <Space>{s.gift_name ?? s.gift_key}{kindTag(s.kind)}</Space> },
          { title: "المضاعف", render: (_, s) => s.multiplier ? <Tag color={s.multiplier >= (ov.data?.banner_from ?? 100) ? "volcano" : "gold"} style={{ fontWeight: 700 }}>x{s.multiplier}</Tag> : <Tag>—</Tag> },
          { title: "الكوينز الرابحة", render: (_, s) => <b style={{ color: s.won ? "#389e0d" : undefined }}>{fmt(s.won)}</b> },
          { title: "قيمة الرمية", render: (_, s) => fmt(s.spent) },
          { title: "التاريخ", render: (_, s) => fmtDate(s.created_at) },
        ]}
      />
    </PageContainer>
  );
}
