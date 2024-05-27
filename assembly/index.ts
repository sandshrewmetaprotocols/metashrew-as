import { Box } from "./utils/box";
import { memcpy } from "./utils/memcpy";
import {
  isOrdTag,
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
import { Transaction, Block, Inscription } from "./blockdata";
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
import { Input } from "./blockdata/transaction";

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
//  console.log("bst.seekLower(0xffffffffffffffff))");
//  logK<u64>(bst.seekLower(0xffffffffffffffff));
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
//  logK<u64>(bst.seekLower(0x03 << 16));
  //bst.nullify(<u64>(0x03 << 16));
  _flush();
}

export function test_isOrdTag(): void {
  const s = String.UTF8.encode("ord");
  isOrdTag(Box.from(s));
}

export function test_seekGreater(): void {
  const ptr = IndexPointer.wrap(String.UTF8.encode("/")).keyword("outpoint");
  const bst = BST.at<u64>(
    IndexPointer.wrap(String.UTF8.encode("/")).keyword("outpoint"),
  );
  bst.set(3, String.UTF8.encode("test"));
  bst.set(4, String.UTF8.encode("test2"));
  bst.set(<u64>(0x03 << 16), String.UTF8.encode("test3"));
  bst.set(<u64>((0x03 << 16) | 0x04), String.UTF8.encode("test3"));
  /*
  bst.set(bswap<u64>(3), String.UTF8.encode("test2"));
  bst.set(bswap<u64>(4), String.UTF8.encode("test4"));
 */
  console.log(bst.seekGreater((0x03 << 16) | 0x04).toString(10));
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

export function test_inscription(): void {
  const data = input();
  const box = Box.from(data);
  const height = parsePrimitive<u32>(box);
  const tx = new Transaction(box);
  tx.ins.forEach((v: Input, i: i32, ary: Array<Input>) => {
    v.inscription();
  });
}

function decodeHex(hex: string): ArrayBuffer {
  const result = new ArrayBuffer(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    store<u8>(changetype<usize>(result) + (i / 2), <u8>parseInt(hex.substring(i, i + 2), 16));
  }
  return result;
}

export function test_indexBrc20(): void {
  const tx = new Transaction(Box.from(decodeHex('02000000000101aabe7e0d5a3a56bb049a417b4e6f90dd2d6a57890fbc6568f476baaae061300a8f03000000fffffffd01260100000000000016001413c8d4f4be75d11b463a35b141a1067155c407a80340b29a41195ee892d8b3ddf0b7912fa0c93cfdc3dc7b22dfdd65ecdc88c2fdcc52684bc09f7f220e7e92be4bfd44c50d05853bee38c1b5800d0c52b7a16f980e9e71203b3e59eda857e9fc750376b1deb6147aa45410410a561e062fb36172b600634eac0063036f726401010a746578742f706c61696e00397b2270223a226272632d3230222c226f70223a226d696e74222c227469636b223a2273617473222c22616d74223a223939393939393939227d6821c03b3e59eda857e9fc750376b1deb6147aa45410410a561e062fb36172b600634e00000000')));
  (tx.ins[0].inscription() as Inscription);
}

export function test_txid(): void {
  const tx = new Transaction(Box.from(decodeHex('010000000174a016bad8927ee739aff7289f5574b8f57fcc32272829ac3aef3edb9959ad580000000048473044022018d1fc212affb41dd322fdcdc8d0474d7eab7ab414a712361f81f93df7fd9bed02200d7d431ac3c7b61a46b30f911797fde4ede3014434cb00149ab71eed26335f0201ffffffff0200111024010000001976a91420420e56079150b50fb0617dce4c374bd61eccea88ac0ae1f505000000001976a91410f958cbe9cf6d26c2e2ace39766c2cdb87179f788ac00000000')));
  console.log(Box.from(tx.txid()).toHexString());
}
