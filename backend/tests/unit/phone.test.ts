import { normalizePhoneForWhatsApp } from '../../src/utils/phone';

describe('normalizePhoneForWhatsApp', () => {
  it('normalizes E.164 numbers', () => {
    expect(normalizePhoneForWhatsApp('+923001234567')).toBe('+923001234567');
  });

  it('adds country code for local numbers starting with 0', () => {
    expect(normalizePhoneForWhatsApp('03001234567', '92')).toBe('+923001234567');
  });

  it('returns null for empty input', () => {
    expect(normalizePhoneForWhatsApp('')).toBeNull();
  });
});
