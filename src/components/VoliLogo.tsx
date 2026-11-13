import logoUrl from "@/assets/voli-app-icon.webp";

/** The Voli dragon app icon (same art as the Android launcher icon). */
export function VoliLogo({ className = "" }: { className?: string }) {
  return <img src={logoUrl} alt="Voli" width={512} height={512} draggable={false} className={`object-contain ${className}`} />;
}
