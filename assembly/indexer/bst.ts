import  { IndexPointer } from "./tables";
import { memcpy } from "../utils/memcpy";
import { console } from "../utils/logging";
import { Box } from "../utils/box";

export function maskLowerThan(v: ArrayBuffer, position: u8): void {
  const aPtr: usize = changetype<usize>(v);
  const bPtr: usize = changetype<usize>(v) + sizeof<u64>();
  const cPtr: usize = changetype<usize>(v) + 2*sizeof<u64>();
  const dPtr: usize = changetype<usize>(v) + 3*sizeof<u64>();
  if (position >= sizeof<u64>()*3*8) {
    store<u64>(dPtr, ~bswap<u64>((<u64>0x1 << ((256 - position) - sizeof<u64>()*3*8) - 1) & load<u64>(dPtr)));
    return;
  } 
  if (position >= sizeof<u64>()*2*8) {
    store<u64>(dPtr, <u64>0);
    store<u64>(cPtr, ~bswap<u64>((<u64>0x1 << ((192 - position) - sizeof<u64>()*2*8) - 1) & load<u64>(cPtr)));
    return;
  }
  if (position >= sizeof<u64>()*8) {
    store<u64>(dPtr, <u64>0);
    store<u64>(cPtr, <u64>0);
    store<u64>(bPtr, ~bswap<u64>(((<u64>0x1 << ((128 - position) - sizeof<u64>()*8)) - 1) & load<u64>(bPtr)));
    return;
  }
  store<u64>(dPtr, <u64>0);
  store<u64>(cPtr, <u64>0);
  store<u64>(bPtr, <u64>0);
  store<u64>(aPtr, ~bswap<u64>(((<u64>0x1 << ((64 - position))) - 1) & load<u64>(aPtr)));
}

export function binarySearchU256(v: ArrayBuffer, forHighest: bool): i32 {
  const leftHigh = bswap<u64>(load<u64>(changetype<usize>(v)))
  const leftLow = bswap<u64>(load<u64>(changetype<usize>(v) + sizeof<u64>()));
  const rightHigh = bswap<u64>(load<u64>(changetype<usize>(v) + 16));
  const rightLow = bswap<u64>(load<u64>(changetype<usize>(v) + 24));
  const left = leftHigh | leftLow;
  const right = rightHigh | rightLow;
  if (left | right === 0) return -1;
  if (!forHighest || right === 0) {
    return binarySearchU128(leftHigh, leftLow, forHighest);
  } else {
    return sizeof<u64>()*16 + binarySearchU128(rightHigh, rightLow, forHighest);
  }
}

export function binarySearchU128(high: u64, low: u64, forHighest: bool): i32 {
  if (low | high === 0) return -1;
  if (!forHighest || low === 0) {
    return binarySearchU64(high, forHighest);
  } else {
    return sizeof<u64>()*8 + binarySearchU64(low, forHighest);
  }
}

export function binarySearchU64(word: u64, forHighest: bool): i32 {
  if (word === 0) return -1;
  const low = <u32>(word & U32.MAX_VALUE);
  const high = <u32>((word >> <u64>sizeof<u32>()) & U32.MAX_VALUE);
  if (!forHighest || low === 0) {
    return binarySearchU32(high, forHighest);
  } else {
    return sizeof<u32>()*8 + binarySearchU32(low, forHighest);
  }
}

export function binarySearchU32(word: u32, forHighest: bool): i32 {
  if (word === 0) return -1;
  const low: u16 = <u16>(word & U16.MAX_VALUE);
  const high: u16 = <u16>((word >> <u32>sizeof<u16>()) & U16.MAX_VALUE);
  if (!forHighest || low === 0) {
    return binarySearchU16(high, forHighest);
  } else {
    return sizeof<u16>()*8 + binarySearchU16(low, forHighest);
  }
}

export function binarySearchU16(word: u16, forHighest: bool): i32 {
  if (word === 0) return -1;
  const low: u8 = <u8>(word & U8.MAX_VALUE);
  const high: u8 = <u8>((word >> <u16>sizeof<u8>()) & U8.MAX_VALUE);
  if (!forHighest || low === 0) {
    return binarySearchU16(high, forHighest);
  } else {
    return sizeof<u8>()*8 + binarySearchU8(low, forHighest);
  }
}

export function binarySearchU8(word: u8, forHighest: bool): i32 {
  if (word === 0) return -1;
  const high = (word & 0xf0) >> 4;
  const low = word & 0x0f;
  if (!forHighest || low === 0) {
    return binarySearchU4(high, forHighest);
  }
  return 4 + binarySearchU4(low, forHighest);
}

export function binarySearchU4(word: u8, forHighest: bool): i32 {
  if (word === 0) return -1;
  const high = (word & 0x0c) >> 4;
  const low = word & 0x03;
  if (!forHighest || low === 0) {
    return binarySearchU2(high, forHighest);
  }
  return 2 + binarySearchU2(low, forHighest);
}

export function binarySearchU2(word: u8, forHighest: bool): i32 {
  if (word === 0) return -1;
  const high = (word & 0x02) >> 1;
  const low = word & 0x01;
  if (high & low === 0x01) return forHighest ? 0 : 1;
  return low;
}
  
