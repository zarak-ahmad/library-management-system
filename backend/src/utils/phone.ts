/**
 * Normalize a phone number for WhatsApp (E.164 without the whatsapp: prefix).
 * Strips spaces/dashes; prepends default country code when the number starts with 0.
 */
export const normalizePhoneForWhatsApp = (
  phone: string,
  defaultCountryCode = '92'
): string | null => {
  const trimmed = phone.trim();
  if (!trimmed) return null;

  if (trimmed.startsWith('+')) {
    const digits = trimmed.slice(1).replace(/\D/g, '');
    return digits.length >= 10 ? `+${digits}` : null;
  }

  const digits = trimmed.replace(/\D/g, '');
  if (!digits) return null;

  if (digits.length >= 11 && digits.startsWith(defaultCountryCode)) {
    return `+${digits}`;
  }

  if (digits.startsWith('0')) {
    return `+${defaultCountryCode}${digits.slice(1)}`;
  }

  return `+${defaultCountryCode}${digits}`;
};

/** Digits-only form for matching WhatsApp JIDs to stored phone numbers. */
export const phoneDigitsOnly = (phone: string): string => phone.replace(/\D/g, '');

/** Match stored phones to Wasender sender ids (country code / formatting may differ). */
export const phonesMatch = (stored: string, incoming: string): boolean => {
  const a = phoneDigitsOnly(stored);
  const b = phoneDigitsOnly(incoming);
  if (!a || !b) return false;
  if (a === b) return true;
  if (a.endsWith(b) || b.endsWith(a)) return true;
  if (a.length >= 10 && b.length >= 10) {
    return a.slice(-10) === b.slice(-10);
  }
  return false;
};
