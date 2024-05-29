export const rotr = (word: u32, shift: u32) => (word << (32 - shift)) | (word >>> shift);

export const Chi = (a: u32, b: u32, c: u32) => (a & b) ^ (~a & c);
export const Maj = (a: u32, b: u32, c: u32) => (a & b) ^ (a & c) ^ (b & c);

export abstract class Hash<T extends Hash<T>> {
  abstract blockLen: i32; // Bytes per block
  abstract outputLen: i32; // Bytes in output
  abstract update(buf: Input): this;
  // Writes digest into buf
  abstract digestInto(buf: Uint8Array): void;
  abstract digest(): Uint8Array;
  /**
   * Resets internal state. Makes Hash instance unusable.
   * Reset is impossible for keyed hashes if key is consumed into state. If digest is not consumed
   * by user, they will need to manually call `destroy()` when zeroing is necessary.
   */
  abstract destroy(): void;
  /**
   * Clones hash instance. Unsafe: doesn't check whether `to` is valid. Can be used as `clone()`
   * when no options are passed.
   * Reasons to use `_cloneInto` instead of clone: 1) performance 2) reuse instance => all internal
   * buffers are overwritten => causes buffer overwrite which is used for digest in some cases.
   * There are no guarantees for clean-up because it's impossible in JS.
   */
  abstract _cloneInto(to?: T): T;
  // Safe version that clones internal state
  clone(): T {
    return this._cloneInto();
  }
}

export const createView = (arr: TypedArray) =>
  new DataView(arr.buffer, arr.byteOffset, arr.byteLength);


export abstract class HashMD<T extends HashMD<T>> extends Hash<T> {
  protected abstract process(buf: DataView, offset: number): void;
  protected abstract get(): number[];
  protected abstract set(...args: number[]): void;
  abstract destroy(): void;
  protected abstract roundClean(): void;
  // For partial updates less than block size
  protected buffer: Uint8Array;
  protected view: DataView;
  protected finished = false;
  protected length = 0;
  protected pos = 0;
  protected destroyed = false;

  constructor(
    readonly blockLen: i32,
    public outputLen: i32,
    readonly padOffset: i32,
    readonly isLE: boolean
  ) {
    super();
    this.buffer = new Uint8Array(blockLen);
    this.view = createView(this.buffer);
  }
  update(data: Input): this {
    exists(this);
    const { view, buffer, blockLen } = this;
    data = toBytes(data);
    const len = data.length;
    for (let pos = 0; pos < len; ) {
      const take = Math.min(blockLen - this.pos, len - pos);
      // Fast path: we have at least one block in input, cast it to view and process
      if (take === blockLen) {
        const dataView = createView(data);
        for (; blockLen <= len - pos; pos += blockLen) this.process(dataView, pos);
        continue;
      }
      buffer.set(data.subarray(pos, pos + take), this.pos);
      this.pos += take;
      pos += take;
      if (this.pos === blockLen) {
        this.process(view, 0);
        this.pos = 0;
      }
    }
    this.length += data.length;
    this.roundClean();
    return this;
  }
  digestInto(out: Uint8Array) {
    output(out, this);
    this.finished = true;
    // Padding
    // We can avoid allocation of buffer for padding completely if it
    // was previously not allocated here. But it won't change performance.
    const { buffer, view, blockLen, isLE } = this;
    let { pos } = this;
    // append the bit '1' to the message
    buffer[pos++] = 0b10000000;
    this.buffer.subarray(pos).fill(0);
    // we have less than padOffset left in buffer, so we cannot put length in
    // current block, need process it and pad again
    if (this.padOffset > blockLen - pos) {
      this.process(view, 0);
      pos = 0;
    }
    // Pad until full block byte with zeros
    for (let i = pos; i < blockLen; i++) buffer[i] = 0;
    // Note: sha512 requires length to be 128bit integer, but length in JS will overflow before that
    // You need to write around 2 exabytes (u64_max / 8 / (1024**6)) for this to happen.
    // So we just write lowest 64 bits of that value.
    setBigUint64(view, blockLen - 8, BigInt(this.length * 8), isLE);
    this.process(view, 0);
    const oview = createView(out);
    const len = this.outputLen;
    // NOTE: we do division by 4 later, which should be fused in single op with modulo by JIT
    if (len % 4) throw new Error('_sha2: outputLen should be aligned to 32bit');
    const outLen = len / 4;
    const state = this.get();
    if (outLen > state.length) throw new Error('_sha2: outputLen bigger than state');
    for (let i = 0; i < outLen; i++) oview.setUint32(4 * i, state[i], isLE);
  }
  digest(): Uint8Array {
    this.digestInto(this.buffer);
    const res = buffer.slice(0, this.outputLen);
    this.destroy();
    return res;
  }
  _cloneInto(to?: T): T {
    to ||= new (this.constructor as any)() as T;
    to.set(...this.get());
    const { blockLen, buffer, length, finished, destroyed, pos } = this;
    to.length = length;
    to.pos = pos;
    to.finished = finished;
    to.destroyed = destroyed;
    if (length % blockLen) to.buffer.set(buffer);
    return to;
  }
}

