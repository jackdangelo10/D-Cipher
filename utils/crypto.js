const crypto = require('crypto');
require('dotenv').config();

const SECRET_KEY = process.env.CRYPTO_SECRET_KEY;
if (!SECRET_KEY) {
  throw new Error('CRYPTO_SECRET_KEY must be set in the environment variables');
}

// Constants for IV and key sizes
const IV_LENGTH = 12; // 12 bytes for AES-GCM
const KEY_LENGTH = 32; // 32 bytes for AES-256
const AUTH_TAG_LENGTH = 16; // 16 bytes for GCM authentication tag

// Generate a key buffer from the secret key
const key = crypto.createHash('sha256').update(String(SECRET_KEY)).digest().slice(0, KEY_LENGTH);

// Encryption function
function encrypt(text) {
  try {
    const iv = crypto.randomBytes(IV_LENGTH); // Generate a random IV
    const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);

    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');

    const authTag = cipher.getAuthTag().toString('hex'); // Authentication tag for integrity

    // Return IV, auth tag, and encrypted text
    return `${iv.toString('hex')}:${authTag}:${encrypted}`;
  } catch (error) {
    console.error("Encryption error:", error.message);
    throw new Error("Encryption failed");
  }
}

// Decryption function
function decrypt(payload) {
  try {
    const [iv, authTag, encrypted] = payload.split(':');

    // Validate payload format
    if (!iv || !authTag || !encrypted) {
      throw new Error("Invalid decryption payload format");
    }

    const decipher = crypto.createDecipheriv('aes-256-gcm', key, Buffer.from(iv, 'hex'));
    decipher.setAuthTag(Buffer.from(authTag, 'hex'));

    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
  } catch (error) {
    console.error("Decryption error:", error.message);
    throw new Error("Decryption failed");
  }
}

module.exports = { encrypt, decrypt };