export class BST<K> {
  public ptr: IndexPointer;
  constructor(ptr: IndexPointer) {
    this.ptr = ptr;
  }
  static at<K>(key: IndexPointer): BST<K> {
    return new BST<K>(key);
  }
  getMaskPointer(partialKey: ArrayBuffer): IndexPointer {
    return this.ptr.keyword("/").select(partialKey).keyword("/mask");
  }
  markPath(key: K): void {
    const keyBytes = new ArrayBuffer(sizeof<K>());
    store<K>(changetype<usize>(keyBytes), bswap<K>(key));
    for (let i = 0; i < sizeof<K>() - 1; i++) {
      const partialKey = new ArrayBuffer(i);
      memcpy(changetype<usize>(partialKey), changetype<usize>(keyBytes), i);
      const ptr = this.getMaskPointer(partialKey);
      const mask = ptr.get();
      const newMask = mask.byteLength === 0 ? new ArrayBuffer(32) : mask;
      const byte = load<u8>(changetype<usize>(keyBytes) + i + 1);
      const isSet = (load<u8>(changetype<usize>(newMask) + (31 - (byte / 8))) & (((0x01 as u32) << (byte % 8)) & 0xff) as u8) !== 0
      if (!isSet) {
        store<u8>(changetype<usize>(newMask) + (31 - <usize>(byte / 8)), (((0x01 as u32) << (byte % 8)) & 0xff) | load<u8>(changetype<usize>(newMask) + (31 - <usize>(byte / 8))))
	ptr.set(newMask);
      }
    }
  }
  unmarkPath(key: K): void {
    const keyBytes = new ArrayBuffer(sizeof<K>());
    store<K>(changetype<usize>(keyBytes), bswap<K>(key));
    for (let i: i32 = <i32>sizeof<K>() - 1; i >= 0; i--) {
      const partialKey = new ArrayBuffer(i);
      if (i !== 0) memcpy(changetype<usize>(partialKey), changetype<usize>(keyBytes), i);
      const ptr = this.getMaskPointer(partialKey);
      const mask = ptr.get();
      const newMask = mask.byteLength === 0 ? new ArrayBuffer(8) : mask;
      const byte = load<u8>(changetype<usize>(keyBytes) + i + 1);
      const newMaskByte: u8 = ~(<u8>(((0x01 as u32) << (byte % 8)) & 0xff)) & load<u8>(changetype<usize>(newMask) + <usize>(31 - (byte / 8)));
      store<u8>(changetype<usize>(newMask) + <usize>(31 - (byte / 8)), newMaskByte);
      let wordMask: u64 = 0;
      for (let b = 0; b < 4; b++) {
        wordMask |= load<u64>(changetype<usize>(newMask) + 8*b);
      }
      if (wordMask === 0) ptr.nullify();
      else break;
    }
  }
  seekLower(start: K): K {
    const keyBytes = new ArrayBuffer(sizeof<K>());
    store<K>(changetype<usize>(keyBytes), bswap<K>(start));
    let partialKey = keyBytes;
    let symbol: i32 = -1;
    let i: i32 = sizeof<K>() - 1;
    for (; i >= 0; i--) {
      partialKey = new ArrayBuffer(i);
      memcpy(changetype<usize>(partialKey), changetype<usize>(keyBytes), sizeof<K>() - 1);
      const ptr = this.getMaskPointer(partialKey);
      const mask = ptr.get();
      const newMask = mask.byteLength === 0 ? new ArrayBuffer(32) : mask;
      if (i === sizeof<K>() - 1) maskLowerThan(newMask, load<u8>(changetype<usize>(partialKey) + <usize>i));
      symbol = binarySearchU256(newMask, false);
      if (symbol !== -1) break;
    }
    if (symbol === -1) return ~(0 as K);
    let extendKey = partialKey;
    for (; i < sizeof<K>(); i++) {
      let thisKey = new ArrayBuffer(i + 1);
      memcpy(changetype<usize>(thisKey), changetype<usize>(extendKey), i);
      store<u8>(changetype<usize>(thisKey) + i, <u8>symbol);
      const mask = this.getMaskPointer(thisKey).get();
      if (mask.byteLength === 0) {
        return load<K>(changetype<usize>(thisKey));
      } else {
        symbol = binarySearchU256(mask, false);
      }
    }
    return ~(0 as K);
  }
  set(k: K, v: ArrayBuffer): void {
    const key = bswap<K>(k);
    const keyBytes = new ArrayBuffer(sizeof<K>());
    store<K>(changetype<usize>(keyBytes), key);
    if (v.byteLength === 0) this.unmarkPath(k);
    else this.markPath(k);
    this.ptr.select(keyBytes).set(v);
  }
  get(k: K): ArrayBuffer {
    const key = bswap<K>(k);
    const keyBytes = new ArrayBuffer(sizeof<K>());
    store<K>(changetype<usize>(keyBytes), key);
    this.ptr.select(keyBytes).get();
  }
  nullify(k: K): void {
    const key = bswap<K>(k);
    const keyBytes = new ArrayBuffer(sizeof<K>());
    this.ptr.select(keyBytes).set(k, new ArrayBuffer(0)); 
  }
}
  
