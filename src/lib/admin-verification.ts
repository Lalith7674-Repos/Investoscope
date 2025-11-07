// Shared verification codes store (in production, use Redis)
// This is a simple in-memory store - will be lost on server restart
export const verificationCodes = new Map<string, { code: string; expires: number }>();

export function generateCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

export function setVerificationCode(email: string, code: string, expiresInMinutes: number = 10) {
  const expires = Date.now() + expiresInMinutes * 60 * 1000;
  verificationCodes.set(email.toLowerCase().trim(), { code, expires });
}

export function getVerificationCode(email: string): { code: string; expires: number } | undefined {
  const stored = verificationCodes.get(email.toLowerCase().trim());
  if (stored && Date.now() > stored.expires) {
    verificationCodes.delete(email.toLowerCase().trim());
    return undefined;
  }
  return stored;
}

export function deleteVerificationCode(email: string) {
  verificationCodes.delete(email.toLowerCase().trim());
}


