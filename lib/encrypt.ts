import crypto from 'crypto';
import { env } from './env';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12;
const SALT_LENGTH = 16;
const KEY_LENGTH = 32;
const ITERATIONS = 100000;

function getSecretKey(): string {
  return env.ENCRYPTION_KEY;
}

/**
 * Encrypts text using AES-256-GCM with PBKDF2 key derivation.
 * The output format is v2:salt:iv:tag:encrypted_hex
 */
export function encrypt(text: string): string {
  const salt = crypto.randomBytes(SALT_LENGTH);
  const iv = crypto.randomBytes(IV_LENGTH);
  
  // Derive a strong key from the environment secret
  const key = crypto.pbkdf2Sync(getSecretKey(), salt, ITERATIONS, KEY_LENGTH, 'sha256');
  
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  
  const tag = cipher.getAuthTag();
  
  return `v2:${salt.toString('hex')}:${iv.toString('hex')}:${tag.toString('hex')}:${encrypted}`;
}

/**
 * Decrypts text encrypted with the above encrypt function.
 * Supports v2 format.
 */
export function decrypt(ciphertext: string): string {
  if (!ciphertext.startsWith('v2:')) {
    // If it doesn't start with v2, it might be legacy CryptoJS format.
    // In a real migration, we would handle CryptoJS.AES.decrypt here.
    // For security improvement, we encourage moving to the new format.
    throw new Error('Unsupported or legacy encryption format. Please re-save settings.');
  }

  const parts = ciphertext.split(':');
  if (parts.length !== 5) {
    throw new Error('Invalid ciphertext format');
  }

  const salt = Buffer.from(parts[1], 'hex');
  const iv = Buffer.from(parts[2], 'hex');
  const tag = Buffer.from(parts[3], 'hex');
  const encryptedText = parts[4];

  const key = crypto.pbkdf2Sync(getSecretKey(), salt, ITERATIONS, KEY_LENGTH, 'sha256');
  
  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(tag);
  
  let decrypted = decipher.update(encryptedText, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  
  return decrypted;
}
