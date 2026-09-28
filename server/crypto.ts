import crypto from 'node:crypto';

// Secret key for AES-256-GCM encryption of credentials
const ENCRYPTION_KEY = process.env.APP_ENCRYPTION_KEY 
  ? crypto.scryptSync(process.env.APP_ENCRYPTION_KEY, 'privakey-salt', 32)
  : crypto.scryptSync('privakey-default-secure-vault-key-2026', 'privakey-salt', 32);

export function hashPassword(password: string): { salt: string; hash: string } {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.pbkdf2Sync(password, salt, 100000, 64, 'sha512').toString('hex');
  return { salt, hash };
}

export function verifyPassword(password: string, salt: string, expectedHash: string): boolean {
  const hash = crypto.pbkdf2Sync(password, salt, 100000, 64, 'sha512').toString('hex');
  return crypto.timingSafeEqual(Buffer.from(hash, 'hex'), Buffer.from(expectedHash, 'hex'));
}

export function encryptCredential(plainText: string): string {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', ENCRYPTION_KEY, iv);
  let encrypted = cipher.update(plainText, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const authTag = cipher.getAuthTag().toString('hex');
  return `${iv.toString('hex')}:${authTag}:${encrypted}`;
}

export function decryptCredential(cipherText: string): string {
  try {
    const parts = cipherText.split(':');
    if (parts.length !== 3) {
      // If unencrypted fallback for testing
      return cipherText;
    }
    const [ivHex, authTagHex, encryptedHex] = parts;
    const decipher = crypto.createDecipheriv('aes-256-gcm', ENCRYPTION_KEY, Buffer.from(ivHex, 'hex'));
    decipher.setAuthTag(Buffer.from(authTagHex, 'hex'));
    let decrypted = decipher.update(encryptedHex, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  } catch (err) {
    console.error('Error decrypting credential:', err);
    return '*** Error al descifrar credencial ***';
  }
}

export function generateToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

export function generateCustomerCode(): string {
  return 'CLI-' + crypto.randomInt(10000, 99999).toString();
}

export function generateOrderCode(): string {
  return 'ORD-' + crypto.randomInt(100000, 999999).toString();
}

export function generateInviteCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let result = 'INV-';
  for (let i = 0; i < 8; i++) {
    if (i === 4) result += '-';
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

export function generateMovementCode(): string {
  return 'MOV-' + crypto.randomInt(100000, 999999).toString();
}

export function generateCaseCode(): string {
  return 'GAR-' + crypto.randomInt(10000, 99999).toString();
}

export function generateAccountId(): string {
  return 'CTA-' + crypto.randomInt(10000, 99999).toString();
}
