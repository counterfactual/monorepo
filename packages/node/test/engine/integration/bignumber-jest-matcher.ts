import { BigNumber, BigNumberish } from "ethers/utils";

declare global {
  namespace jest {
    interface Matchers<R> {
      toBeEq(expected: BigNumberish): BigNumber;
      toBeLt(expected: BigNumberish): BigNumber;
    }
  }
}

export function toBeEq(received: BigNumber, argument: BigNumberish) {
  const pass = received.eq(argument);
  return {
    pass,
    message: () =>
      `expected ${received} to ${pass ? "not " : ""}be equal to ${argument}`
  };
}

export function toBeLt(received: BigNumber, argument: BigNumberish) {
  const pass = received.lt(argument);
  return {
    pass,
    message: () =>
      `expected ${received} to ${pass ? "not " : ""}be less than ${argument}`
  };
}
