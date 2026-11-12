/**
 * Deterministic JSON canonicalisation and a browser/Node WebCrypto digest.
 * SHA-256 fingerprints support tamper detection but are NOT electronic signatures,
 * trusted timestamps, immutable storage, or proof that supplied evidence is correct.
 */
export function stableStringify(value) {
  const visit = v => {
    if (Array.isArray(v)) return v.map(visit);
    if (v && typeof v === "object") {
      return Object.fromEntries(Object.keys(v).sort()
        .filter(k => v[k] !== undefined).map(k => [k,visit(v[k])]));
    }
    if (typeof v === "number" && !Number.isFinite(v))
      throw new TypeError("Non-finite number in audit record.");
    return v;
  };
  return JSON.stringify(visit(value));
}
export async function sha256Audit(value) {
  if (!globalThis.crypto?.subtle) return null;
  const bytes = new TextEncoder().encode(stableStringify(value));
  const digest = await globalThis.crypto.subtle.digest("SHA-256",bytes);
  return [...new Uint8Array(digest)].map(x => x.toString(16).padStart(2,"0")).join("");
}