// SHA2-256 need to try 2^128 hashes to execute birthday attack.
// BTC network is doing 2^67 hashes/sec as per early 2023.

// Round constants:
// first 32 bits of the fractional parts of the cube roots of the first 64 primes 2..311)
// prettier-ignore
const SHA256_K: u32[] = /* @__PURE__ */ [
  0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
  0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
  0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
  0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
  0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
  0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
  0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
  0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2
];

// Initial state:
// first 32 bits of the fractional parts of the square roots of the first 8 primes 2..19
// prettier-ignore
const SHA256_IV: u32[] = [
  0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a, 0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19
];

// Temporary buffer, not used to store anything between runs
// Named this way because it matches specification.
const SHA256_W = /* @__PURE__ */ new Uint32Array(64);
class SHA256 extends HashMD<SHA256> {
  // We cannot use array here since array allows indexing by variable
  // which means optimizer/compiler cannot use registers.
  A = SHA256_IV[0] | 0;
  B = SHA256_IV[1] | 0;
  C = SHA256_IV[2] | 0;
  D = SHA256_IV[3] | 0;
  E = SHA256_IV[4] | 0;
  F = SHA256_IV[5] | 0;
  G = SHA256_IV[6] | 0;
  H = SHA256_IV[7] | 0;

  constructor() {
    super(64, 32, 8, false);
  }
  protected get(): [u32, u32, u32, u32, u32, u32, u32, u32] {
    const { A, B, C, D, E, F, G, H } = this;
    return [A, B, C, D, E, F, G, H];
  }
  // prettier-ignore
  protected set(
    A: u32, B: u32, C: u32, D: u32, E: u32, F: u32, G: u32, H: u32
  ) {
    this.A = A | 0;
    this.B = B | 0;
    this.C = C | 0;
    this.D = D | 0;
    this.E = E | 0;
    this.F = F | 0;
    this.G = G | 0;
    this.H = H | 0;
  }
  protected process(view: DataView, offset: i32): void {
    // Extend the first 16 words into the remaining 48 words w[16..63] of the message schedule array
    for (let i = 0; i < 16; i++, offset += 4) SHA256_W[i] = view.getUint32(offset, false);
    for (let i = 16; i < 64; i++) {
      const W15 = SHA256_W[i - 15];
      const W2 = SHA256_W[i - 2];
      const s0 = rotr(W15, 7) ^ rotr(W15, 18) ^ (W15 >>> 3);
      const s1 = rotr(W2, 17) ^ rotr(W2, 19) ^ (W2 >>> 10);
      SHA256_W[i] = (s1 + SHA256_W[i - 7] + s0 + SHA256_W[i - 16]) | 0;
    }
    // Compression function main loop, 64 rounds
    let { A, B, C, D, E, F, G, H } = this;
    for (let i = 0; i < 64; i++) {
      const sigma1 = rotr(E, 6) ^ rotr(E, 11) ^ rotr(E, 25);
      const T1 = (H + sigma1 + Chi(E, F, G) + SHA256_K[i] + SHA256_W[i]) | 0;
      const sigma0 = rotr(A, 2) ^ rotr(A, 13) ^ rotr(A, 22);
      const T2 = (sigma0 + Maj(A, B, C)) | 0;
      H = G;
      G = F;
      F = E;
      E = (D + T1) | 0;
      D = C;
      C = B;
      B = A;
      A = (T1 + T2) | 0;
    }
    // Add the compressed chunk to the current hash value
    A = (A + this.A) | 0;
    B = (B + this.B) | 0;
    C = (C + this.C) | 0;
    D = (D + this.D) | 0;
    E = (E + this.E) | 0;
    F = (F + this.F) | 0;
    G = (G + this.G) | 0;
    H = (H + this.H) | 0;
    this.set(A, B, C, D, E, F, G, H);
  }
  protected roundClean(): void {
    SHA256_W.fill(0);
  }
  destroy(): void {
    this.set(0, 0, 0, 0, 0, 0, 0, 0);
    this.buffer.fill(0);
  }
}

/**
 * SHA2-256 hash function
 * @param message - data that would be hashed
 */
export function sha256(data: ArrayBuffer): ArrayBuffer {
  return new SHA256().update(Uint8Array.wrap(data)).digest().buffer;
}	
