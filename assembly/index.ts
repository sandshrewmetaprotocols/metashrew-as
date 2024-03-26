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
import { BST } from "./indexer/bst";
import { IndexPointer } from "./indexer/tables";


export function _start(): void {
  const data = input();
  const box = Box.from(data);
  const height = parsePrimitive<u32>(box);
  const block = new Block(box);
  const ptr = IndexPointer.wrap(String.UTF8.encode("/")).keyword("outpoint");
  const bst = BST.at<u64>(IndexPointer.wrap(String.UTF8.encode("/")).keyword("outpoint"));
  bst.set(3, String.UTF8.encode("test"));
  bst.set(bswap<u64>(3), String.UTF8.encode("test2"));
  _flush();
}
