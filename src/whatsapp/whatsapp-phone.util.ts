/**
 * Phone normalisation for WhatsApp.
 *
 * Provider phones are stored in mixed shapes (`+91…`, `91…`, `0…`, bare
 * 10-digit). We store E.164 with a leading "+" and send digits only to Meta.
 */

/**
 * Returns `+91XXXXXXXXXX` for Indian 10-digit inputs (also `0XXXXXXXXXX`,
 * `91XXXXXXXXXX`), `+<7-15 digits>` for anything that already carries a
 * country code with "+", and null for garbage.
 */
export function toE164(raw: string | null | undefined): string | null {
  if (!raw) return null;
  let cleaned = String(raw)
    .trim()
    .replace(/[\s\-().]/g, '');
  if (!cleaned) return null;

  if (cleaned.startsWith('00')) cleaned = `+${cleaned.slice(2)}`;

  if (cleaned.startsWith('+')) {
    const digits = cleaned.slice(1);
    if (!/^\d{7,15}$/.test(digits)) return null;
    // "+0XXXXXXXXXX" is a mistyped Indian local number
    if (digits.length === 11 && digits.startsWith('0')) {
      return isIndianSubscriber(digits.slice(1))
        ? `+91${digits.slice(1)}`
        : null;
    }
    return `+${digits}`;
  }

  if (!/^\d+$/.test(cleaned)) return null;

  if (cleaned.length === 10) {
    return isIndianSubscriber(cleaned) ? `+91${cleaned}` : null;
  }
  if (cleaned.length === 11 && cleaned.startsWith('0')) {
    const sub = cleaned.slice(1);
    return isIndianSubscriber(sub) ? `+91${sub}` : null;
  }
  if (cleaned.length === 12 && cleaned.startsWith('91')) {
    const sub = cleaned.slice(2);
    return isIndianSubscriber(sub) ? `+91${sub}` : null;
  }
  return null;
}

/** Indian mobile numbers start with 6-9. */
function isIndianSubscriber(tenDigits: string): boolean {
  return /^[6-9]\d{9}$/.test(tenDigits);
}

/** `+919876543210` → `919876543210` (what the Cloud API wants). */
export function toApiDigits(e164: string): string {
  return e164.replace(/^\+/, '');
}

/**
 * Digit strings that a stored phone column might equal once its own
 * non-digits are stripped. Used to link inbound numbers to providers/users.
 */
export function phoneDigitVariants(e164: string): string[] {
  const digits = toApiDigits(e164);
  const variants = new Set<string>([digits]);
  if (digits.startsWith('91') && digits.length === 12) {
    variants.add(digits.slice(2));
    variants.add(`0${digits.slice(2)}`);
  }
  return [...variants];
}
