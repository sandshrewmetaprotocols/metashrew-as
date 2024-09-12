import { console } from "../utils/logging";
import { bech32m, bech32, toWords } from "../utils/b32";
import { sha256 } from "../utils/sha256";
import { Box } from "../utils/box";
import { arrayBufferToArray } from "../indexer";
import { Script } from "../utils";

export function arrayToArrayBuffer(v: Array<u8>): ArrayBuffer {
  return new Box(v.dataStart, v.length).toArrayBuffer();
}
export enum Network {
  MAINNET,
  TESTNET,
  REGTEST,
}

export class Address {
  /**
   * Returns the address from a given script
   * @param {Script} script - The script to extract the address from
   * @returns {ArrayBuffer | null} - The address or null if the script is not a valid address
   */

  static fromOutputScript(
    script: Script,
    network: Network = Network.MAINNET,
  ): ArrayBuffer | null {
    const scriptView = Uint8Array.wrap(script.data.toArrayBuffer());

    // P2PKH
    if (
      scriptView.length === 25 &&
      scriptView[0] === 0x76 &&
      scriptView[1] === 0xa9 &&
      scriptView[2] === 0x14 &&
      scriptView[23] === 0x88 &&
      scriptView[24] === 0xac
    ) {
      const version = network === Network.MAINNET ? 0x00 : 0x6f;
      return this.toBase58Check(version as u8, scriptView.slice(3, 23));
    }

    // P2SH
    if (
      scriptView.length === 23 &&
      scriptView[0] === 0xa9 &&
      scriptView[1] === 0x14 &&
      scriptView[22] === 0x87
    ) {
      const version = network === Network.MAINNET ? 0x05 : 0xc4;
      return this.toBase58Check(version as u8, scriptView.slice(2, 22));
    }

    // P2WPKH
    if (
      scriptView.length === 22 &&
      scriptView[0] === 0x00 &&
      scriptView[1] === 0x14
    ) {
      const hrp = this.getHrpForNetwork(network);
      return this.toBech32(hrp, 0 as u8, scriptView.slice(2));
    }

    // P2WSH
    if (
      scriptView.length === 34 &&
      scriptView[0] === 0x00 &&
      scriptView[1] === 0x20
    ) {
      const hrp = this.getHrpForNetwork(network);
      return this.toBech32(hrp, 0 as u8, scriptView.slice(2));
    }

    // P2TR
    if (
      scriptView.length === 34 &&
      scriptView[0] === 0x51 &&
      scriptView[1] === 0x20
    ) {
      const hrp = this.getHrpForNetwork(network);
      return this.toBech32m(hrp, 1 as u8, scriptView.slice(2));
    }

    return null;
  }

  private static getHrpForNetwork(network: Network): string {
    switch (network) {
      case Network.MAINNET:
        return "bc";
      case Network.TESTNET:
        return "tb";
      case Network.REGTEST:
        return "bcrt";
      default:
        return "bc";
    }
  }

  /**
   * Returns the bech32 encoding of the given data
   * @param {ArrayBuffer} prefix - The prefix to use for the encoding
   * @param {ArrayBuffer} data - The data to encode
   * @param {u8} version - The version to use for the encoding
   * @returns {ArrayBuffer} - The bech32 encoding of the data
   */
  static toBech32(
    prefix: string,
    version: u8,
    payload: Uint8Array,
  ): ArrayBuffer {
    let words = arrayBufferToArray(toWords(payload.buffer));
    words.unshift(version);

    return bech32(String.UTF8.encode(prefix), arrayToArrayBuffer(words));
  }

  /**
   * Returns the bech32m encoding of the given data
   * @param {ArrayBuffer} prefix - The prefix to use for the encoding
   * @param {ArrayBuffer} data - The data to encode
   * @param {u8} version - The version to use for the encoding
   * @returns {ArrayBuffer} - The bech32m encoding of the data
   */
  static toBech32m(
    prefix: string,
    version: u8,
    payload: Uint8Array,
  ): ArrayBuffer {
    let words = arrayBufferToArray(toWords(payload.buffer));
    words.unshift(version);

    return bech32m(String.UTF8.encode(prefix), arrayToArrayBuffer(words));
  }

  /**
   * Returns the base58 encoding of the given data
   * @param {Uint8Array} data - data to be encoded
   */
  static toBase58(data: Uint8Array): ArrayBuffer {
    const ALPHABET: string =
      "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";
    let result: string = "";
    let x: u64 = 0;
    let base: u64 = 58;

    // Convert the byte array to a big integer
    for (let i = 0; i < data.length; i++) {
      x = x * 256 + u64(data[i]);
    }

    // Encode the integer to Base58
    while (x > 0) {
      let mod: u64 = x % base;
      x = x / base;
      result = ALPHABET.charAt(i32(mod)) + result;
    }

    // Add '1' characters for leading zero bytes
    for (let i = 0; i < data.length && data[i] === 0; i++) {
      result = "1" + result;
    }

    // Convert the resulting string to an ArrayBuffer
    let encodedData = String.UTF8.encode(result);
    return encodedData;
  }

  /**
   * Returns the base58check encoding of the given data
   * @param {u8} version - The prefix to use for the encoding
   * @param {Uint8Array} payload - The data to encode
   * @returns {ArrayBuffer} - The base58check encoding of the data
   */
  static toBase58Check(version: u8, payload: Uint8Array): ArrayBuffer {
    const versionedPayload = new Uint8Array(payload.length + 1);
    versionedPayload[0] = version;
    versionedPayload.set(payload, 1);

    const checksumBuffer = sha256(sha256(versionedPayload.buffer));
    const checksumView = Uint8Array.wrap(checksumBuffer);
    const checksum = checksumView.slice(0, 4);

    const fullPayload = new Uint8Array(versionedPayload.length + 4);
    fullPayload.set(versionedPayload);
    fullPayload.set(checksum, versionedPayload.length);

    return this.toBase58(fullPayload);
  }
}
