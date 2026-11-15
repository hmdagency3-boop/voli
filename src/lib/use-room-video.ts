import { useCallback, useEffect, useRef, useState } from "react";

/** A playing video whose picture has not moved for this long is treated as finished (frozen / paused by the phone). */
export const FROZEN_MS = 3500;
/** How often the guard looks at the video. */
const TICK_MS = 400;

export type VideoLimits = { loadingMs: number; longestMs: number };

/**
 * Plays a room video (entrance ride or gift) exactly once and always ends it:
 * on `ended`, at its last frame, when its picture stops moving, when it never starts, when
 * the app goes to the background, or after `longestMs`. When it ends the video is stopped,
 * hidden and emptied right away, so it can neither loop nor stay frozen on its last frame.
 */
export function useRoomVideo(onDone: () => void, limits: VideoLimits) {
  const ref = useRef<HTMLVideoElement>(null);
  const [playing, setPlaying] = useState(false);
  const [ended, setEnded] = useState(false);
  const done = useRef(onDone);
  done.current = onDone;
  const finished = useRef(false);

  const finish = useCallback(() => {
    if (finished.current) return;
    finished.current = true;
    const v = ref.current;
    if (v) { v.loop = false; try { v.pause(); } catch { /* already gone */ } }
    setEnded(true);
    done.current();
  }, []);

  useEffect(() => {
    finished.current = false;
    const v = ref.current;
    const started = Date.now();
    let lastTime = -1;
    let lastMove = started;
    let sawPlay = false;
    if (v) {
      v.loop = false;
      v.muted = false;
      v.play().catch(() => { v.muted = true; v.play().catch(finish); });
    }
    const tick = setInterval(() => {
      const el = ref.current;
      const now = Date.now();
      if (!el || document.hidden || now - started > limits.longestMs) return finish();
      if (el.ended || el.error) return finish();
      const d = el.duration;
      if (Number.isFinite(d) && d > 0 && el.currentTime >= d - 0.15) return finish();
      if (el.currentTime > 0) sawPlay = true;
      if (el.currentTime !== lastTime) { lastTime = el.currentTime; lastMove = now; return; }
      // Never started, or started and then stopped moving (frozen frame, paused by the phone).
      if (!sawPlay ? now - started > limits.loadingMs : now - lastMove > FROZEN_MS) finish();
    }, TICK_MS);
    return () => {
      clearInterval(tick);
      // Release the phone's video decoder so the next video starts clean.
      if (v) { try { v.pause(); v.removeAttribute("src"); v.load(); } catch { /* ignore */ } }
    };
    // Runs once per mounted video; the parent remounts with a new key for the next one.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const videoProps = {
    ref,
    loop: false,
    playsInline: true,
    preload: "auto" as const,
    onPlaying: () => setPlaying(true),
    onEnded: finish,
    onError: finish,
  };
  return { videoProps, visible: playing && !ended, ended, finish };
}
