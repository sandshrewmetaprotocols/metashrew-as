import { HASH_ARRAYBUFFER } from "./buffermap-hash";
import { E_KEYNOTFOUND } from "assemblyscript/std/assembly/util/error";

// A deterministic hash map based on CloseTable from https://github.com/jorendorff/dht

// @ts-ignore: decorator
@inline const INITIAL_CAPACITY = 4;

// @ts-ignore: decorator
@inline const FILL_FACTOR_N = 8;

// @ts-ignore: decorator
@inline const FILL_FACTOR_D = 3;

// @ts-ignore: decorator
@inline const FREE_FACTOR_N = 3;

// @ts-ignore: decorator
@inline const FREE_FACTOR_D = 4;

/** Structure of a map entry. */
@unmanaged class MapEntry {
  key: ArrayBuffer;
  value: ArrayBuffer;
  taggedNext: usize; // LSB=1 indicates EMPTY
}

/** Empty bit. */
// @ts-ignore: decorator
@inline const EMPTY: usize = 1 << 0;

/** Size of a bucket. */
// @ts-ignore: decorator
@inline const BUCKET_SIZE = sizeof<usize>();

/** Computes the alignment of an entry. */
// @ts-ignore: decorator
@inline
function ENTRY_ALIGN(): usize {
  // can align to 4 instead of 8 if 32-bit and K/V is <= 32-bits
  const maxkv = sizeof<ArrayBuffer>() > sizeof<ArrayBuffer>() ? sizeof<ArrayBuffer>() : sizeof<ArrayBuffer>();
  const align = (maxkv > sizeof<usize>() ? maxkv : sizeof<usize>()) - 1;
  return align;
}

/** Computes the aligned size of an entry. */
// @ts-ignore: decorator
@inline
function ENTRY_SIZE(): usize {
  const align = ENTRY_ALIGN();
  const size = (offsetof<MapEntry>() + align) & ~align;
  return size;
}

export class BufferMap {

  // buckets referencing their respective first entry, usize[bucketsMask + 1]
  private buckets: ArrayBuffer = new ArrayBuffer(INITIAL_CAPACITY * <i32>BUCKET_SIZE);
  private bucketsMask: u32 = INITIAL_CAPACITY - 1;

  // entries in insertion order, MapEntry[entriesCapacity]
  private entries: ArrayBuffer = new ArrayBuffer(INITIAL_CAPACITY * <i32>ENTRY_SIZE());
  private entriesCapacity: i32 = INITIAL_CAPACITY;
  private entriesOffset: i32 = 0;
  private entriesCount: i32 = 0;

  constructor() {
    /* nop */
  }

  get size(): i32 {
    return this.entriesCount;
  }

  clear(): void {
    this.buckets = new ArrayBuffer(INITIAL_CAPACITY * <i32>BUCKET_SIZE);
    this.bucketsMask = INITIAL_CAPACITY - 1;
    this.entries = new ArrayBuffer(INITIAL_CAPACITY * <i32>ENTRY_SIZE());
    this.entriesCapacity = INITIAL_CAPACITY;
    this.entriesOffset = 0;
    this.entriesCount = 0;
  }

  private find(key: ArrayBuffer, hashCode: u32): MapEntry | null {
    let entry = load<MapEntry>( // unmanaged!
      changetype<usize>(this.buckets) + <usize>(hashCode & this.bucketsMask) * BUCKET_SIZE
    );
    while (entry) {
      let taggedNext = entry.taggedNext;
      if (!(taggedNext & EMPTY) && entry.key == key) return entry;
      entry = changetype<MapEntry>(taggedNext & ~EMPTY);
    }
    return null;
  }

  has(key: ArrayBuffer): bool {
    return this.find(key, HASH_ARRAYBUFFER(key)) != null;
  }

  @operator("[]")
  get(key: ArrayBuffer): ArrayBuffer {
    let entry = this.find(key, HASH_ARRAYBUFFER(key));
    if (!entry) throw new Error(E_KEYNOTFOUND); // cannot represent `undefined`
    return entry.value;
  }

  @operator("[]=")
  set(key: ArrayBuffer, value: ArrayBuffer): this {
    let hashCode = HASH_ARRAYBUFFER(key);
    let entry = this.find(key, hashCode); // unmanaged!
    if (entry) {
      entry.value = value;
      if (isManaged<ArrayBuffer>()) {
        __link(changetype<usize>(this), changetype<usize>(value), true);
      }
    } else {
      // check if rehashing is necessary
      if (this.entriesOffset == this.entriesCapacity) {
        this.rehash(
          this.entriesCount < this.entriesCapacity * FREE_FACTOR_N / FREE_FACTOR_D
            ?  this.bucketsMask           // just rehash if 1/4+ entries are empty
            : (this.bucketsMask << 1) | 1 // grow capacity to next 2^N
        );
      }
      // append new entry
      let entries = this.entries;
      entry = changetype<MapEntry>(changetype<usize>(entries) + <usize>(this.entriesOffset++) * ENTRY_SIZE());
      // link with the map
      entry.key = key;
      if (isManaged<ArrayBuffer>()) {
        __link(changetype<usize>(this), changetype<usize>(key), true);
      }
      entry.value = value;
      if (isManaged<ArrayBuffer>()) {
        __link(changetype<usize>(this), changetype<usize>(value), true);
      }
      ++this.entriesCount;
      // link with previous entry in bucket
      let bucketPtrBase = changetype<usize>(this.buckets) + <usize>(hashCode & this.bucketsMask) * BUCKET_SIZE;
      entry.taggedNext = load<usize>(bucketPtrBase);
      store<usize>(bucketPtrBase, changetype<usize>(entry));
    }
    return this;
  }

