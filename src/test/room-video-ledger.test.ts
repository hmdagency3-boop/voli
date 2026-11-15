import { describe, expect, it } from 'vitest';
import { claimEntrance, claimGiftShow, ENTRANCE_REPEAT_MS, newLedger } from '@/lib/room-video-ledger';

describe('room video ledger', () => {
  it('plays the same member entrance only once in a row in the same room', () => {
    const l = newLedger();
    expect(claimEntrance('r1', 'a', 0, l)).toBe(true);
    expect(claimEntrance('r1', 'a', 1000, l)).toBe(false);
    expect(claimEntrance('r1', 'a', ENTRANCE_REPEAT_MS - 1, l)).toBe(false);
  });
  it('still plays a real re-entry after three minutes', () => {
    const l = newLedger();
    claimEntrance('r1', 'a', 0, l);
    expect(ENTRANCE_REPEAT_MS).toBe(3 * 60 * 1000);
    expect(claimEntrance('r1', 'a', ENTRANCE_REPEAT_MS, l)).toBe(true);
  });
  it('keeps members and rooms apart', () => {
    const l = newLedger();
    claimEntrance('r1', 'a', 0, l);
    expect(claimEntrance('r1', 'b', 10, l)).toBe(true);
    expect(claimEntrance('r2', 'a', 10, l)).toBe(true);
  });
  it('plays each gift video once', () => {
    const l = newLedger();
    expect(claimGiftShow('r1', 7, l)).toBe(true);
    expect(claimGiftShow('r1', 7, l)).toBe(false);
    expect(claimGiftShow('r1', 8, l)).toBe(true);
  });
});
