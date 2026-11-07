import { createFileRoute, Link } from "@tanstack/react-router";
import { Search } from "lucide-react";
import { useEffect, useState } from "react";
import { Empty, PageTitle, Panel, Person } from "@/components/admin/AdminShell";
import { Confirm, Pill, useAction, useLoad } from "@/components/admin/admin-ui";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { clearRoomChat, closeRoom, fmt, fmtDate, getRooms } from "@/lib/admin";

export const Route = createFileRoute("/admin/rooms")({
  head: () => ({
    meta: [
      { title: "الرومات — إدارة voli" },
      { name: "description", content: "متابعة رومات voli وقفلها." },
      { property: "og:title", content: "الرومات — إدارة voli" },
      { property: "og:description", content: "متابعة رومات voli." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: RoomsPage,
});

function RoomsPage() {
  const [text, setText] = useState("");
  const [query, setQuery] = useState("");
  const [liveOnly, setLiveOnly] = useState(true);
  useEffect(() => { const t = setTimeout(() => setQuery(text), 350); return () => clearTimeout(t); }, [text]);
  const { data, failed, reload } = useLoad(() => getRooms(query, liveOnly), [query, liveOnly]);
  const { busy, run } = useAction();

  return (
    <>
      <PageTitle title="الرومات" hint={data ? `${fmt(data.length)} روم` : "…"}
        actions={<Button variant="secondary" size="sm" onClick={reload}>تحديث</Button>} />
      <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={text} onChange={(e) => setText(e.target.value)} placeholder="اسم الروم أو آيدي صاحبها" className="pr-9" />
        </div>
        <label className="flex items-center gap-2 text-sm">
          <Switch checked={liveOnly} onCheckedChange={setLiveOnly} /> الشغالة بس
        </label>
      </div>
      <Panel className="p-0 lg:p-0">
        {failed ? <Empty>ماقدرناش نحمّل الرومات.</Empty> : !data ? <Empty>…</Empty> : data.length === 0 ? <Empty>مافيش رومات.</Empty> : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-sm">
              <thead className="text-xs text-muted-foreground">
                <tr className="border-b border-border">
                  <th className="px-4 py-3 text-right font-semibold">الروم</th>
                  <th className="px-4 py-3 text-right font-semibold">صاحبها</th>
                  <th className="px-4 py-3 text-right font-semibold">جوه دلوقتي</th>
                  <th className="px-4 py-3 text-right font-semibold">كوينز وهدايا</th>
                  <th className="px-4 py-3 text-right font-semibold">آخر تحديث</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody>
                {data.map((r) => (
                  <tr key={r.id} className="border-b border-border/60 last:border-0">
                    <td className="px-4 py-2.5">
                      <p className="font-semibold">{r.name}</p>
                      <div className="mt-1 flex gap-1">
                        {r.is_live ? <Pill tone="live">شغالة</Pill> : <Pill>مقفولة</Pill>}
                        {r.locked && <Pill>بباسورد</Pill>}
                        <Pill>{r.mode === "video" ? "فيديو" : "صوت"} · {r.seat_count} مايك</Pill>
                      </div>
                    </td>
                    <td className="px-4 py-2.5">
                      <Link to="/admin/member/$authId" params={{ authId: r.owner_id }}>
                        <Person name={r.owner_name} publicId={r.owner_public_id} avatar={r.owner_avatar} />
                      </Link>
                    </td>
                    <td className="px-4 py-2.5 font-semibold" dir="ltr">{fmt(r.present)}</td>
                    <td className="px-4 py-2.5 font-semibold" dir="ltr">{fmt(r.coins_total)}</td>
                    <td className="px-4 py-2.5 text-xs text-muted-foreground">{fmtDate(r.updated_at)}</td>
                    <td className="px-4 py-2.5">
                      <div className="flex justify-end gap-2">
                        <Confirm title="مسح شات الروم؟" body="كل رسايل الروم هتتمسح." confirm="امسح"
                          onConfirm={() => run(() => clearRoomChat(r.id), "اتمسح الشات", reload)}
                          trigger={<Button size="sm" variant="secondary" disabled={busy}>مسح الشات</Button>} />
                        {r.is_live && (
                          <Confirm destructive title={`قفل روم ${r.name}؟`} body="كل اللي جوه هيخرجوا والمايكات تفضى." confirm="اقفل"
                            onConfirm={() => run(() => closeRoom(r.id), "اتقفلت الروم", reload)}
                            trigger={<Button size="sm" variant="destructive" disabled={busy}>قفل</Button>} />
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>
    </>
  );
}
