import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { Building2, Gift, LayoutDashboard, LogOut, Radio, ScrollText, ShieldCheck, Users } from "lucide-react";
import { adminSignIn, adminSignOut, getAdminAccess, getAdminName, useAdminSession, type AdminAccess } from "@/lib/admin";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

/** The panel's own sign-in screen. It signs in to the panel only, never to the member app. */
function AdminLogin() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!email.trim() || !password) { setError("اكتب البريد وكلمة السر"); return; }
    setBusy(true);
    setError(await adminSignIn(email, password));
    setBusy(false);
  }
  return (
    <div className="grid h-dvh place-items-center bg-muted px-6">
      <form onSubmit={submit} className="w-full max-w-sm space-y-4 rounded-2xl border border-border bg-card p-6 shadow-sm">
        <div className="flex items-center gap-3">
          <span className="grid size-11 place-items-center rounded-2xl bg-primary text-primary-foreground">
            <ShieldCheck className="size-5" />
          </span>
          <div>
            <p className="font-display text-xl font-extrabold leading-none">voli</p>
            <p className="mt-1 text-xs text-muted-foreground">دخول لوحة الإدارة</p>
          </div>
        </div>
        <div className="space-y-2">
          <Input type="email" dir="ltr" autoComplete="username" placeholder="البريد الإلكتروني" value={email} onChange={(e) => setEmail(e.target.value)} />
          <Input type="password" dir="ltr" autoComplete="current-password" placeholder="كلمة السر" value={password} onChange={(e) => setPassword(e.target.value)} />
        </div>
        {error && <p className="text-sm text-destructive">{error}</p>}
        <Button type="submit" className="w-full" disabled={busy}>{busy ? "…" : "دخول"}</Button>
      </form>
    </div>
  );
}

const NAV = [
  { to: "/admin", label: "الرئيسية", icon: LayoutDashboard, exact: true },
  { to: "/admin/members", label: "الأعضاء", icon: Users, exact: false },
  { to: "/admin/rooms", label: "الرومات", icon: Radio, exact: false },
  { to: "/admin/gifts", label: "الهدايا والأسعار", icon: Gift, exact: false },
  { to: "/admin/agencies", label: "الوكالات", icon: Building2, exact: false },
  { to: "/admin/log", label: "سجل الإدارة", icon: ScrollText, exact: false },
] as const;

/**
 * Full-screen desktop-first frame for the management panel. It is a separate site with its own
 * sign-in: it never uses the member app's session, and opens only for top management.
 */
