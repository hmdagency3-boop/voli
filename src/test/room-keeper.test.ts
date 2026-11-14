import { describe, expect, it } from "vitest";
import { closeRoom, isRoomOnScreen, openRoom, setKeptInfo, useKeptRoom } from "@/lib/room-keeper";
import { renderHook, act } from "@testing-library/react";

describe("keeping a room (احتفاظ بالروم)", () => {
  it("the kept room is full screen only on its own page", () => {
    expect(isRoomOnScreen("/room/123", "123")).toBe(true);
    expect(isRoomOnScreen("/room/123/", "123")).toBe(true);
    expect(isRoomOnScreen("/chat", "123")).toBe(false);
    expect(isRoomOnScreen("/room/456", "123")).toBe(false);
    expect(isRoomOnScreen("/room/123", null)).toBe(false);
  });

  it("opening another room replaces the kept one, and leaving clears it", () => {
    const { result } = renderHook(() => useKeptRoom());
    act(() => openRoom("123"));
    act(() => setKeptInfo({ publicId: "123", inside: true, name: "a", picture: null, speaking: false }));
    expect(result.current.publicId).toBe("123");
    expect(result.current.info?.inside).toBe(true);
    act(() => openRoom("456"));
    expect(result.current.publicId).toBe("456");
    expect(result.current.info).toBeNull();
    act(() => closeRoom());
    expect(result.current.publicId).toBeNull();
  });
});
