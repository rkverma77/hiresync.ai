const { GoogleGenAI } = require("@google/genai");

/**
 * @name GeminiKeyPool
 * @description Manages two Gemini API keys with round-robin rotation and
 * per-key cooldown tracking. When a key hits a 429, it is put on cooldown
 * for COOLDOWN_MS and the other key takes over — ensuring near-zero
 * user-visible rate-limit errors as long as at least one key is healthy.
 *
 * Usage:
 *   const pool = new GeminiKeyPool()
 *   const client = pool.getClient()          // get the best available client
 *   pool.markRateLimited(client)             // call this on a 429 error
 */

const COOLDOWN_MS = 65_000; // 65s — safely outlasts Gemini's 60s quota window

class GeminiKeyPool {
  constructor() {
    const key1 = process.env.GOOGLE_GENAI_API_KEY;
    const key2 = process.env.GOOGLE_GENAI_API_KEY_2;
    const key3 = process.env.GOOGLE_GENAI_API_KEY_3;
    const key4 = process.env.GOOGLE_GENAI_API_KEY_4;

    if (!key1) throw new Error("GOOGLE_GENAI_API_KEY is required");
    if (!key2)
      console.warn(
        "[GeminiPool] GOOGLE_GENAI_API_KEY_2 not set — running with 1 key",
      );
    if (!key3)
      console.warn(
        "[GeminiPool] GOOGLE_GENAI_API_KEY_3 not set — running with 2 keys",
      );
    if (!key4)
      console.warn(
        "[GeminiPool] GOOGLE_GENAI_API_KEY_4 not set — running with 3 keys",
      );

    this._keys = [key1, key2, key3, key4].filter(Boolean);
    this._clients = this._keys.map((key) => new GoogleGenAI({ apiKey: key }));
    this._cooldownUntil = this._keys.map(() => 0);
    this._lastUsed = 0;

    console.log(
      `[GeminiPool] Initialized with ${this._clients.length} API key(s)`,
    );
  }

  /**
   * Returns the index of the best available client:
   * - Prefers keys not on cooldown
   * - Among healthy keys, round-robins to spread load evenly
   * - If ALL keys are on cooldown, returns the one whose cooldown expires soonest
   */
  _pickIndex() {
    const now = Date.now();
    const healthy = this._keys
      .map((_, i) => i)
      .filter((i) => now >= this._cooldownUntil[i]);

    if (healthy.length === 0) {
      // All keys rate-limited — pick the one that recovers soonest
      const soonest = this._cooldownUntil.reduce(
        (best, t, i) => (t < this._cooldownUntil[best] ? i : best),
        0,
      );
      const waitMs = Math.max(0, this._cooldownUntil[soonest] - now);
      console.warn(
        `[GeminiPool] All keys on cooldown — picking soonest (key ${soonest + 1}), wait ${Math.ceil(waitMs / 1000)}s`,
      );
      return soonest;
    }

    if (healthy.length === 1) return healthy[0];

    // Round-robin among healthy keys (pick the one we didn't use last)
    const next = healthy.find((i) => i !== this._lastUsed) ?? healthy[0];
    return next;
  }

  /**
   * Returns the GoogleGenAI client instance for the best available key.
   * Also returns the index so callers can pass it back to markRateLimited().
   * @returns {{ client: GoogleGenAI, index: number }}
   */
  getClient() {
    const index = this._pickIndex();
    this._lastUsed = index;
    console.log(
      `[GeminiPool] Using API key ${index + 1}/${this._clients.length}`,
    );
    return { client: this._clients[index], index };
  }

  /**
   * Puts a key on cooldown after a 429 rate-limit error.
   * @param {number} index - The index returned by getClient()
   */
  markRateLimited(index) {
    const until = Date.now() + COOLDOWN_MS;
    this._cooldownUntil[index] = until;
    console.warn(
      `[GeminiPool] Key ${index + 1} rate-limited — cooldown until ${new Date(until).toISOString()}`,
    );
  }

  /** Returns how many keys are currently healthy (not on cooldown). */
  get healthyCount() {
    const now = Date.now();
    return this._cooldownUntil.filter((t) => now >= t).length;
  }
}

// Singleton — share the pool across the entire process
const pool = new GeminiKeyPool();
module.exports = { pool };
