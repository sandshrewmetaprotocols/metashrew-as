import  { IndexPointer } from "./tables";
export class BST {
  public ptr: IndexPointer;
  constructor(ptr: IndexPointer) {
    this.ptr = ptr;
  }
  static at(IndexPointer: key): BST {
    return new BST(key);
  }
  getMaskPointer(partialKey: ArrayBuffer): IndexPointer {
    return this.ptr.keyword("/").select(partialKey).keyword("/mask");
  }
  markPath(key: u64): void {
    const keyBytes = new ArrayBuffer(sizeof<u64>());
    store<u64>(changetype<usize>(key), bswap<u64>(key));
    for (let i = 0; i < sizeof<u64>() - 1; i++) {
      const partialKey = new ArrayBuffer(i);
      if (i !== 0) memcpy(changetype<usize>(partialKey), changetype<usize>(keyBytes), i);
      const ptr = this.getMaskPointer(partialKey);
      const mask = ptr.get();
      const newMask = mask.byteLength === 0 ? new ArrayBuffer(8) : mask;
      const byte = load<u8>(changetype<usize>(keyBytes) + i + 1);
      const isSet = (load<u8>(changetype<usize>(newMask) + (byte / 8)) & (((0x100 as u32) >> (byte % 8)) & 0xff) as u8) !== 0
      if (!isSet) {
        store<u8>(changetype<usize>(newMask) + <usize>(byte / 8), (((0x100 as u32) >> (byte % 8)) & 0xff) as u8) !== 0
   
    }
    const tkey
    this.ptr.keyword("/")
}
  
