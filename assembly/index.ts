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
  parseVarInt 
} from "./utils/utils";
import { Index, get, set, _flush, input } from "./indexer/index";
import { console } from "./utils/logging";
import { abort } from "./utils/abort";
import { Block } from "./blockdata";
import { encodeHexFromBuffer } from "./utils/hex";
import { BST, setBitU256, binarySearchU64, binarySearchU32, binarySearchU16, binarySearchU8, binarySearchU256, maskLowerThan } from "./indexer/bst";
import { IndexPointer } from "./indexer/tables";


export function test_parseBlock(): void {
  const data = input();
  const box = Box.from(data);
  const height = parsePrimitive<u32>(box);
  const block = new Block(box);
}

export function test_seekLower(): void {
  const ptr = IndexPointer.wrap(String.UTF8.encode("/")).keyword("outpoint");
  const bst = BST.at<u64>(IndexPointer.wrap(String.UTF8.encode("/")).keyword("outpoint"));
  bst.set(3, String.UTF8.encode("test"));
  bst.set(<u64>(0x03 << 16), String.UTF8.encode("test3"));
  bst.set(bswap<u64>(3), String.UTF8.encode("test2"));
  console.log(bst.seekLower(4).toString(10));
  _flush();
}

export function test_maskLowerThan(): void {
  const data = new ArrayBuffer(32);
  store<u64>(changetype<usize>(data), U64.MAX_VALUE);
  store<u64>(changetype<usize>(data) + 8, U64.MAX_VALUE);
  store<u64>(changetype<usize>(data) + 16, U64.MAX_VALUE);
  store<u64>(changetype<usize>(data) + 24, U64.MAX_VALUE);
  maskLowerThan(data, <u8>255);
  console.log(Box.from(data).toHexString());
  maskLowerThan(data, <u8>190);
  console.log(Box.from(data).toHexString());
  maskLowerThan(data, <u8>100);
  console.log(Box.from(data).toHexString());
  maskLowerThan(data, <u8>32);
  console.log(Box.from(data).toHexString());


}

export function test_maskLowerThan2(): void {
  const data = new ArrayBuffer(32);
  setBitU256(data, 3);
  maskLowerThan(data, <u8>4);
  console.log(Box.from(data).toHexString());
}

export function test_binarySearch(): void {
  const data = new ArrayBuffer(32);
  store<u8>(changetype<usize>(data) + 9, 0x01);
}
