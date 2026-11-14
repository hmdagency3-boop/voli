import { createFileRoute } from "@tanstack/react-router";
import { useEffect } from "react";
import { Loader2 } from "lucide-react";
import { openRoom } from "@/lib/room-keeper";

export const Route = createFileRoute("/room/$publicId")({
  head: () => ({
    meta: [
      { title: "روم الحفلة — voli" },
      { name: "description", content: "ادخل الروم، اطلع على المايك واتكلم مع الناس على voli." },
      { property: "og:title", content: "روم الحفلة — voli" },
      { property: "og:description", content: "ادخل الروم، اطلع على المايك واتكلم مع الناس على voli." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: RoomPage,
});

/** The room itself lives in the root layout (KeptRoom) so it survives being minimized; this page only opens it. */
function RoomPage() {
  const { publicId } = Route.useParams();
  useEffect(() => { openRoom(publicId); }, [publicId]);
  return (
    <div className="grid h-dvh place-items-center bg-muted">
      <Loader2 className="size-8 animate-spin text-muted-foreground" aria-label="جاري الدخول" />
    </div>
  );
}
