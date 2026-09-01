import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";

const ALGORITHM = "aes-256-gcm";

function keyFromEnv(): Buffer | null {
  const raw = process.env.INTEGRATION_ENCRYPTION_KEY?.trim();
  if (!raw) return null;
  if (/^[0-9a-f]{64}$/i.test(raw)) return Buffer.from(raw, "hex");
  return createHash("sha256").update(raw).digest();
}

export function canEncryptIntegrations() {
  return Boolean(keyFromEnv());
}

export function encryptSecret(plaintext: string): string {
  const key = keyFromEnv();
  if (!key) throw new Error("INTEGRATION_ENCRYPTION_UNAVAILABLE");
  const iv = randomBytes(12);
  const cipher = createCipheriv(ALGORITHM, key, iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `v1:${iv.toString("base64")}:${tag.toString("base64")}:${encrypted.toString("base64")}`;
}

export function decryptSecret(payload: string): string {
  const key = keyFromEnv();
  if (!key) throw new Error("INTEGRATION_ENCRYPTION_UNAVAILABLE");
  const [version, ivB64, tagB64, dataB64] = payload.split(":");
  if (version !== "v1" || !ivB64 || !tagB64 || !dataB64) throw new Error("INVALID_SECRET_PAYLOAD");
  const decipher = createDecipheriv(ALGORITHM, key, Buffer.from(ivB64, "base64"));
  decipher.setAuthTag(Buffer.from(tagB64, "base64"));
  return Buffer.concat([decipher.update(Buffer.from(dataB64, "base64")), decipher.final()]).toString("utf8");
}

export function encryptJson(value: Record<string, unknown>): string {
  return encryptSecret(JSON.stringify(value));
}

export function decryptJson(payload: string): Record<string, unknown> {
  const parsed = JSON.parse(decryptSecret(payload)) as unknown;
  return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? (parsed as Record<string, unknown>) : {};
}
