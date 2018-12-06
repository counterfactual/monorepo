import { ethers } from "ethers";

declare namespace jest {
  interface Matchers<R> {
    toBeBigNumber(value: ethers.utils.BigNumberish): CustomMatcherResult;
  }
}
