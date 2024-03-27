import { IndexerProgram } from "metashrew-test";
import path from "path";
import fs from "fs-extra";
import { EventEmitter } from "events";

describe("metashrew index", () => {
  it("should run __start against ordinal-genesis block", async () => {
    const wasmHex = path.join(__dirname, "..", "build", "release.wasm");

    const indexer = new IndexerProgram(
      new Uint8Array(
        Array.from(
          await fs.readFile(
            wasmHex
          ),
        ),
      ).buffer,
    );
    indexer.on('log', (v) => console.log(v));

    indexer.setBlock(
      await fs.readFile(path.join(__dirname, "ordinal-genesis.hex"), "utf8")
    );

    indexer.setBlockHeight(767430);
    const result = await indexer.run("_start");
    console.log(indexer.kv);
  });
  it("test_maskLowerThan", async () => {
    const wasmHex = path.join(__dirname, "..", "build", "release.wasm");

    const indexer = new IndexerProgram(
      new Uint8Array(
        Array.from(
          await fs.readFile(
            wasmHex
          ),
        ),
      ).buffer,
    );
    indexer.on('log', (v) => console.log(v));

    indexer.setBlock(
      await fs.readFile(path.join(__dirname, "ordinal-genesis.hex"), "utf8")
    );

    indexer.setBlockHeight(767430);
    const result = await indexer.run("test_maskLowerThan");

  });
  it("test_binarySearch", async () => {
    const wasmHex = path.join(__dirname, "..", "build", "release.wasm");

    const indexer = new IndexerProgram(
      new Uint8Array(
        Array.from(
          await fs.readFile(
            wasmHex
          ),
        ),
      ).buffer,
    );
    indexer.on('log', (v) => console.log(v));

    indexer.setBlock(
      await fs.readFile(path.join(__dirname, "ordinal-genesis.hex"), "utf8")
    );

    indexer.setBlockHeight(767430);
    const result = await indexer.run("test_binarySearch");

  });
});
