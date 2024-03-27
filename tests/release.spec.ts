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
  it("test_parseBlock", async () => {
    const indexer = makeIndexer();
    const result = await indexer.run("test_parseBlock");
    
  });
  it("test_seekLower", async () => {
    const indexer = makeIndexer();
    const result = await indexer.run("test_seekLower");
  });
  it("test_maskLowerThan", async () => {
    const indexer = makeIndexer();
    const result = await indexer.run("test_maskLowerThan");
  });
  it("test_maskLowerThan2", async () => {
    const indexer = makeIndexer();
    const result = await indexer.run("test_maskLowerThan2");
  });
  it("test_binarySearch", async () => {
    const indexer = makeIndexer();
    const result = await indexer.run("test_binarySearch");
  });
  it("test_binarySearch2", async () => {
    const indexer = makeIndexer();
    const result = await indexer.run("test_binarySearch2");
  });
  it("test_binarySearch3", async () => {
    const indexer = makeIndexer();
    const result = await indexer.run("test_binarySearch3");
  });
});
