import * as chai from "chai";
import chaiAsPromised from "chai-as-promised";
import chaiBignumber from "chai-bignumber";
import chaiString from "chai-string";
import { ethers } from "ethers";
import { solidity } from "ethereum-waffle";

export * from "./appInstance";
export * from "./structEncoding";
export * from "./contract";
export * from "./multisig";

export { default as buildArtifacts } from "./buildArtifacts";

export const expect = chai
  .use(chaiString)
  .use(chaiAsPromised)
  .use(chaiBignumber(ethers.utils.BigNumber))
  .use(solidity)
  .expect
