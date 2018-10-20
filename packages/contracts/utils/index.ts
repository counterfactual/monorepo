import * as chai from "chai";
import chaiPromised from "chai-as-promised";
import chaiBigNumber from "chai-bignumber";
import chaiString from "chai-string";
import * as ethers from "ethers";

export * from "./appInstance";
export * from "./structEncoding";
export * from "./contract";
export * from "./multisig";

export { default as buildArtifacts } from "./buildArtifacts";

export const expect = chai
  .use(chaiString)
  .use(chaiPromised)
  .use(chaiBigNumber(ethers.utils.BigNumber)).expect;
