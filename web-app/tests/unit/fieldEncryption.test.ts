import { afterEach, describe, expect, it, vi } from "vitest";
import { decrypt, encryptDet, encryptRnd, isEncrypted } from "@/lib/fieldEncryption";

const KEY = "0123456789abcdef".repeat(4); // 64 hex chars
const OTHER_KEY = "fedcba9876543210".repeat(4);

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("fieldEncryption without DB_ENCRYPTION_KEY", () => {
  it("passes values through unchanged", () => {
    vi.stubEnv("DB_ENCRYPTION_KEY", "");
    expect(encryptDet("alice")).toBe("alice");
    expect(encryptRnd("Alice A")).toBe("Alice A");
    expect(decrypt("alice")).toBe("alice");
  });

  it("returns ciphertext as-is when the key is missing", () => {
    vi.stubEnv("DB_ENCRYPTION_KEY", KEY);
    const ct = encryptDet("alice");
    vi.stubEnv("DB_ENCRYPTION_KEY", "");
    expect(decrypt(ct)).toBe(ct);
  });
});

describe("fieldEncryption with a key", () => {
  it("rejects keys that are not 64 characters", () => {
    vi.stubEnv("DB_ENCRYPTION_KEY", "abc");
    expect(() => encryptDet("x")).toThrow("DB_ENCRYPTION_KEY must be a 64-char hex string");
  });

  it("encryptDet is deterministic, prefixed and reversible", () => {
    vi.stubEnv("DB_ENCRYPTION_KEY", KEY);
    const a = encryptDet("alice@example.com");
    const b = encryptDet("alice@example.com");
    expect(a).toBe(b);
    expect(isEncrypted(a)).toBe(true);
    expect(a).toMatch(/^enc:[0-9a-f]{24}:[0-9a-f]+:[0-9a-f]{32}$/);
    expect(decrypt(a)).toBe("alice@example.com");
    expect(encryptDet("bob@example.com")).not.toBe(a);
  });

  it("encryptRnd produces a different ciphertext each call but decrypts the same", () => {
    vi.stubEnv("DB_ENCRYPTION_KEY", KEY);
    const a = encryptRnd("Alice");
    const b = encryptRnd("Alice");
    expect(a).not.toBe(b);
    expect(decrypt(a)).toBe("Alice");
    expect(decrypt(b)).toBe("Alice");
  });

  it("round-trips unicode", () => {
    vi.stubEnv("DB_ENCRYPTION_KEY", KEY);
    expect(decrypt(encryptRnd("राहुल 💪"))).toBe("राहुल 💪");
  });

  it("returns the raw value for tampered ciphertext, wrong key, or malformed input", () => {
    vi.stubEnv("DB_ENCRYPTION_KEY", KEY);
    const ct = encryptRnd("secret");
    const tampered = ct.slice(0, -2) + (ct.endsWith("00") ? "11" : "00");
    expect(decrypt(tampered)).toBe(tampered);
    expect(decrypt("enc:not-three-parts")).toBe("enc:not-three-parts");

    vi.stubEnv("DB_ENCRYPTION_KEY", OTHER_KEY);
    expect(decrypt(ct)).toBe(ct);
  });

  it("treats null/undefined/empty as empty string and plaintext as plaintext", () => {
    vi.stubEnv("DB_ENCRYPTION_KEY", KEY);
    expect(decrypt(null)).toBe("");
    expect(decrypt(undefined)).toBe("");
    expect(decrypt("")).toBe("");
    expect(decrypt("legacy_plain")).toBe("legacy_plain");
  });
});