export function AdminShell({ children }: { children: ReactNode }) {
  const { session, ready } = useAdminSession();
  const [access, setAccess] = useState<AdminAccess | null>(null);
  const [name, setName] = useState<string | null>(null);
  const me = session?.user.id;
  useEffect(() => {
    setAccess(null);
    setName(null);
    if (!me) return;
    getAdminAccess().then(setAccess);
    getAdminName(me).then(setName);
  }, [me]);

  if (!ready || (me && access === null)) {
    return <div className="grid h-dvh place-items-center bg-muted text-sm text-muted-foreground">…</div>;
  }
  if (!session) return <AdminLogin />;
  if (access !== "admin") {
    return (
      <div className="grid h-dvh place-items-center bg-muted px-6 text-center">
        <div className="max-w-sm space-y-3">
          {access === "missing" ? (
            <>
              <h1 className="text-lg font-bold">لوحة الإدارة لسه مش جاهزة</h1>
              <p className="text-sm text-muted-foreground">شغّل ملف supabase/009_admin.sql في محرر قاعدة البيانات، وبعدها حدّث الصفحة.</p>
            </>
          ) : (
            <>
              <h1 className="text-lg font-bold">الحساب ده مالوش صلاحية الإدارة</h1>
              <p className="text-sm text-muted-foreground">ادخل بحساب الإدارة العليا.</p>
            </>
          )}
          <Button variant="secondary" onClick={() => adminSignOut()}>
            <LogOut className="size-4" /> الدخول بحساب تاني
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-dvh flex-col overflow-hidden bg-muted lg:flex-row">
      <aside className="relative shrink-0 border-b border-border bg-background lg:flex lg:w-64 lg:flex-col lg:border-b-0 lg:border-l">
        <div className="flex items-center gap-3 px-5 py-4 lg:py-6">
          <span className="grid size-10 place-items-center rounded-2xl bg-primary text-primary-foreground">
            <ShieldCheck className="size-5" />
          </span>
          <div className="min-w-0">
            <p className="font-display text-lg font-extrabold leading-none">voli</p>
            <p className="mt-1 text-xs text-muted-foreground">لوحة الإدارة</p>
          </div>
        </div>
        <nav className="flex gap-1 overflow-x-auto px-3 pb-3 [scrollbar-width:none] lg:flex-1 lg:flex-col lg:overflow-visible lg:pb-0">
          {NAV.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              activeOptions={{ exact: item.exact }}
              className="flex shrink-0 items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
              activeProps={{ className: "bg-secondary !text-foreground" }}
            >
              <item.icon className="size-4" />
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="hidden items-center justify-between gap-2 border-t border-border px-5 py-4 text-xs text-muted-foreground lg:flex">
          <span className="min-w-0 truncate">
            داخل باسم <span className="font-semibold text-foreground">{name ?? session.user.email}</span>
          </span>
          <button onClick={() => adminSignOut()} className="inline-flex shrink-0 items-center gap-1 font-semibold hover:text-foreground">
            <LogOut className="size-3.5" /> خروج
          </button>
        </div>
        <button onClick={() => adminSignOut()} className="absolute left-4 top-5 inline-flex items-center gap-1 text-xs font-semibold text-muted-foreground hover:text-foreground lg:hidden">
          <LogOut className="size-3.5" /> خروج
        </button>
      </aside>
      <main className="min-h-0 flex-1 overflow-y-auto overscroll-contain [scrollbar-width:thin]">
        <div className="mx-auto w-full max-w-6xl px-4 py-6 lg:px-8 lg:py-8">{children}</div>
      </main>
    </div>
  );
}

export function PageTitle({ title, hint, actions }: { title: string; hint?: string; actions?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="text-2xl font-extrabold">{title}</h1>
        {hint && <p className="mt-1 text-sm text-muted-foreground">{hint}</p>}
      </div>
      {actions}
    </div>
  );
}

export function Panel({ title, children, className, actions }: { title?: string; children: ReactNode; className?: string; actions?: ReactNode }) {
  return (
    <section className={cn("rounded-2xl border border-border bg-card p-4 lg:p-5", className)}>
      {(title || actions) && (
        <div className="mb-3 flex items-center justify-between gap-2">
          {title && <h2 className="text-sm font-bold">{title}</h2>}
          {actions}
        </div>
      )}
      {children}
    </section>
  );
}

export function Empty({ children }: { children: ReactNode }) {
  return <p className="py-10 text-center text-sm text-muted-foreground">{children}</p>;
}

export function Person({ name, publicId, avatar, sub }: { name: string; publicId?: number | string | null; avatar?: string | null; sub?: ReactNode }) {
  return (
    <div className="flex min-w-0 items-center gap-3">
      {avatar ? (
        <img src={avatar} alt="" className="size-9 shrink-0 rounded-full object-cover" />
      ) : (
        <span className="grid size-9 shrink-0 place-items-center rounded-full bg-secondary text-sm font-bold">{name.slice(0, 1)}</span>
      )}
      <div className="min-w-0">
        <p className="truncate text-sm font-semibold">{name}</p>
        <p className="truncate text-xs text-muted-foreground">{publicId != null && <bdi dir="ltr">ID {publicId}</bdi>}{sub}</p>
      </div>
    </div>
  );
}
