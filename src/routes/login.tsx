import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { AppScreen } from "@/components/AppScreen";
import { Eye, EyeOff, Lock, Phone, Mail } from "lucide-react";

export const Route = createFileRoute("/login")({
  head: () => ({
    meta: [
      { title: "تسجيل الدخول — voli" },
      { name: "description", content: "سجّل دخولك إلى voli وتابع البثوث المباشرة وأصدقاءك." },
      { property: "og:title", content: "تسجيل الدخول — voli" },
      { property: "og:description", content: "سجّل دخولك إلى voli." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: LoginPage,
});

function LoginPage() {
  const [mode, setMode] = useState<"phone" | "email">("phone");
  const [show, setShow] = useState(false);

  return (
    <AppScreen navigation={false}>
        <div className="relative h-72 bg-brand">
          <div className="absolute bottom-14 right-6 text-on-media">
            <h1 className="font-display text-4xl font-extrabold">voli.</h1>
            <p className="mt-1 text-sm opacity-90">عالمك المباشر، في جيبك ✨</p>
          </div>
        </div>

        <section className="relative -mt-8 rounded-t-[2rem] bg-background px-6 pt-8 pb-10">
          <h2 className="text-2xl font-bold">أهلاً بعودتك 👋</h2>
          <p className="mt-1 text-sm text-muted-foreground">سجّل دخولك للمتابعة</p>

          <div className="mt-6 grid grid-cols-2 rounded-full bg-secondary p-1 text-sm font-semibold">
            {(["phone", "email"] as const).map((m) => (
              <button
                key={m}
                onClick={() => setMode(m)}
                className={`rounded-full py-2.5 transition ${mode === m ? "bg-background text-foreground shadow-sm" : "text-muted-foreground"}`}
              >
                {m === "phone" ? "رقم الهاتف" : "البريد الإلكتروني"}
              </button>
            ))}
          </div>

          <form className="mt-6 space-y-4" onSubmit={(e) => e.preventDefault()}>
            <label className="flex items-center gap-3 rounded-2xl border bg-card px-4 py-3.5 focus-within:border-primary">
              {mode === "phone" ? <Phone className="size-5 text-muted-foreground" /> : <Mail className="size-5 text-muted-foreground" />}
              <input
                type={mode === "phone" ? "tel" : "email"}
                placeholder={mode === "phone" ? "رقم الهاتف" : "البريد الإلكتروني"}
                className="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
              />
            </label>
            <label className="flex items-center gap-3 rounded-2xl border bg-card px-4 py-3.5 focus-within:border-primary">
              <Lock className="size-5 text-muted-foreground" />
              <input
                type={show ? "text" : "password"}
                placeholder="كلمة المرور"
                className="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
              />
              <button type="button" aria-label="إظهار كلمة المرور" onClick={() => setShow(!show)} className="text-muted-foreground">
                {show ? <EyeOff className="size-5" /> : <Eye className="size-5" />}
              </button>
            </label>

            <div className="flex justify-start">
              <button type="button" className="text-sm font-semibold text-primary">نسيت كلمة المرور؟</button>
            </div>

            <button
              type="submit"
              className="w-full rounded-full py-4 font-bold text-primary-foreground shadow-soft transition active:scale-[0.98]"
              style={{ background: "var(--gradient-brand)" }}
            >
              تسجيل الدخول
            </button>
          </form>

          <div className="my-6 flex items-center gap-3 text-xs text-muted-foreground">
            <span className="h-px flex-1 bg-border" /> أو تابع باستخدام <span className="h-px flex-1 bg-border" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <button className="rounded-2xl border bg-card py-3 text-sm font-semibold transition hover:bg-secondary">Google</button>
            <button className="rounded-2xl border bg-card py-3 text-sm font-semibold transition hover:bg-secondary">Apple</button>
          </div>

          <p className="mt-8 text-center text-sm text-muted-foreground">
            ليس لديك حساب؟ <button className="font-bold text-primary">أنشئ حساباً</button>
          </p>
          <p className="mt-3 text-center text-xs text-muted-foreground">
            <Link to="/" className="underline">تصفّح كزائر</Link>
          </p>
        </section>
    </AppScreen>
  );
}
