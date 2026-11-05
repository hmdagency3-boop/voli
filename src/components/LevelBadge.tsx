import type { Badge } from '@/lib/badges';

/** Level badge picture with "Lv.N" written on its plate. Scales with its width. */
export function LevelBadge({ badge, level, locked = false, className = '' }: { badge: Badge; level: number; locked?: boolean; className?: string }) {
  return (
    <div dir="ltr" className={`relative [container-type:inline-size] ${className}`} aria-label={`المستوى ${level}`} role="img">
      <img src={badge.url} alt="" draggable={false} className={`block w-full select-none ${locked ? 'opacity-50 grayscale' : ''}`} />
      <span
        className="absolute -translate-x-1/2 -translate-y-1/2 whitespace-nowrap font-sans font-semibold leading-none tabular-nums text-on-media [text-shadow:0_1px_1px_rgb(0_0_0/0.6)]"
        style={{ left: `${badge.textX}%`, top: `${badge.textY}%`, fontSize: '12cqw' }}
      >
        {level}
      </span>
    </div>
  );
}
