# metashrew-as

The indexer standard library. Sources in this repository can be imported into indexer programs built with metashrew, and may have some utilty in other contexts.

## Install

This library will be included by default in projects scaffolded with metashrew-cli, guides for which are available here:

[https://github.com/sandshrewmetaprotocols/metashrew-cli](https://github.com/sandshrewmetaprotocols/metashrew-cli))

For projects not scaffolded with metashrew-cli, installation of this library is done with npm or yarn as one would for a typical JavaScript package.

```sh
yarn add https://github.com/sandshrewmetaprotocols/metashrew-as
```

## Getting and setting key-value pairs

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
  const pointer = IndexPointer.wrap(primitiveToBuffer(<u32>0x0101010101)); // creates an IndexPointer to 0x01010101
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
