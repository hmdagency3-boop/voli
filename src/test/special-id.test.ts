import { describe, expect, it } from 'vitest';
import { shownId, specialIdFrame } from '@/lib/special-id';

describe('special ID frames by VIP level', () => {
  it('VIP 10–29 is silver', () => {
    expect(specialIdFrame(10).name).toBe('silver');
    expect(specialIdFrame(29).name).toBe('silver');
  });
  it('admin-granted special ID below VIP 10 is silver', () => {
    expect(specialIdFrame(0).name).toBe('silver');
    expect(specialIdFrame(9).name).toBe('silver');
  });
  it('VIP 30–49 is gold', () => {
    expect(specialIdFrame(30).name).toBe('gold');
    expect(specialIdFrame(49).name).toBe('gold');
  });
  it('VIP 50–79 is purple', () => {
    expect(specialIdFrame(50).name).toBe('purple');
    expect(specialIdFrame(79).name).toBe('purple');
  });
  it('VIP 80–100 is red', () => {
    expect(specialIdFrame(80).name).toBe('red');
    expect(specialIdFrame(100).name).toBe('red');
  });
});

describe('shown ID', () => {
  it('special ID replaces the normal ID', () => {
    expect(shownId({ public_id: 1234567, special_id: '777' })).toBe('777');
  });
  it('without a special ID the normal ID shows', () => {
    expect(shownId({ public_id: 1234567, special_id: null })).toBe('1234567');
  });
});
