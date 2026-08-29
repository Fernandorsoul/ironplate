export function isValidResetToken(value: string): boolean {
  return /^[a-f0-9]{64}$/i.test(value.trim());
}
