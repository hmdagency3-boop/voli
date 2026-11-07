import { useCallback, useEffect, useState, type ReactNode } from "react";
import { toast } from "sonner";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { adminErrorMessage } from "@/lib/admin";
import { cn } from "@/lib/utils";

/** Loads data once and again whenever `deps` change or reload() is called. */
export function useLoad<T>(load: () => Promise<T>, deps: unknown[]) {
  const [data, setData] = useState<T | null>(null);
  const [failed, setFailed] = useState(false);
  const [version, setVersion] = useState(0);
  const reload = useCallback(() => setVersion((v) => v + 1), []);
  useEffect(() => {
    let active = true;
    setFailed(false);
    load().then(
      (d) => { if (active) setData(d); },
      (e) => { if (active) { setFailed(true); toast.error(adminErrorMessage(e)); } },
    );
    return () => { active = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, version]);
  return { data, failed, reload, setData };
}

/** Runs an action with a busy flag, shows success or the Arabic error. */
export function useAction() {
  const [busy, setBusy] = useState(false);
  const run = useCallback(async (fn: () => Promise<unknown>, success: string, after?: () => void) => {
    setBusy(true);
    try { await fn(); toast.success(success); after?.(); }
    catch (e) { toast.error(adminErrorMessage(e)); }
    finally { setBusy(false); }
  }, []);
  return { busy, run };
}

export function Confirm({ trigger, title, body, confirm, onConfirm, destructive }: {
  trigger: ReactNode; title: string; body?: string; confirm: string; onConfirm: () => void; destructive?: boolean;
}) {
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>{trigger}</AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          {body && <AlertDialogDescription>{body}</AlertDialogDescription>}
        </AlertDialogHeader>
        <AlertDialogFooter className="gap-2">
          <AlertDialogCancel>رجوع</AlertDialogCancel>
          <AlertDialogAction onClick={onConfirm} className={cn(destructive && "bg-destructive text-destructive-foreground hover:bg-destructive/90")}>
            {confirm}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

export function Pill({ children, tone = "muted" }: { children: ReactNode; tone?: "muted" | "primary" | "danger" | "gold" | "live" }) {
  const tones = {
    muted: "bg-secondary text-secondary-foreground",
    primary: "bg-primary/20 text-primary",
    danger: "bg-destructive/15 text-destructive",
    gold: "bg-agency-gold/15 text-agency-gold",
    live: "bg-live/15 text-live",
  } as const;
  return <span className={cn("inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-bold", tones[tone])}>{children}</span>;
}

/** Whole numbers only; empty string gives null. */
export const parseWhole = (raw: string): number | null => {
  const t = raw.trim().replace(/[,\s]/g, "");
  if (!/^-?\d+$/.test(t)) return null;
  const n = Number(t);
  return Number.isSafeInteger(n) ? n : null;
};
