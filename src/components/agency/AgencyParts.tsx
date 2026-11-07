import { useCallback, useEffect, useState, type ReactNode } from "react";
import { Link, useRouter } from "@tanstack/react-router";
import { ChevronLeft, ChevronRight } from "lucide-react";
import crest from "@/assets/agency/crest.webp";
import diamondIcon from "@/assets/diamond.webp";
import { useAccount } from "@/hooks/use-account";
import { getAgencyState, formatDiamonds, type AgencyState } from "@/lib/agency";
import { shownId } from "@/lib/special-id";
import type { RoomPerson } from "@/lib/rooms";

/** Loads where the signed-in member stands in the agency system. */
export function useAgencyState() {
  const { session } = useAccount();
  const me = session?.user.id;
  const [state, setState] = useState<AgencyState | null>(null);
  const [failed, setFailed] = useState(false);
  const [version, setVersion] = useState(0);
  const reload = useCallback(() => setVersion((v) => v + 1), []);
  useEffect(() => {
    if (!me) return;
    let alive = true;
    setFailed(false);
    getAgencyState(me).then((s) => { if (alive) setState(s); }, () => { if (alive) setFailed(true); });
    return () => { alive = false; };
  }, [me, version]);
  return { me, state, failed, reload };
}

export function AgencyTopBar({ title, end }: { title: ReactNode; end?: ReactNode }) {
  const router = useRouter();
  return (
    <header className="relative flex items-center gap-2 px-4 pt-5 pb-3">
      <button
        type="button"
        aria-label="رجوع"
        onClick={() => router.history.back()}
        className="grid size-10 shrink-0 place-items-center rounded-full bg-secondary transition hover:opacity-80"
      >
        <ChevronRight className="size-5" />
      </button>
      <h1 className="flex-1 truncate text-center font-display text-lg font-extrabold">{title}</h1>
      <div className="grid min-w-10 place-items-center">{end}</div>
    </header>
  );
}

export function AgencyCrest({ className = "" }: { className?: string }) {
  return <img src={crest} alt="" width={400} height={385} draggable={false} className={`select-none drop-shadow-xl ${className}`} />;
}

export function Diamonds({ value, className = "" }: { value: number | null; className?: string }) {
  return (
    <span className={`inline-flex items-center gap-1.5 font-sans font-extrabold tabular-nums ${className}`} dir="ltr">
      {value == null ? "—" : formatDiamonds(value)}
      <img src={diamondIcon} alt="ماسة" className="size-[1em] object-contain" />
    </span>
  );
}

export function PersonAvatar({ person, size = "size-12" }: { person?: RoomPerson | undefined; size?: string }) {
  if (person?.avatar_url) return <img src={person.avatar_url} alt="" className={`${size} shrink-0 rounded-full object-cover ring-2 ring-primary/40`} />;
  return (
    <span className={`${size} grid shrink-0 place-items-center rounded-full bg-secondary font-display text-lg font-bold text-muted-foreground ring-2 ring-primary/40`}>
      {(person?.display_name ?? "?").trim().charAt(0) || "?"}
    </span>
  );
}

export function PersonName({ person, badge }: { person?: RoomPerson | undefined; badge?: ReactNode | undefined }) {
  return (
    <div className="min-w-0 flex-1">
      <p className="flex items-center gap-1.5 truncate text-sm font-bold">
        <span className="truncate">{person?.display_name ?? "عضو"}</span>
        {badge}
      </p>
      {person && <p className="mt-0.5 text-xs text-muted-foreground" dir="ltr">ID:{shownId(person)}</p>}
    </div>
  );
}

export function AgentTag() {
  return <span className="shrink-0 rounded-md bg-primary px-1.5 py-0.5 text-[10px] font-bold text-primary-foreground">وكيل</span>;
}

type MenuTo = "/agency/members" | "/agency/requests" | "/agency/income" | "/agency/my-income" | "/agency/review" | "/agency/apply";
export function AgencyMenuCard({ to, icon, title, hint, count }: { to: MenuTo; icon: ReactNode; title: string; hint: string; count?: number | undefined }) {
  return (
    <Link to={to} className="flex items-center gap-3 rounded-[1.5rem] border bg-card px-4 py-4 shadow-soft transition active:scale-[0.99]">
      <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-primary/15 text-primary">{icon}</span>
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-2 font-display text-base font-extrabold">
          {title}
          {!!count && <span className="rounded-full bg-live px-2 py-0.5 font-sans text-[10px] font-bold text-primary-foreground">{count}</span>}
        </span>
        <span className="mt-0.5 block truncate text-xs text-muted-foreground">{hint}</span>
      </span>
      <ChevronLeft className="size-5 shrink-0 text-muted-foreground" />
    </Link>
  );
}

export function Notice({ children }: { children: ReactNode }) {
  return <p className="mx-4 mt-6 rounded-2xl border bg-card px-4 py-6 text-center text-sm text-muted-foreground">{children}</p>;
}

/** Shown on pages that only the agent of an agency can open. */
export function AgentOnly({ state, failed, children }: { state: AgencyState | null; failed: boolean; children: (s: Extract<AgencyState, { kind: "agent" }>) => ReactNode }) {
  if (failed) return <Notice>ماقدرناش نحمّل بيانات الوكالة، جرب تاني.</Notice>;
  if (!state) return <Notice>…</Notice>;
  if (state.kind === "missing") return <Notice>نظام الوكالات لسه مش جاهز في قاعدة البيانات.</Notice>;
  if (state.kind !== "agent") return <Notice>الصفحة دي للوكيل بس.</Notice>;
  return <>{children(state)}</>;
}
