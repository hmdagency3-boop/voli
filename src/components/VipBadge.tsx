import type { ReactNode } from "react";
import { Crown } from "lucide-react";
import { vipTier } from "@/lib/vip";
import { vipBadgeArt } from "@/lib/vip-art";

/** Chat badge "Dragon V1…V8": the tier's picture, or a drawn placeholder until it arrives. */
export function VipBadge({ level, className = "" }: { level: number; className?: string }) {
  const tier = vipTier(level);
  if (!tier) return null;
  const art = vipBadgeArt(tier.level);
  if (art) {
    return (
      <img
        src={art}
        alt={`VIP ${tier.level} — ${tier.nameAr}`}
        title={tier.nameAr}
        draggable={false}
        className={`inline-block h-7 w-auto shrink-0 object-contain ${className}`}
      />
    );
  }
  return (
    <span
      dir="ltr"
      role="img"
      aria-label={`VIP ${tier.level} — ${tier.nameAr}`}
      title={tier.nameAr}
      className={`inline-flex h-[22px] items-center gap-0.5 rounded-full px-2 text-[11px] font-extrabold leading-none text-vip-on ${tier.bg} ${className}`}
    >
      <Crown className="size-3" aria-hidden="true" />V{tier.level}
    </span>
  );
}

/** Profile frame for a VIP tier (coloured ring placeholder until the dragon frame pictures arrive). */
export function VipFrame({ level, children, className = "" }: { level: number; children: ReactNode; className?: string }) {
  const tier = vipTier(level);
  if (!tier) return <>{children}</>;
  return (
    <span
      className={`relative inline-grid shrink-0 rounded-full ring-4 ${tier.ring} ${className}`}
      style={tier.level >= 3 ? { boxShadow: `0 0 ${8 + tier.level * 2}px ${tier.color}` } : undefined}
      title={tier.nameAr}
    >
      {children}
    </span>
  );
}
