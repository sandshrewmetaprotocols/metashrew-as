import { console } from "../utils/logging";
import { Box } from "../utils/box";
import {
  parsePrimitive,
  parseBytes,
  concat,
  primitiveToBuffer,
  reverse,
} from "../utils/utils";
import { nullptr, Pointer, toPointer } from "../utils/pointer";
import { Transaction } from "./transaction";
import { sha256d } from "../utils/sha256";
import { encodeHexFromBuffer } from "../utils/hex";

export class Header {
  public version: i32;
  public prevBlock: Box;
  public merkleRoot: Box;
  public time: u32;
  public bits: u32;
  public nonce: u32;
  public bytes: Box;
  constructor(data: Box) {
    let head = data.start;
    this.version = parsePrimitive<i32>(data);
    this.prevBlock = parseBytes(data, 32);
    this.merkleRoot = parseBytes(data, 32);
    this.time = parsePrimitive<u32>(data);
    this.bits = parsePrimitive<u32>(data);
    this.nonce = parsePrimitive<u32>(data);
    let tail = data.start;
    this.bytes = toPointer(head).toBox(tail - head);
  }

  toLeBytes(): ArrayBuffer {
    let vers = primitiveToBuffer<i32>(this.version);
    let prevBlock = this.prevBlock.toArrayBuffer();
    let merkleRoot = this.merkleRoot.toArrayBuffer();
    let time = primitiveToBuffer<u32>(this.time);
    let bits = primitiveToBuffer<u32>(this.bits);
    let nonce = primitiveToBuffer<u32>(this.nonce);
    return concat([vers, prevBlock, merkleRoot, time, bits, nonce]);
  }
}

export class Block {
  public bytes: Box;
  public header: Header;
  public transactions: Array<Transaction>;
  public prevBlock: Box;
  public merkleRoot: Box;
  constructor(data: Box) {
    this.transactions = nullptr<Array<Transaction>>();
    this.prevBlock = nullptr<Box>();
    this.merkleRoot = nullptr<Box>();
    let head = data.start;
    this.header = new Header(data);
    this.transactions = Transaction.parseTransactionsFromBlock(data);
    let tail = data.start;
    this.bytes = toPointer(head).toBox(tail - head);
  }

  // returns the coinbase transaction if there is one
  coinbase(): Transaction {
    return this.transactions[0];
  }

  blockhash(): ArrayBuffer {
    // console.log(encodeHexFromBuffer(this.header.toLeBytes()) + "\n");
    return sha256d(this.header.toLeBytes());
  }

  // returns list of txids in the block transaction(s) body including the coinbase txid
  txids(): Array<ArrayBuffer> {
    let txids = new Array<ArrayBuffer>();
    for (let i = 0; i < this.transactions.length; i++) {
      txids.push(this.transactions[i].txid());
    }
    return txids;
  }
}
