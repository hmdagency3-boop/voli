import { useEffect, useMemo, useState } from "react";
import { Check, EyeOff, Mars, Search, Venus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import {
  GENDER_LABEL, countryFlagUrl, countryFlag, countryName, countryOptions, loadProfileInfo,
  type Gender, type ProfileInfo,
} from "@/lib/profile-info";

/** Loads a member's gender, country, birthday and album; null until loaded or when the database update is missing. */
export function useProfileInfo(userId: string | undefined) {
  const [info, setInfo] = useState<ProfileInfo | null>(null);
  const [loaded, setLoaded] = useState(false);
  useEffect(() => {
    if (!userId) return;
    let active = true;
    setInfo(null); setLoaded(false);
    loadProfileInfo(userId).then((r) => { if (active) { setInfo(r); setLoaded(true); } });
    return () => { active = false; };
  }, [userId]);
  return [info, setInfo, loaded] as const;
}

/** Small gender sign and country flag shown next to the ID. */
export function ProfileIdTags({ info, isSelf }: { info: ProfileInfo | null; isSelf: boolean }) {
  if (!info) return null;
  return (
    <>
      {info.gender && (
        <span role="img" aria-label={GENDER_LABEL[info.gender]} title={GENDER_LABEL[info.gender]}
          className={`grid size-5 shrink-0 place-items-center rounded-full ${info.gender === "male" ? "bg-gender-male/20 text-gender-male" : "bg-gender-female/20 text-gender-female"}`}>
          {info.gender === "male" ? <Mars className="size-3.5" aria-hidden /> : <Venus className="size-3.5" aria-hidden />}
        </span>
      )}
      {info.country && (
        <CountryFlag code={info.country} className={`size-5 ${isSelf && info.country_hidden ? "opacity-50" : ""}`} />
      )}
    </>
  );
}

/** Round country flag picture; falls back to the emoji when no picture exists. */
export function CountryFlag({ code, className = "" }: { code: string; className?: string }) {
  const url = countryFlagUrl(code);
  const label = countryName(code);
  if (!url) return <span role="img" aria-label={label} title={label} className="shrink-0 text-base leading-none">{countryFlag(code)}</span>;
  return <img src={url} alt={label} title={label} draggable={false} className={`shrink-0 rounded-full object-cover ring-1 ring-border ${className}`} />;
}

/** The member's album pictures on their profile. */
export function ProfileAlbumStrip({ album }: { album: string[] }) {
  if (!album.length) return null;
  return (
    <div className="mt-3 flex gap-2 overflow-x-auto px-5 pb-1 [scrollbar-width:none]">
      {album.map((url, i) => (
        <a key={url} href={url} target="_blank" rel="noreferrer" className="shrink-0 overflow-hidden rounded-xl bg-secondary">
          <img src={url} alt={`صورة ${i + 1} من الألبوم`} loading="lazy" className="size-20 object-cover" />
        </a>
      ))}
    </div>
  );
}

/** Pick male or female. */
export function GenderSheet({ open, onOpenChange, value, saving, onSave }: {
  open: boolean; onOpenChange: (v: boolean) => void; value: Gender | null; saving: boolean; onSave: (g: Gender) => void;
}) {
  const [gender, setGender] = useState<Gender | null>(value);
  useEffect(() => { if (open) setGender(value); }, [open, value]);
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" dir="rtl" className="mx-auto max-w-md rounded-t-[2rem]">
        <SheetHeader className="text-start">
          <SheetTitle>الجنس</SheetTitle>
          <SheetDescription>بيظهر جنب الـ ID في بروفايلك.</SheetDescription>
        </SheetHeader>
        <div className="mt-4 grid grid-cols-2 gap-3">
          {(["male", "female"] as const).map((g) => (
            <button key={g} type="button" aria-pressed={gender === g} onClick={() => setGender(g)}
              className={`flex items-center justify-center gap-2 rounded-2xl border-2 py-3 font-bold transition ${gender === g
                ? g === "male" ? "border-gender-male bg-gender-male/15 text-gender-male" : "border-gender-female bg-gender-female/15 text-gender-female"
                : "border-border text-muted-foreground"}`}>
              {g === "male" ? <Mars className="size-5" /> : <Venus className="size-5" />} {GENDER_LABEL[g]}
            </button>
          ))}
        </div>
        <Button type="button" onClick={() => gender && onSave(gender)} disabled={saving || !gender || gender === value} className="mt-5 w-full rounded-full">
          {saving ? "جارٍ الحفظ…" : "حفظ"}
        </Button>
      </SheetContent>
    </Sheet>
  );
}

/** Searchable country list with round flags. */
export function CountrySheet({ open, onOpenChange, value, hidden, saving, onSave }: {
  open: boolean; onOpenChange: (v: boolean) => void; value: string | null; hidden: boolean; saving: boolean; onSave: (code: string) => void;
}) {
  const [country, setCountry] = useState<string | null>(value);
  const [query, setQuery] = useState("");
  const all = useMemo(() => (open ? countryOptions() : []), [open]);
  const q = query.trim();
  const shown = q ? all.filter((c) => c.name.includes(q) || c.code.toLowerCase() === q.toLowerCase()) : all;
  useEffect(() => { if (open) { setCountry(value); setQuery(""); } }, [open, value]);
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" dir="rtl" className="mx-auto flex max-h-[85dvh] max-w-md flex-col rounded-t-[2rem]">
        <SheetHeader className="text-start">
          <SheetTitle>الدولة</SheetTitle>
          <SheetDescription>علمها بيظهر جنب الـ ID في بروفايلك.</SheetDescription>
        </SheetHeader>
        <div className="relative mt-2">
          <Search className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="ابحث عن دولتك" className="rounded-full pr-9" />
        </div>
        <ul className="mt-2 min-h-0 flex-1 overflow-y-auto rounded-2xl border" role="listbox" aria-label="الدول">
          {shown.map((c) => (
            <li key={c.code}>
              <button type="button" role="option" aria-selected={country === c.code} onClick={() => setCountry(c.code)}
                className={`flex w-full items-center gap-3 px-4 py-2.5 text-start text-sm transition hover:bg-secondary ${country === c.code ? "bg-secondary font-bold" : ""}`}>
                <CountryFlag code={c.code} className="size-6" />
                <span className="flex-1">{c.name}</span>
                {country === c.code && <Check className="size-4 text-primary" />}
              </button>
            </li>
          ))}
          {shown.length === 0 && <li className="p-4 text-center text-sm text-muted-foreground">مفيش دولة بالاسم ده</li>}
        </ul>
        {hidden && (
          <p className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground"><EyeOff className="size-3.5" /> دولتك مخفية عن الآخرين لأنك مفعّل إخفاء الموقع.</p>
        )}
        <Button type="button" onClick={() => country && onSave(country)} disabled={saving || !country || country === value} className="mt-4 w-full rounded-full">
          {saving ? "جارٍ الحفظ…" : "حفظ"}
        </Button>
      </SheetContent>
    </Sheet>
  );
}
