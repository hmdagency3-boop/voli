import { useEffect, useRef } from "react";
import { useNavigate, useRouter } from "@tanstack/react-router";
import { NATIVE_APP } from "@/lib/native-app";
import { isRoomOnScreen, useKeptRoom } from "@/lib/room-keeper";

const MIC_ASKED = "voli-mic-permission-asked";

/** Android-only behaviour: the phone's back button and asking for the microphone on first launch. */
export function NativeAppBridge() {
  const router = useRouter();
  const navigate = useNavigate();
  const kept = useKeptRoom();
  const keptRef = useRef(kept);
  keptRef.current = kept;

  // Back: close an open sheet first, then go to the previous page (a room on screen is kept, not left).
  // Only on the first page does the app go to the background, still in the room; it never quits.
  useEffect(() => {
    if (!NATIVE_APP) return;
    let remove: (() => void) | undefined;
    let alive = true;
    void import("@capacitor/app").then(({ App }) => {
      const handle = App.addListener("backButton", () => {
        const open = document.querySelector('[role="dialog"][data-state="open"], [role="alertdialog"][data-state="open"]');
        if (open) { document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true })); return; }
        const path = router.state.location.pathname;
        if (router.history.canGoBack()) { router.history.back(); return; }
        if (path !== "/" || isRoomOnScreen(path, keptRef.current.publicId)) { navigate({ to: "/", replace: true }); return; }
        void App.minimizeApp();
      });
      void handle.then((h) => { if (alive) remove = () => { void h.remove(); }; else void h.remove(); });
    }).catch(() => {});
    return () => { alive = false; remove?.(); };
  }, [router, navigate]);

  // Ask for the microphone once, so the phone shows its permission prompt before the first mic seat.
  useEffect(() => {
    if (!NATIVE_APP || localStorage.getItem(MIC_ASKED) || !navigator.mediaDevices?.getUserMedia) return;
    localStorage.setItem(MIC_ASKED, "1");
    navigator.mediaDevices.getUserMedia({ audio: true })
      .then((stream) => stream.getTracks().forEach((t) => t.stop()))
      .catch(() => {});
  }, []);

  return null;
}
