import { describe, expect, it } from "vitest";
import { freshArrivals, newArrivalWatch, REANNOUNCE_GAP_MS, WATCH_GAP_MS, watchArrivals } from "@/lib/room-arrivals";

describe("room entrances", () => {
  it("the first load announces nobody", () => {
    const m = new Map<string, number>();
    expect(freshArrivals(m, ["a", "b"], "me", 0, true)).toEqual([]);
  });

  it("a member who just came in is announced once", () => {
    const m = new Map<string, number>();
    freshArrivals(m, ["a"], "me", 0, true);
    expect(freshArrivals(m, ["a", "b"], "me", 3000, false)).toEqual(["b"]);
    expect(freshArrivals(m, ["a", "b"], "me", 6000, false)).toEqual([]);
  });

  it("dropping out of the list briefly does not replay the entrance", () => {
    const m = new Map<string, number>();
    freshArrivals(m, ["a", "b"], "me", 0, true);
    freshArrivals(m, ["a"], "me", 60_000, false);
    expect(freshArrivals(m, ["a", "b"], "me", 120_000, false)).toEqual([]);
  });

  it("coming back after more than 5 minutes away is announced again", () => {
    const m = new Map<string, number>();
    freshArrivals(m, ["b"], "me", 0, true);
    freshArrivals(m, [], "me", 3000, false);
    expect(freshArrivals(m, ["b"], "me", REANNOUNCE_GAP_MS - 1, false)).toEqual([]);
    freshArrivals(m, [], "me", REANNOUNCE_GAP_MS, false);
    expect(freshArrivals(m, ["b"], "me", 2 * REANNOUNCE_GAP_MS + 10, false)).toEqual(["b"]);
  });

  it("never announces the viewer and never twice in one list", () => {
    const m = new Map<string, number>();
    freshArrivals(m, [], "me", 0, true);
    expect(freshArrivals(m, ["me", "c", "c"], "me", 3000, false)).toEqual(["c"]);
  });

  it("coming back to the app after a long background break replays nobody's entrance", () => {
    const w = newArrivalWatch();
    watchArrivals(w, ["a", "b"], "me", 0);
    const back = 10 * 60 * 1000;
    expect(watchArrivals(w, ["a", "b", "c"], "me", back)).toEqual([]);
    expect(watchArrivals(w, ["a", "b", "c"], "me", back + 3000)).toEqual([]);
  });

  it("while watching, a member who walks in is still announced", () => {
    const w = newArrivalWatch();
    watchArrivals(w, ["a"], "me", 0);
    expect(watchArrivals(w, ["a", "d"], "me", WATCH_GAP_MS)).toEqual(["d"]);
  });
});
