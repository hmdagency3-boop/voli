import { useEffect, useMemo, useState } from "react";
import { Check, EyeOff, Globe, Mars, PenLine, Search, Venus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import {
  GENDER_LABEL, countryFlag, countryName, countryOptions, loadProfileInfo, saveMyProfileInfo,
  type Gender, type ProfileInfo,
} from "@/lib/profile-info";

/** Gender and country tags on a profile; the owner can edit them. */
export function ProfileInfoRow({ userId, isSelf }: { userId: string | undefined; isSelf: boolean }) {
  const [info, setInfo] = useState<ProfileInfo | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!userId) return;
    let active = true;
    setLoaded(false);
    loadProfileInfo(userId).then((r) => { if (active) { setInfo(r); setLoaded(true); } });
    return () => { active = false; };
  }, [userId]);

  if (!userId || !loaded || !info) return null;
  const empty = !info.gender && !info.country;
  if (empty && !isSelf) return null;

  return (
    <div className="mt-3 flex flex-wrap items-center gap-2 px-5">
      {info.gender && (
        <span className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-bold ${info.gender === "male" ? "bg-gender-male/15 text-gender-male" : "bg-gender-female/15 text-gender-female"}`}>
          {info.gender === "male" ? <Mars className="size-3.5" aria-hidden /> : <Venus className="size-3.5" aria-hidden />}
          {GENDER_LABEL[info.gender]}
        </span>
      )}
      {info.country && (
        <span className="inline-flex items-center gap-1.5 rounded-full bg-secondary px-3 py-1 text-xs font-bold">
          <span aria-hidden className="text-sm leading-none">{countryFlag(info.country)}</span>
          {countryName(info.country)}
          {isSelf && info.country_hidden && <EyeOff className="size-3.5 text-muted-foreground" aria-label="مخفية عن الآخرين" />}
        </span>
      )}
      {isSelf && (
        <Button type="button" variant="ghost" size="sm" onClick={() => setOpen(true)} className="h-7 rounded-full px-3 text-xs text-primary">
          <PenLine className="size-3.5" /> {empty ? "أضف الجنس والدولة" : "تعديل"}
        </Button>
      )}
      {isSelf && (
        <ProfileInfoSheet open={open} onOpenChange={setOpen} info={info}
          onSaved={(next) => setInfo({ ...info, ...next })} />
      )}
    </div>
  );
}

function ProfileInfoSheet({ open, onOpenChange, info, onSaved }: {
  open: boolean; onOpenChange: (v: boolean) => void; info: ProfileInfo;
  onSaved: (next: { gender: Gender | null; country: string | null }) => void;
}) {
  const [gender, setGender] = useState<Gender | null>(info.gender);
  const [country, setCountry] = useState<string | null>(info.country);
  const [query, setQuery] = useState("");
  const [saving, setSaving] = useState(false);
  const all = useMemo(() => (open ? countryOptions() : []), [open]);
  const shown = query.trim() ? all.filter((c) => c.name.includes(query.trim()) || c.code.toLowerCase() === query.trim().toLowerCase()) : all;

  useEffect(() => {
    if (open) { setGender(info.gender); setCountry(info.country); setQuery(""); }
  }, [open, info.gender, info.country]);

  async function save() {
    setSaving(true);
    try {
      await saveMyProfileInfo(gender, country);
      onSaved({ gender, country });
      toast.success("تم الحفظ");
      onOpenChange(false);
    } catch {
      toast.error("ماقدرناش نحفظ، جرّب تاني");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" dir="rtl" className="mx-auto flex max-h-[85dvh] max-w-md flex-col rounded-t-[2rem]">
        <SheetHeader className="text-start">
          <SheetTitle>الجنس والدولة</SheetTitle>
          <SheetDescription>بيظهروا في بروفايلك لكل الناس.</SheetDescription>
        </SheetHeader>

        <p className="mt-2 text-sm font-semibold">الجنس</p>
        <div className="mt-2 grid grid-cols-2 gap-3">
          {(["male", "female"] as const).map((g) => (
            <button key={g} type="button" aria-pressed={gender === g} onClick={() => setGender(g)}
              className={`flex items-center justify-center gap-2 rounded-2xl border-2 py-3 font-bold transition ${gender === g
                ? g === "male" ? "border-gender-male bg-gender-male/15 text-gender-male" : "border-gender-female bg-gender-female/15 text-gender-female"
                : "border-border text-muted-foreground"}`}>
              {g === "male" ? <Mars className="size-5" /> : <Venus className="size-5" />} {GENDER_LABEL[g]}
            </button>
          ))}
        </div>

        <p className="mt-5 flex items-center gap-1.5 text-sm font-semibold"><Globe className="size-4" /> الدولة</p>
        <div className="relative mt-2">
          <Search className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="ابحث عن دولتك" className="rounded-full pr-9" />
        </div>
        <ul className="mt-2 min-h-0 flex-1 overflow-y-auto rounded-2xl border" role="listbox" aria-label="الدول">
          {shown.map((c) => (
            <li key={c.code}>
              <button type="button" role="option" aria-selected={country === c.code} onClick={() => setCountry(c.code)}
                className={`flex w-full items-center gap-3 px-4 py-2.5 text-start text-sm transition hover:bg-secondary ${country === c.code ? "bg-secondary font-bold" : ""}`}>
                <span aria-hidden className="text-lg leading-none">{countryFlag(c.code)}</span>
                <span className="flex-1">{c.name}</span>
                {country === c.code && <Check className="size-4 text-primary" />}
              </button>
            </li>
          ))}
          {shown.length === 0 && <li className="p-4 text-center text-sm text-muted-foreground">مفيش دولة بالاسم ده</li>}
        </ul>
        {info.country_hidden && (
          <p className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground"><EyeOff className="size-3.5" /> دولتك مخفية عن الآخرين لأنك مفعّل إخفاء الموقع.</p>
        )}

        <Button type="button" onClick={save} disabled={saving || (gender === info.gender && country === info.country)} className="mt-4 w-full rounded-full">
          {saving ? "جارٍ الحفظ…" : "حفظ"}
        </Button>
      </SheetContent>
    </Sheet>
  );
}
