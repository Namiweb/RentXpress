import crypto from "crypto";
import bcrypt from "bcryptjs";

const HASH_ALGORITHM = "sha512";
const ITERATIONS = 120_000;
const KEY_LENGTH = 64; // bytes
const DIGEST = "sha512";

function formatHash({ iterations, salt, derivedKey }) {
  return `pbkdf2$${iterations}$${salt}$${derivedKey}`;
}

export function hashPassword(password) {
  if (!password || typeof password !== "string") {
    throw new Error("Password must be a non-empty string");
  }
  const salt = crypto.randomBytes(16).toString("hex");
  const derivedKey = crypto
    .pbkdf2Sync(password, salt, ITERATIONS, KEY_LENGTH, DIGEST)
    .toString("hex");

  return formatHash({ iterations: ITERATIONS, salt, derivedKey });
}

export function verifyPassword(password, storedHash) {
  if (!storedHash || typeof storedHash !== "string") {
    return false;
  }

  // Support our PBKDF2 hash format
  if (storedHash.startsWith("pbkdf2$")) {
    const [, iterString, salt, hash] = storedHash.split("$");
    const iterations = parseInt(iterString, 10);
    if (!salt || !hash || Number.isNaN(iterations)) {
      return false;
    }

    const derived = crypto
      .pbkdf2Sync(password, salt, iterations, Buffer.from(hash, "hex").length, DIGEST)
      .toString("hex");

    return crypto.timingSafeEqual(Buffer.from(hash, "hex"), Buffer.from(derived, "hex"));
  }

  // If the stored password looks like a bcrypt hash, first support the legacy
  // behaviour (typing the hash directly), then fall back to an actual bcrypt comparison.
  if (storedHash.startsWith("$2")) {
    if (storedHash === password) {
      return true;
    }

    try {
      return bcrypt.compareSync(password, storedHash);
    } catch (error) {
      console.error("bcrypt comparison failed", error);
      return false;
    }
  }

  // Plain text fallback (legacy records)
  return storedHash === password;
}
