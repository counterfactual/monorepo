import { assert } from "chai";
import * as ethers from "ethers";

contract("ForceMoveGameApp", accounts => {
  const web3 = (global as any).web3;
  const provider = new ethers.providers.Web3Provider(web3.currentProvider);
});
