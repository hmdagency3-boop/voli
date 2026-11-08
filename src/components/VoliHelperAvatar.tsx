export function VoliHelperAvatar({ className = "size-12" }: { className?: string }) {
  return <img src="/icons/voli-512.png" alt="لوجو Voli — إشعارات الإدارة" width={512} height={512} draggable={false} className={`shrink-0 rounded-full object-contain ${className}`} />;
}