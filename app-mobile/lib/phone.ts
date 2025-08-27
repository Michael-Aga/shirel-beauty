// app-mobile/lib/phone.ts
export function onlyDigits(s: string) {
  return s.replace(/\D/g, "");
}

// Keep only the 9 digits after +972 (no leading 0)
export function normalizeILDigits(raw: string) {
  const d = onlyDigits(raw);
  // If user types a local '0' first, drop it (e.g., 05... -> 5...)
  const noLeadingZero = d.replace(/^0+/, "");
  return noLeadingZero.slice(0, 9);
}

export function isValidILDigits(digits: string) {
  return /^\d{9}$/.test(digits);
}

export function toWhatsappE164(digits: string) {
  return `whatsapp:+972${digits}`;
}

