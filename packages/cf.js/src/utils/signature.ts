import { ethers } from "ethers";

import { Address, Bytes, H256 } from "./index";

// eg. 'dfee8149d73c19def9cfaf3ea73e95f4f7606826de8d3355eeaf1fd992b2b0f302616ad09ccee8025e5ba345763ee0de9a75b423bbb0ea8da2b2cc34391bc7e628'
const SIGNATURE_LENGTH_WITHOUT_PREFIX = 130;
const V_LENGTH = 2;
const R_LENGTH = 64;
const S_LENGTH = 64;

export class Signature {
  get recoveryParam() {
    return this.v - 27;
  }

  public static toSortedBytes(signatures: Signature[], digest: H256): Bytes {
    const sigs = signatures.slice();
    sigs.sort((sigA, sigB) => {
      const addrA = sigA.recoverAddress(digest);
      const addrB = sigB.recoverAddress(digest);
      return new ethers.utils.BigNumber(addrA).lt(addrB) ? -1 : 1;
    });
    const signatureStrings = sigs.map(sig => {
      return (
        ethers.utils.hexlify(ethers.utils.padZeros(sig.r, 32)).substring(2) +
        ethers.utils.hexlify(ethers.utils.padZeros(sig.s, 32)).substring(2) +
        sig.v.toString(16)
      );
    });
    return `0x${signatureStrings.join("")}`;
  }

  /**
   * Helper method in verifying signatures in transactions
   * @param signatures
   */
  public static fromBytes(signatures: Bytes): Signature[] {
    // chop off the 0x prefix
    let sigs = signatures.substr(2);
    if (sigs.length % SIGNATURE_LENGTH_WITHOUT_PREFIX !== 0) {
      throw Error("The bytes string representing the signatures is malformed.");
    }
    const signaturesList: Signature[] = [];
    while (sigs.length !== 0) {
      const sig = sigs.substr(0, SIGNATURE_LENGTH_WITHOUT_PREFIX);
      sigs = sigs.substr(SIGNATURE_LENGTH_WITHOUT_PREFIX);
      // note: +<string> is syntactic sugar for parsing a number from a string
      const v = +sig.substr(SIGNATURE_LENGTH_WITHOUT_PREFIX - V_LENGTH);
      const r = `0x${sig.substr(0, R_LENGTH)}`;
      const s = `0x${sig.substr(R_LENGTH, S_LENGTH)}`;
      signaturesList.push(new Signature(v, r, s));
    }
    return signaturesList;
  }

  // TODO: fix types
  // https://github.com/counterfactual/monorepo/issues/124
  constructor(readonly v: number, readonly r: string, readonly s: string) {}

  public recoverAddress(digest: H256): Address {
    return ethers.utils.recoverAddress(digest, this.toString());
  }

  public toString(): string {
    return `0x${this.r.substr(2)}${this.s.substr(2)}${ethers.utils
      .hexlify(this.v)
      .substr(2)}`;
  }
}
