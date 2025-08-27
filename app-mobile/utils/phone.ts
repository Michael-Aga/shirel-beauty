export const IL_PREFIX = '+972';
export const IL_REQUIRED_DIGITS = 9;

export const onlyDigits = (s: string) => s.replace(/\D/g, '');

export function toILDigits(input: string): string {
  let d = onlyDigits(input);
  if (d.startsWith('972')) d = d.slice(3);
  if (d.startsWith('0')) d = d.slice(1);
  return d.slice(0, IL_REQUIRED_DIGITS);
}

export const isValidILDigits = (d: string) => /^\d{9}$/.test(d);

export const toWhatsappE164 = (digits9: string) => `whatsapp:${IL_PREFIX}${digits9}`;
export const toE164 = (digits9: string) => `${IL_PREFIX}${digits9}`;

