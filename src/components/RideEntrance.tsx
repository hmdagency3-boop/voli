import { useEffect, useRef } from "react";
import { NO_POSTER } from "@/lib/video-poster";
import { useRoomVideo } from "@/lib/use-room-video";
import type { WornItem } from "@/lib/store";

const LOADING_MS = 12000;
const LONGEST_MS = 30000;
const PICTURE_MS = 4500;

/** A member's store ride coming into the room: its video (muted when the browser refuses sound) or its picture. */
export function RideEntrance({ ride, name, onDone }: { ride: WornItem; name: string; onDone: () => void }) {
  return ride.video_url
    ? <RideVideo url={ride.video_url} label={`${name} دخل بـ ${ride.name}`} onDone={onDone} />
    : <RidePicture art={ride.art_url} label={`${name} دخل بـ ${ride.name}`} onDone={onDone} />;
}

function RideVideo({ url, label, onDone }: { url: string; label: string; onDone: () => void }) {
  const { videoProps, visible, ended } = useRoomVideo(onDone, { loadingMs: LOADING_MS, longestMs: LONGEST_MS });
  if (ended) return null;
  return (
    <div className="pointer-events-none absolute inset-0 z-40 grid place-items-center overflow-hidden" aria-live="polite">
      <video {...videoProps} src={url} poster={NO_POSTER}
        className={`h-full w-full object-contain transition-opacity duration-200 ${visible ? "opacity-100" : "opacity-0"}`} />
      <Label text={label} />
    </div>
  );
}

function RidePicture({ art, label, onDone }: { art: string; label: string; onDone: () => void }) {
  const done = useRef(onDone);
  done.current = onDone;
  useEffect(() => { const t = setTimeout(() => done.current(), PICTURE_MS); return () => clearTimeout(t); }, []);
  return (
    <div className="pointer-events-none absolute inset-0 z-40 grid place-items-center overflow-hidden" aria-live="polite">
      <img src={art} alt="" className="w-3/4 max-w-xs object-contain drop-shadow-2xl animate-in slide-in-from-right-full fade-in duration-700" />
      <Label text={label} />
    </div>
  );
}

const Label = ({ text }: { text: string }) => (
  <p className="absolute inset-x-4 top-24 mx-auto w-fit max-w-full truncate rounded-full bg-overlay px-4 py-1.5 text-sm font-bold text-on-media animate-in fade-in slide-in-from-top-2 duration-500">
    {text}
  </p>
);
