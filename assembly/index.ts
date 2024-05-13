import { Box } from "./utils/box";
import { memcpy } from "./utils/memcpy";
import {
  concat,
  reverse,
  parseLenThenBytes,
  parsePrimitive,
  parsePushOp,
  parseBytes,
  isPushOp,
  decodeTag,
  parseVarInt,
} from "./utils/utils";
import { Index, get, set, _flush, input } from "./indexer/index";
import { console } from "./utils/logging";
import { abort } from "./utils/abort";
import { Transaction, Block } from "./blockdata";
import { encodeHexFromBuffer } from "./utils/hex";
import {
  BST,
  setBitU256,
  binarySearchU64,
  binarySearchU32,
  binarySearchU16,
  binarySearchU8,
  binarySearchU256,
  maskGreaterThan,
  maskLowerThan,
} from "./indexer/bst";
import { IndexPointer } from "./indexer/tables";

export function test_parseBlock(): void {
  const data = input();
  const box = Box.from(data);
  const height = parsePrimitive<u32>(box);
  const block = new Block(box);
}

function logK<K>(v: K): void {
  const data = new ArrayBuffer(sizeof<K>());
  store<K>(changetype<usize>(data), bswap<u64>(v));
  console.log(Box.from(data).toHexString());
}

export function test_parseWitness(): void {
  const data = input();
  const box = Box.from(data);
  const height = parsePrimitive<u32>(box);
  const tx = new Transaction(box);
  tx.ins[1].inscription();
}


export function test_seekLower(): void {
  const ptr = IndexPointer.wrap(String.UTF8.encode("/")).keyword("outpoint");
  const bst = BST.at<u64>(
    IndexPointer.wrap(String.UTF8.encode("/")).keyword("outpoint"),
  );
  bst.set(3, String.UTF8.encode("test"));
  bst.set(<u64>(0x03 << 16), String.UTF8.encode("test3"));
  bst.set(bswap<u64>(3), String.UTF8.encode("test2"));
 // console.log("bst.seekLower(0xffffffffffffffff))");
  //logK<u64>(bst.seekLower(0xffffffffffffffff));
//  console.log("bst.seekLower(0x0300000000000000)");
  //logK<u64>(bst.seekLower(0x0300000000000000));
  _flush();
}

export function test_seekLower2(): void {
  const ptr = IndexPointer.wrap(String.UTF8.encode("/")).keyword("outpoint");
  const bst = BST.at<u64>(
    IndexPointer.wrap(String.UTF8.encode("/")).keyword("outpoint"),
  );
  bst.set(3, String.UTF8.encode("test"));
  bst.set(<u64>(0x03 << 16), String.UTF8.encode("test3"));
  bst.set(bswap<u64>(3), String.UTF8.encode("test2"));
//  console.log("bst.seekLower(0x03 << 16)");
  //logK<u64>(bst.seekLower(0x03 << 16));
  //bst.nullify(<u64>(0x03 << 16));
  _flush();
}

export function test_seekGreater(): void {
  const ptr = IndexPointer.wrap(String.UTF8.encode("/")).keyword("outpoint");
  const bst = BST.at<u64>(
    IndexPointer.wrap(String.UTF8.encode("/")).keyword("outpoint"),
  );
  bst.set(3, String.UTF8.encode("test"));
  bst.set(<u64>(0x03 << 16), String.UTF8.encode("test3"));
  bst.set(bswap<u64>(3), String.UTF8.encode("test2"));
  _flush();
}

export function test_maskLowerThan(): void {
  const data = new ArrayBuffer(32);
  store<u64>(changetype<usize>(data), U64.MAX_VALUE);
  store<u64>(changetype<usize>(data) + 8, U64.MAX_VALUE);
  store<u64>(changetype<usize>(data) + 16, U64.MAX_VALUE);
  store<u64>(changetype<usize>(data) + 24, U64.MAX_VALUE);
  maskLowerThan(data, <u8>255);
  maskLowerThan(data, <u8>190);
  maskLowerThan(data, <u8>100);
  maskLowerThan(data, <u8>32);
}

export function test_maskGreaterThan(): void {
  const data = new ArrayBuffer(32);
  setBitU256(data, 0);
  setBitU256(data, 3);
  //console.log("maskGreaterThan((bytes), 3)");
  //console.log(Box.from(data).toHexString());
  maskGreaterThan(data, 3);
  //console.log(Box.from(data).toHexString());
}

export function test_maskLowerThan2(): void {
  const data = new ArrayBuffer(32);
  setBitU256(data, 3);
  setBitU256(data, 0);
  maskLowerThan(data, <u8>4);
  //  console.log("maskLowerThan(3)");
  //  console.log(Box.from(data).toHexString());
}

export function test_binarySearch(): void {
  const data = new ArrayBuffer(32);
  store<u8>(changetype<usize>(data) + 9, 0x01);
}

export function test_binarySearch2(): void {
  const data = new ArrayBuffer(32);
  setBitU256(data, 0);
  setBitU256(data, 3);
  //console.log("binarySearch(data, true)");
  //console.log(Box.from(data).toHexString());
  //console.log(binarySearchU256(data, false).toString(10));;
}
export function test_binarySearch3(): void {
  const data = new ArrayBuffer(32);
  setBitU256(data, 0);
  setBitU256(data, 2);
}