  delete(key: ArrayBuffer): bool {
    let entry = this.find(key, HASH_ARRAYBUFFER<ArrayBuffer>(key));
    if (!entry) return false;
    entry.taggedNext |= EMPTY;
    --this.entriesCount;
    // check if rehashing is appropriate
    let halfBucketsMask = this.bucketsMask >> 1;
    if (
      halfBucketsMask + 1 >= max<u32>(INITIAL_CAPACITY, this.entriesCount) &&
      this.entriesCount < this.entriesCapacity * FREE_FACTOR_N / FREE_FACTOR_D
    ) this.rehash(halfBucketsMask);
    return true;
  }

  private rehash(newBucketsMask: u32): void {
    let newBucketsCapacity = <i32>(newBucketsMask + 1);
    let newBuckets = new ArrayBuffer(newBucketsCapacity * <i32>BUCKET_SIZE);
    let newEntriesCapacity = newBucketsCapacity * FILL_FACTOR_N / FILL_FACTOR_D;
    let newEntries = new ArrayBuffer(newEntriesCapacity * <i32>ENTRY_SIZE());

    // copy old entries to new entries
    let oldPtr = changetype<usize>(this.entries);
    let oldEnd = oldPtr + <usize>this.entriesOffset * ENTRY_SIZE();
    let newPtr = changetype<usize>(newEntries);
    while (oldPtr != oldEnd) {
      let oldEntry = changetype<MapEntry>(oldPtr);
      if (!(oldEntry.taggedNext & EMPTY)) {
        let newEntry = changetype<MapEntry>(newPtr);
        let oldEntryKey = oldEntry.key;
        newEntry.key = oldEntryKey;
        newEntry.value = oldEntry.value;
        let newBucketIndex = HASH_ARRAYBUFFER(oldEntryKey) & newBucketsMask;
        let newBucketPtrBase = changetype<usize>(newBuckets) + <usize>newBucketIndex * BUCKET_SIZE;
        newEntry.taggedNext = load<usize>(newBucketPtrBase);
        store<usize>(newBucketPtrBase, newPtr);
        newPtr += ENTRY_SIZE();
      }
      oldPtr += ENTRY_SIZE();
    }

    this.buckets = newBuckets;
    this.bucketsMask = newBucketsMask;
    this.entries = newEntries;
    this.entriesCapacity = newEntriesCapacity;
    this.entriesOffset = this.entriesCount;
  }

  keys(): ArrayBuffer[] {
    // FIXME: this is preliminary, needs iterators/closures
    let start = changetype<usize>(this.entries);
    let size = this.entriesOffset;
    let keys = new Array<ArrayBuffer>(size);
    let length = 0;
    for (let i = 0; i < size; ++i) {
      let entry = changetype<MapEntry>(start + <usize>i * ENTRY_SIZE());
      if (!(entry.taggedNext & EMPTY)) {
        unchecked(keys[length++] = entry.key);
      }
    }
    keys.length = length;
    return keys;
  }

  values(): ArrayBuffer[] {
    // FIXME: this is preliminary, needs iterators/closures
    let start = changetype<usize>(this.entries);
    let size = this.entriesOffset;
    let values = new Array<ArrayBuffer>(size);
    let length = 0;
    for (let i = 0; i < size; ++i) {
      let entry = changetype<MapEntry>(start + <usize>i * ENTRY_SIZE());
      if (!(entry.taggedNext & EMPTY)) {
        unchecked(values[length++] = entry.value);
      }
    }
    values.length = length;
    return values;
  }

  toString(): string {
    return "[object Map]";
  }

  // RT integration

  @unsafe private __visit(cookie: u32): void {
    __visit(changetype<usize>(this.buckets), cookie);
    let entries = changetype<usize>(this.entries);
    if (isManaged<ArrayBuffer>() || isManaged<ArrayBuffer>()) {
      let cur = entries;
      let end = cur + <usize>this.entriesOffset * ENTRY_SIZE();
      while (cur < end) {
        let entry = changetype<MapEntry>(cur);
        if (!(entry.taggedNext & EMPTY)) {
          if (isManaged<ArrayBuffer>()) {
            let val = changetype<usize>(entry.key);
            if (isNullable<ArrayBuffer>()) {
              if (val) __visit(val, cookie);
            } else __visit(val, cookie);
          }
          if (isManaged<ArrayBuffer>()) {
            let val = changetype<usize>(entry.value);
            if (isNullable<ArrayBuffer>()) {
              if (val) __visit(val, cookie);
            } else __visit(val, cookie);
          }
        }
        cur += ENTRY_SIZE();
      }
    }
    __visit(entries, cookie);
  }
}
