import { IndexerProgram } from "metashrew-test";
import path from "path";
import fs from "fs-extra";
import { EventEmitter } from "events";

const ORDINAL_GENESIS = fs.readFileSync(
  path.join(__dirname, "ordinal-genesis.hex"),
  "utf8",
);

const WASM_BINARY = fs.readFileSync(path.join(__dirname, '..', 'build', 'release.wasm'));

const makeIndexer = () => {
  const indexer = new IndexerProgram(
    new Uint8Array(Array.from(WASM_BINARY)).buffer,
  );
  indexer.on("log", (v) => console.log(v));
  indexer.setBlock(ORDINAL_GENESIS);
  indexer.setBlockHeight(767430);
  return indexer;
};

describe("metashrew index", () => {
  const makeTest = (s) => it(s, async () => {
    const indexer = makeIndexer();
    const result = await indexer.run(s);
  });
  [
    "test_parseBlock",
    "test_seekLower",
    "test_seekLower2",
    "test_seekGreater",
    "test_maskLowerThan",
    "test_maskGreaterThan",
    "test_maskLowerThan2",
    "test_binarySearch",
    "test_binarySearch2",
    "test_binarySearch3"
  ].forEach((v) => makeTest(v));
});
