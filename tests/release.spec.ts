import { IndexerProgram } from "metashrew-test";
import path from "path";
import fs from "fs-extra";
import { EventEmitter } from "events";

const ORDINAL_GENESIS = fs.readFileSync(
  path.join(__dirname, "ordinal-genesis.hex"),
  "utf8",
);
const BLOCK_780004 = fs.readFileSync(
  path.join(__dirname, "broken-780004.hex"),
  "utf8",
);

const TX_2349be4894 = fs.readFileSync(
  path.join(__dirname, "2349be4894.hex"),
  "utf8",
);

const BLOCK_778163 = fs.readFileSync(
  path.join(__dirname, "broken_tx.hex"),
  "utf8",
);

const WASM_BINARY = fs.readFileSync(
  path.join(__dirname, "..", "build", "debug.wasm"),
);

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
  const makeTest = (s) =>
    it(s, async () => {
      const indexer = makeIndexer();
      const result = await indexer.run(s);
    });
  [
    // "test_parseBlock",
    // "test_seekLower",
    // "test_seekLower2",
    // "test_seekGreater",
    // "test_maskLowerThan",
    // "test_maskGreaterThan",
    // "test_maskLowerThan2",
    // "test_binarySearch",
    // "test_binarySearch2",
    // "test_binarySearch3",
    // "test_isOrdTag" ,
    // "test_indexBrc20",
    // "test_txid",
    "test_fixedbst",
  ].forEach((v) => makeTest(v));
  // it('should parse a tapscript without error', async () => {
  //   const indexer = new IndexerProgram(
  //     new Uint8Array(Array.from(WASM_BINARY)).buffer,
  //   );
  //   indexer.on("log", (v) => console.log(v));
  //   indexer.setBlock('0x020000000001027bc0bba407bc67178f100e352bf6e047fae4cbf960d783586cb5e430b3b700e70000000000feffffff7bc0bba407bc67178f100e352bf6e047fae4cbf960d783586cb5e430b3b700e70100000000feffffff01b4ba0e0000000000160014173fd310e9db2c7e9550ce0f03f1e6c01d833aa90140134896c42cd95680b048845847c8054756861ffab7d4abab72f6508d67d1ec0c590287ec2161dd7884983286e1cd56ce65c08a24ee0476ede92678a93b1b180c03407b5d614a4610bf9196775791fcc589597ca066dcd10048e004cd4c7341bb4bb90cee4705192f3f7db524e8067a5222c7f09baf29ef6b805b8327ecd1e5ab83ca2220f5b059b9a72298ccbefff59d9b943f7e0fc91d8a3b944a95e7b6390cc99eb5f4ac41c0d9dfdf0fe3c83e9870095d67fff59a8056dad28c6dfb944bb71cf64b90ace9a7776b22a1185fb2dc9524f6b178e2693189bf01655d7f38f043923668dc5af45bffd30a00');
  //   indexer.setBlockHeight(709635);
  //   const result = await indexer.run('test_parseWitness');
  // });
  // it('should parse an inscription without error', async () => {
  //   const indexer = new IndexerProgram(
  //     new Uint8Array(Array.from(WASM_BINARY)).buffer,
  //   );
  //   indexer.on("log", (v) => console.log(v));
  //   indexer.setBlock('0x0100000003464abf3e31163d6081eac19f8fc14d34108d7c98ece34a33763d9ddbb5194f8e000000006a47304402205e58d1cb002f62d51e027e68a1b74c039a643e0a3bf00774d383c803d2c10e9002201315138bb52827f5ff4b03b14bd8208eed3781767aa240c583b8cec58d09ca6f01210294a85c8e902a85cb978dd5fe1f230d915779337eddd6ad03a86f69534725f2daffffffff1f2b73052d8a09792c4a096adbbe16220dc30bbdb6ad71d4878d44eccaa843b5000000006b483045022100b5a6e3e940f363348f0e2212ab90b382fc536ca4edeb5642179e47c6c23b836702202ab9052f1899e60c339e97d432b02cfd9bd51048a331d206603ff4d8794e43c301210294a85c8e902a85cb978dd5fe1f230d915779337eddd6ad03a86f69534725f2daffffffff35a7f2740dea30e57cbd416c2fb3b5138b1ea86f9c588e1f45f380767575d7ee000000006b483045022100c0416860f54462516f6431ee20ef40833e0d53dd914223be090ebfb72f689317022038a42715e3b87ea6f492da3ef4cb7530ee2e3a4a5cae1206de6a136a5cda4ccd01210294a85c8e902a85cb978dd5fe1f230d915779337eddd6ad03a86f69534725f2daffffffff014640c7f83d00000017a914dcfbeddd8daafa20221169eab5a2356500cbc9168700000000');
  //   indexer.setBlockHeight(770051);
  //   const result = await indexer.run('test_inscription');
  // });
  // it('should parse entire block', async () => {
  //   const indexer = new IndexerProgram(
  //     new Uint8Array(Array.from(WASM_BINARY)).buffer
  //   );
  //   indexer.on("log", (v) => console.log(v));
  //   indexer.setBlock(BLOCK_780004);
  //   indexer.setBlockHeight(780004);
  //   const result = await indexer.run('test_inscription');
  // });
  // it('it should parse transactgion 2349be4894', async () => {
  //   const indexer = new IndexerProgram(
  //     new Uint8Array(Array.from(WASM_BINARY)).buffer
  //   );
  //   indexer.on("log", (v) => console.log(v));
  //   indexer.setBlock(TX_2349be4894);
  //   indexer.setBlockHeight(780002);
  //   const result = await indexer.run('test_inscription');
  // });
  // it('should parse entire block', async () => {
  //   const indexer = new IndexerProgram(
  //     new Uint8Array(Array.from(WASM_BINARY)).buffer
  //   );
  //   indexer.on("log", (v) => console.log(v));
  //   indexer.setBlock(BLOCK_778163);
  //   indexer.setBlockHeight(778163);
  //   const result = await indexer.run('test_inscription');
  // });
});
