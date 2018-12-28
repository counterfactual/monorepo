import { BigNumber } from "ethers/utils";

declare global {
  namespace jest {
    interface Matchers<R> {
      toBeEq(expected: BigNumber): BigNumber;
    }
  }
}

export function toBeEq(received: BigNumber, argument: BigNumber) {
  return {
    pass: received.eq(argument),
    message: () => `expected ${received} not to be equal to ${argument}`
  };
}
