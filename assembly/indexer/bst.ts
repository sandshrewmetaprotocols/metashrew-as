import  { IndexPointer } from "./tables";
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
      if (i !== 0) memcpy(changetype<usize>(partialKey), changetype<usize>(keyBytes), i);
      const ptr = this.getMaskPointer(partialKey);
      const mask = ptr.get();
      const newMask = mask.byteLength === 0 ? new ArrayBuffer(8) : mask;
      const byte = load<u8>(changetype<usize>(keyBytes) + i + 1);
      const isSet = (load<u8>(changetype<usize>(newMask) + (byte / 8)) & (((0x100 as u32) >> (byte % 8)) & 0xff) as u8) !== 0
      if (!isSet) {
        store<u8>(changetype<usize>(newMask) + <usize>(byte / 8), (((0x100 as u32) >> (byte % 8)) & 0xff) | load<u8>(changetype<usize>(newMask) + <usize>(byte / 8)))
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
      const newMaskByte: u8 = ~(<u8>(((0x100 as u32) >> (byte % 8)) & 0xff)) & load<u8>(changetype<usize>(newMask) + <usize>(byte / 8));
      store<u8>(changetype<usize>(newMask) + <usize>(byte / 8), newMaskByte);
      let wordMask: u64 = 0;
      for (let b = 0; b < 4; b++) {
        wordMask |= load<u64>(changetype<usize>(newMask) + 8*b);
      }
      if (wordMask === 0) ptr.nullify();
      else break;
    }
  }
  set(k: K, v: ArrayBuffer): void {
    const keyBytes = bswap<K>(k);
    if (v.byteLength === 0) this.unmarkPath(k);
    this.ptr.select(keyBytes).set(v);
  }
  get(k: K): ArrayBuffer {
    const keyBytes = bswap<K>(k);
    this.ptr.select(keyBytes).get();
  }
  nullify(k: K): void {
    const keyBytes = bswap<K>(k);
    this.ptr.select(keyBytes).set(k, new ArrayBuffer(0)); 
  }
}
  
