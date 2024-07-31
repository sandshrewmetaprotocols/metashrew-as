# metashrew-as

The indexer standard library. Sources in this repository can be imported into indexer programs built with metashrew, and may have some utilty in other contexts.

## Install

This library will be included by default in projects scaffolded with metashrew-cli, guides for which are available here:

[https://github.com/sandshrewmetaprotocols/metashrew-cli](https://github.com/sandshrewmetaprotocols/metashrew-cli)

For projects not scaffolded with metashrew-cli, installation of this library is done with npm or yarn as one would for a typical JavaScript package.

```sh
yarn add https://github.com/sandshrewmetaprotocols/metashrew-as
```

## Usage

### Getting and setting key-value pairs

### assembly/indexer/tables

#### IndexPointer

IndexPointer is the abstraction in metashrew over the key in a key-value pair. It is a wrapper over ArrayBuffer but has methods to add more segments to the key to form a new IndexPointer, as well as methods to set an ArrayBuffer value or any primitive value.

```js
abstract class IndexPointer {
  static wrap(pointer: ArrayBuffer): IndexPointer;
  unwrap(): ArrayBuffer;
  static for(keyword: string): 
  select(key: ArrayBuffer): IndexPointer;
  selectValue<T>(key: T): IndexPointer;
  keyword(key: string): IndexPointer;
  getValue<T>(): T;
  setValue<T>(v: T): void;
  set(v: ArrayBuffer): void;
  get(): ArrayBuffer: ArrayBuffer;
  lengthKey(): IndexPointer;
  length(): u32;
  getList(): Array<ArrayBuffer>;
  getListValues<T>(): Array<T>;
  extend(): IndexPointer;
  selectIndex(index: u32): IndexPointer;
  nullify(): void;
  pop(): ArrayBuffer;
  popValue<T>: ArrayBuffer;
  append(v: ArrayBuffer);
  appendValue<T>(v: T);
}
```

##### IndexPointer.wrap(pointer: ArrayBuffer)

Wraps a value as an IndexPointer. Under the hood this will just change the type of the ArrayBuffer to an IndexPointer.

```js
import { primitiveToBuffer } from "metashrew-as/assembly/utils/utils";
import { IndexPointer } from "metashrew-as/assembly/indexer/tables";
import { _flush } from "metashrew-as/assembly/indexer";

export function _start(): void {
  const pointer = IndexPointer.wrap(primitiveToBuffer(<u32>0x01010101)); // creates an IndexPointer to 0x01010101
  pointer.set(primitiveToBuffer<u32>(0x20202020)); // sets 0x01010101 -> 0x20202020
  _flush();
}
```

##### IndexPointer#unwrap()

Unwraps an IndexPointer back into an ArrayBuffer representation.

```js
import { primitiveToBuffer } from "metashrew-as/assembly/utils/utils";
import { IndexPointer } from "metashrew-as/assembly/indexer/tables";
import { Box } from "metashrew-as/assembly/utils/box";
import { console } from "metashrew-as/assembly/utils/logging";

export function _start(): void {
  const pointer = IndexPointer.wrap(primitiveToBuffer(<u32>0x0101010101));
  console.log(Box.from(pointer.unwrap()).toHexString()); // logs 0x0101010101
}
```

##### IndexPointer.for(keyword: string)

Converts `keyword` to an ArrayBuffer then wraps the ArrayBuffer as an IndexPointer. Useful for creating tables.

```js
import { primitiveToBuffer } from "metashrew-as/assembly/utils/utils";
import { IndexPointer } from "metashrew-as/assembly/indexer/tables";
import { console } from "metashrew-as/assembly/utils/logging";

export function _start(): void {
  const pointer = IndexPointer.for("/some-table/");
  pointer.set(primitiveToBuffer(<u32>0x0101010101));
}
```

##### IndexPointer#select(key: ArrayBuffer): IndexPointer

Grows the IndexPointer by appending another byte slice to the end of the ArrayBuffer it wraps.

```js
import { primitiveToBuffer } from "metashrew-as/assembly/utils/utils";
import { IndexPointer } from "metashrew-as/assembly/indexer/tables";
import { console } from "metashrew-as/assembly/utils/logging";
import { sha256 } from "metashrew-as/assembly/utils/sha256";

export function _start(): void {
  const pointer = IndexPointer.for("/value/by-txid/").select(sha256(String.UTF8.encode("test")));
  pointer.set(primitiveToBuffer(<u32>0x0101010101));
}
```

##### IndexPointer#selectValue<T>(v: T): IndexPointer

Converts argument to an ArrayBuffer and grows the key by that ArrayBuffer, returning a new IndexPointer.

```js
import { IndexPointer } from "metashrew-as/assembly/indexer/tables";
import { sha256 } from "metashrew-as/assembly/utils/sha256";

export function _start(): void {
  IndexPointer.for("/txid/number/").selectValue<u32>(1).set((sha256(String.UTF8.encode("test")));
}
```

##### IndexPointer#keyword(word: string): IndexPointer

Encodes `word` as UTF8 bytes and uses the ArrayBuffer to grow the key represented by the IndexPointer, returning a new IndexPointer.

```js
import { IndexPointer } from "metashrew-as/assembly/indexer/tables";
import { sha256 } from "metashrew-as/assembly/utils/sha256";

export function _start(): void {
  IndexPointer.for("/txid/number/").selectValue<u32>(1).keyword("/tag").set(sha256(String.UTF8.encode("test")));
}
```

##### IndexPointer#getValue<T>(): T

Reads the IndexPointer at the key it represents, then converts the result to type T. T must be a primitive type.

```js
import { IndexPointer } from "metashrew-as/assembly/indexer/tables";
import { console } from "metashrew-as/assembly/utils/logging";

export function _start(): void {
  const count = IndexPointer.for("/txid/count").getValue<u32>();
  console.log(count.toString(10));
}
```

##### IndexPointer#setValue<T>(v: T): void 

Sets a value of type T at the key represented by the IndexPointer.

```js
import { IndexPointer } from "metashrew-as/assembly/indexer/tables";

export function _start(): void {
  const pointer = IndexPointer.for("/txid/count");
  pointer.setValue<u32>(pointer.getValue<u32>() + 1);
}
```

##### IndexPointer#get(): ArrayBuffer

Gets the value stored at the key represented by the IndexPointer. The result is an ArrayBuffer type. Values that are set with IndexPointer are cached in-memory, but when reading out of the cache, the value is copied, so it can be mutated without affecting the call to `_flush()` at the end of the program run.

```js
import { IndexPointer } from "metashrew-as/assembly/indexer/tables";
import { Box } from "metashrew-as/assembly/utils/box";
import { console } from "metashrew-as/assembly/utils/logging";

export function _start(): void {
  const pointer = IndexPointer.for("/txid/last");
  console.log(Box.from(pointer.get()).toHexString());
}
```

##### IndexPointer#set(v: ArrayBuffer): void

Sets the value in the key-value database corresponding to the key represented by the IndexPointer. When inserting into the cache with `set` it will copy the bytes of its argument, so the value can potentially be mutated afterwards.

```js
import { IndexPointer } from "metashrew-as/assembly/indexer/tables";
import { Box } from "metashrew-as/assembly/utils/box";
import { console } from "metashrew-as/assembly/utils/logging";
import { sha256 } from "metashrew-as/assembly/utils/sha256";

export function _start(): void {
  IndexPointer.for("/txid/last").set(sha256(IndexPointer.for("/txid/first").get()));
}
```

##### IndexPointer#lengthKey(): IndexPointer

List operation:

Appends `"/length"` to the end of the key and returns a new IndexPointer. Useful for doing operations on the value representing the length of a list, to be used with `append` or `appendValue`.

```js
import { IndexPointer } from "metashrew-as/assembly/indexer/tables";
import { console } from "metashrew-as/assembly/utils/logging";

export function _start(): void {
  const length = IndexPointer.for("/txid/list").lengthKey().getValue<u32>();
  console.log(length.toString(10));
}
```

##### IndexPointer#length(): u32

List operation:

Calls `IndexPointer#lengthKey()` then `IndexPointer#getValue<u32>()` on the key it returns. Ultimately will produce the length of the list stored at the desired key.

```js
// same program as above, in effect
import { IndexPointer } from "metashrew-as/assembly/indexer/tables";
import { console } from "metashrew-as/assembly/utils/logging";

export function _start(): void {
  const length = IndexPointer.for("/txid/list").length();
  console.log(length.toString(10));
}
```


##### IndexPointer#getList(): Array<ArrayBuffer>

List operation:

Gets the list of values at the desired key. First it fetches the length of the list then called `IndexPointer#selectIndex(v: u32)` for each key, then gets the ArrayBuffer stored at that key.

```js
import { IndexPointer } from "metashrew-as/assembly/indexer/tables";
import { console } from "metashrew-as/assembly/utils/logging";

export function _start(): void {
  const values = IndexPointer.for("/txid/list").getList();
  values.forEach((v: ArrayBuffer, i: i32, ary: Array<ArrayBuffer>) => {
    console.log(Box.from(v).toHexString());
  });
}
```

##### IndexPointer#getListValues<T>(): Array<T>

List operation:

Gets the list of values at the desired key then converts to type `T`, which must be a primitive type.

```js
import { IndexPointer } from "metashrew-as/assembly/indexer/tables";
import { console } from "metashrew-as/assembly/utils/logging";

export function _start(): void {
  const values = IndexPointer.for("/txid/values").getListValues<u64>();
  values.forEach((v: u64, i: i32, ary: Array<u64>) => {
    console.log(v.toString(10));
  });
}
```

##### IndexPointer#extend(): IndexPointer

List operation:

Increases the length of the list by 1. Returns the IndexPointer at the newly created slot in the list.

```js
import { IndexPointer } from "metashrew-as/assembly/indexer/tables";
import { console } from "metashrew-as/assembly/utils/logging";

export function _start(): void {
  const pointer = IndexPointer.for("/txid/values");
  pointer.extend().setValue<u64>(1);
}
```

##### IndexPointer#selectIndex(index: u32): IndexPointer

List operation:

Selects the value in a list at `index`. Returns the IndexPointer at that slot.

```js
import { IndexPointer } from "metashrew-as/assembly/indexer/tables";
import { console } from "metashrew-as/assembly/utils/logging";

export function _start(): void {
  const pointer = IndexPointer.for("/txid/values");
  const first = IndexPointer.for("/txid/values").selectIndex(0);
  console.log(first.getValue<u64>().toString(10));
}
```

##### IndexPointer#nullify(): void

Deletes the value at the key represented by the IndexPointer.

```js
import { IndexPointer } from "metashrew-as/assembly/indexer/tables";

export function _start(): void {
  const pointer = IndexPointer.for("/some-key");
  pointer.nullify() // deletes the value at "/some-key"
}
```

##### IndexPointer#pop(): ArrayBuffer

List operation:

Pops the last value off of the list at the IndexPointer.

```js
import { IndexPointer } from "metashrew-as/assembly/indexer/tables";

export function _start(): void {
  const pointer = IndexPointer.for("/some-list");
  pointer.appendValue<u64>(10);
  pointer.appendValue<u64>(5);
  pointer.appendValue<u64>(2);
  const length = pointer.length(); // 3
  const last = pointer.pop(); // 0x0200000000000000
  console.log(pointer.length().toString(10)) // logs "2"
}
```

##### IndexPointer#popValue<T>(): T

List operation:

Pops the last value off of the list and converts it to type `T`, where `T` is a primitive.

```js
import { IndexPointer } from "metashrew-as/assembly/indexer/tables";

export function _start(): void {
  const pointer = IndexPointer.for("/some-list");
  pointer.appendValue<u64>(10);
  pointer.appendValue<u64>(5);
  pointer.appendValue<u64>(15);
  const length = pointer.length(); // 3
  const last = pointer.popValue<u64>(); // 15
  console.log(last.toString(10)) // logs "15"
}
```

##### IndexPointer#append(v: ArrayBuffer): void

List operation:

Appends an ArrayBuffer to the list of values at the key represented by the IndexPointer.

```js
import { IndexPointer } from "metashrew-as/assembly/indexer/tables";

export function _start(): void {
  const pointer = IndexPointer.for("/some-list");
  pointer.append(String.UTF8.encode("some value"));
  pointer.append(String.UTF8.encode("other value"));
  console.log(String.UTF8.decode(pointer.pop())) // logs "other value";
}
```

##### IndexPointer#appendValue<T>(v: T): void

List operation:

Appends a value of type `T` to the list of values at the key represented by the IndexPointer.

```js
import { IndexPointer } from "metashrew-as/assembly/indexer/tables";

export function _start(): void {
  const pointer = IndexPointer.for("/some-list");
  pointer.appendValue<u64>(10);
  pointer.appendValue<u64>(20);
  console.log(pointer.popValue<u64>().toString(10));
}
```


### assembly/indexer

#### get/set values

The following functions are abstracted by IndexPointer and should not be used directly, but are described here for context on how the underlying runtime works.

#### get(key: ArrayBuffer): ArrayBuffer

Gets a value from the index by its key. Multiple calls to the same key are cached, and calling the `set` function will update the cache as well, so it is acceptable to write programs that `set` then later `get` the value at the same key within the program run for the block.

```js
import { get } from "metashrew-as/assembly/indexer"

const KEY = String.UTF8.encode("/mykey");

export function lookup(): ArrayBuffer {
  return get(KEY);
}
```

#### set(key: ArrayBuffer, value: ArrayBuffer): void

Caches a value to be flushed to the write batch at the end of the program run. Even though no state changes are saved until the end of the program run, a call to `get` at any key will query the cache to lookup the value before it makes a call to the k/v store in the host environment.

```js
import { set, get, _flush } from "metashrew-as/assembly/indexer";

const KEY = String.UTF8.encode("/mykey");

export function setvalue(): void {
  set(KEY, String.UTF8.encode("hello");
}

export function lookup(): ArrayBuffer {
  return get(KEY);
}

export function _start(): void {
  setvalue();
  _flush();
}

// can call the metashrew-view JSONRPC with the "lookup" symbol to retrive the value, 
```

#### input(): ArrayBuffer

Reads the bytevector from the host environment containing a u32 value for the block height, followed by the bytes of the serialized block.


#### _flush(): void

It is required to call this function, only once, at the end of your `_start` function. Otherwise, no state changes will be saved to the index. Always put as the last line of your `_start` function.

```js

import { get, set, _flush, input } from "metashrew-as/assembly/indexer";
import { Box } from "metashrew-as/assembly/utils/box";
import { parsePrimitive } from "metashrew-as/assembly/utils/utils";

export function _start(): void {
  const data = input();
  const box = Box.from(data);
  const height = parsePrimitive<u32>(box);
  set(Box.concat([ Box.from(String.UTF8.encode("/block/")), Box.from(String.UTF8.encode(height.toString(10))); ]), box.toArrayBuffer());
  _flush();
  // trivial index sets UTF8 /block/n to the serialized block bytes, where n is 0..tip as
}
```
## assembly/indexer/bst.ts

#### **maskLowerThan**

```js
export function maskLowerThan(v: ArrayBuffer, position: u8): void {
  const ary = new Array<u64>(4);
  ary[0] = bswap<u64>(load<u64>(changetype<usize>(v)));
  ary[1] = bswap<u64>(load<u64>(changetype<usize>(v) + sizeof<u64>()));
  ary[2] = bswap<u64>(load<u64>(changetype<usize>(v) + 2 * sizeof<u64>()));
  ary[3] = bswap<u64>(load<u64>(changetype<usize>(v) + 3 * sizeof<u64>()));
  const byteSelected = position / 64;
  const bitSelected = position % 64;
  ary[byteSelected] =
    ary[byteSelected] & (<u64>(((1 << bitSelected) - 1) << (64 - bitSelected)));
  for (let i = byteSelected + 1; i < 4; i++) {
    ary[i] = 0;
  }
  for (let i = 0; i < 4; i++) {
    store<u64>(changetype<usize>(v) + i * sizeof<u64>(), bswap<u64>(ary[i]));
  }
}
```js

#### **maskGreaterThan**

```js
export function maskGreaterThan(v: ArrayBuffer, position: u8): void {
  const ary = new Array<u64>(4);
  ary[0] = bswap<u64>(load<u64>(changetype<usize>(v)));
  ary[1] = bswap<u64>(load<u64>(changetype<usize>(v) + sizeof<u64>()));
  ary[2] = bswap<u64>(load<u64>(changetype<usize>(v) + 2 * sizeof<u64>()));
  ary[3] = bswap<u64>(load<u64>(changetype<usize>(v) + 3 * sizeof<u64>()));
  const byteSelected = position / 64;
  const bitSelected = position % 64;
  ary[byteSelected] =
    ary[byteSelected] &
    ~(<u64>(((1 << (bitSelected + 1)) - 1) << (63 - bitSelected)));
  for (let i: u8 = 0; i < byteSelected; i++) {
    ary[i] = 0;
  }
  for (let i = 0; i < 4; i++) {
    store<u64>(changetype<usize>(v) + i * sizeof<u64>(), bswap<u64>(ary[i]));
  }
}
```js

#### **binarySearchU256**

```js
export function binarySearchU256(v: ArrayBuffer, forHighest: bool): i32 {
  const leftHigh = bswap<u64>(load<u64>(changetype<usize>(v)));
  const leftLow = bswap<u64>(load<u64>(changetype<usize>(v) + sizeof<u64>()));
  const rightHigh = bswap<u64>(load<u64>(changetype<usize>(v) + 16));
  const rightLow = bswap<u64>(load<u64>(changetype<usize>(v) + 24));
  const left = leftHigh | leftLow;
  const right = rightHigh | rightLow;
  if ((left | right) === 0) return -1;
  if ((forHighest || right === 0) && left !== 0) {
    return binarySearchU128(leftHigh, leftLow, forHighest);
  } else {
    return (
      sizeof<u64>() * 2 * 8 + binarySearchU128(rightHigh, rightLow, forHighest)
    );
  }
}
```js

#### **binarySearchU128**

```js
export function binarySearchU128(high: u64, low: u64, forHighest: bool): i32 {
  if ((forHighest || low === 0) && high !== 0) {
    return binarySearchU64(high, forHighest);
  } else {
    return sizeof<u64>() * 8 + binarySearchU64(low, forHighest);
  }
}
```js

#### **binarySearchU64**

```js
export function binarySearchU64(word: u64, forHighest: bool): i32 {
  const low = <u32>(word & U32.MAX_VALUE);
  const high = <u32>((word >> (<u64>sizeof<u32>() * 8)) & U32.MAX_VALUE);
  if ((forHighest || low === 0) && high !== 0)
    return binarySearchU32(high, forHighest);
  return sizeof<u32>() * 8 + binarySearchU32(low, forHighest);
}
```js

#### **binarySearchU32**

```js
export function binarySearchU32(word: u32, forHighest: bool): i32 {
  const low: u16 = <u16>(word & U16.MAX_VALUE);
  const high: u16 = <u16>((word >> (<u32>sizeof<u16>() * 8)) & U16.MAX_VALUE);
  if ((forHighest || low === 0) && high !== 0) {
    return binarySearchU16(high, forHighest);
  } else {
    return sizeof<u16>() * 8 + binarySearchU16(low, forHighest);
  }
}
```js

#### **binarySearchU16**

```js
export function binarySearchU16(word: u16, forHighest: bool): i32 {
  const low: u8 = <u8>(word & U8.MAX_VALUE);
  const high: u8 = <u8>((word >> (<u16>sizeof<u8>() * 8)) & U8.MAX_VALUE);
  if ((forHighest || low === 0) && high !== 0) {
    return binarySearchU8(high, forHighest);
  } else {
    return sizeof<u8>() * 8 + binarySearchU8(low, forHighest);
  }
}
```js

#### **binarySearchU8**

```js
export function binarySearchU8(word: u8, forHighest: bool): i32 {
  const high = (word >> 4) & 0x0f;
  const low = word & 0x0f;
  if ((forHighest || low === 0) && high !== 0) {
    return binarySearchU4(high, forHighest);
  }
  return 4 + binarySearchU4(low, forHighest);
}
```js

#### **binarySearchU4**
```js
export function binarySearchU4(word: u8, forHighest: bool): i32 {
  const high = (word >> 2) & 0x03;
  const low = word & 0x03;
  if ((forHighest || low === 0) && high !== 0) {
    return binarySearchU2(high, forHighest);
  }
  return 2 + binarySearchU2(low, forHighest);
}
```js

#### **binarySearchU2**
```js
export function binarySearchU2(word: u8, forHighest: bool): i32 {
  const high = (word >> 1) & 0x01;
  const low = word & 0x01;
  return (forHighest || low === 0) && high !== 0 ? 0 : 1;
}
```js

#### **setBitU256**
```js
export function setBitU256(mask: ArrayBuffer, position: i32): void {
  const bytePosition = position / 8;
  const bitPosition = position % 8;
  const existingByte: u8 = load<u8>(
    changetype<usize>(mask) + <usize>bytePosition,
  );
  const newBit: u8 = <u8>(1 << (<u8>7 - <u8>bitPosition));
  store<u8>(
    changetype<usize>(mask) + <usize>bytePosition,
    existingByte | newBit,
  );
}
```js

#### **unsetBitU256**
```js
export function unsetBitU256(mask: ArrayBuffer, position: i32): void {
  const bytePosition = position / 8;
  const bitPosition = position % 8;
  const existingByte = load<u8>(changetype<usize>(mask) + <usize>bytePosition);
  const bitMask = ~(<u8>(1 << (<u8>7 - <u8>bitPosition)));
  store<u8>(
    changetype<usize>(mask) + <usize>bytePosition,
    existingByte & bitMask,
  );
}
```js

#### **isSetU256**
```js
export function isSetU256(mask: ArrayBuffer, position: i32): boolean {
  const bytePosition: usize = position / 8;
  const bitPosition: i32 = position % 8;
  const existingByte = load<u8>(changetype<usize>(mask) + <usize>bytePosition);
  const bitMask = <u8>(1 << (7 - <u8>bitPosition));
  return (bitMask & existingByte) !== 0;
}
```js

#### **isZeroU256**
```js
export function isZeroU256(mask: ArrayBuffer): boolean {
  for (var i = 0; i < 4; i++) {
    if (load<u64>(changetype<usize>(mask) + sizeof<u64>() * i) !== 0)
      return false;
  }
  return true;
}
```js

#### **byteAt**
```js
export function byteAt<T>(v: ArrayBuffer, byte: T): u8 {
  return load<u8>(changetype<usize>(v) + <usize>byte);
}
```js

#### **toBuffer**
```js
export function toBuffer<T>(v: T): ArrayBuffer {
  const data = new ArrayBuffer(sizeof<T>());
  store<T>(changetype<usize>(data), bswap<T>(v));
  return data;
}
```js

#### **coerceToZero**
```js
function coerceToZero(v: i32): u8 {
  if (v === -1) return <u8>0;
  return <u8>v;
}
```js

#### **BST**

```js
abstract class BST {
  static at<K>(key: IndexPointer): BST<K>;
  getMaskPointer(partialKey: ArrayBuffer): IndexPointer;
  getMask(partialKey: ArrayBuffer): ArrayBuffer;
  markPath(key: K): void;
  unmarkPath(key: K): void;
  _findBoundaryFromPartial(keyBytes: ArrayBuffer, seekHigher: bool): K;
  seekLower(start: K): K;
  seekGreater(start: K): K;
  set(k: K, v: ArrayBuffer): void;
  get(k: K): ArrayBuffer;
  nullify(k: K): void;
```js

## Logging

### assembly/utils/logging

```js
import { console } from "metashrew-as/assembly/utils/logging";

export function _start(): void {
  console.log("visible from tests or metashrew itself");
  console.logUTF8(String.UTF8.encode("sometimes we have UTF8 too and we can avoid decoding it needlessly"));
}
```

## Author

Sandshrew Inc


## License

MIT
