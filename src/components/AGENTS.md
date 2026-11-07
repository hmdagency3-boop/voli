# Components

- AuthGate decides from both the address and the page actually on screen (canShowPage), because the router keeps the previous page mounted while it moves, so a signed-out visitor never glimpses an inside page and a signed-in member never glimpses login.
- AuthGate skips /admin entirely (isAdminPath): the panel is its own site with its own sign-in through adminSupabase (separate storage key), so admin and member sessions never mix and the member login, redirects and ban screen never appear there.
- RoomGames posts each game result as a normal room chat line through sendRoomMessage, so results reach everyone inside without new SQL; games are listed in src/lib/room-games.ts and only "ready" ones can be played.
