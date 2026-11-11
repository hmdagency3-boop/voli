# Update 024 — SVGA frames (إطارات SVGA)

1. Owner: run `sql/024_store_svga.sql` once in Voli's SQL Editor (after 023). Safe to run again.
2. Panel: "صانع الإطارات" page builds an animated frame from pieces (layers, ready-made moves, mirror copy, glow, moving shine,
   sparkles), exports a real `.svga` (SVGA 2.0) file and publishes it to the store with its still picture.
   The Store page also accepts ready-made `.svga` files for any frame or ride and plays them.
3. Voli app (separate project) — paste this request there:

> شغّل إطارات وحركات المتجر بصيغة SVGA: عمود جديد `svga_url` في `store_items` (ملف .svga 2.0 على Cloudinary).
> لو `svga_url` موجود: شغّله بمكتبة SVGA (مثلاً `svgaplayer_flutter` أو `SVGAPlayer-Android` / `SVGAPlayer-iOS` / `svgaplayerweb`) بتكرار لا نهائي،
> مربع فوق صورة العضو ومتمركز عليها (الإطار مصمم إن صورة العضو تاخد حوالي 60% من عرضه في النص)، في الغرفة والبروفايل والمقاعد والمتجر والحقيبة.
> لو مش موجود: اعرض `art_url` زي دلوقتي. للدخوليات: لو `svga_url` موجود شغّله مرة واحدة عند دخول الغرفة بدل الفيديو.
