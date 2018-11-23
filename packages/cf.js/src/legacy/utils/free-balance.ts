import * as ethers from "ethers";

import { AppInterface, Terms } from "../app";
import { NetworkContext } from "../network";

import { Address } from ".";
import { Nonce } from "./nonce";

/**
 * The state of a free balance object. Passing this into an install or uninstall
 * will update the free balance object to the values given here.
 */
export class FreeBalance {
  public static terms(): Terms {
    // FIXME: Change implementation of free balance on contracts layer
    // https://github.com/counterfactual/monorepo/issues/118
    return new Terms(
      0, // 0 means ETH
      ethers.utils.parseEther("0.001"), // FIXME: un-hardcode (https://github.com/counterfactual/monorepo/issues/117)
      ethers.constants.AddressZero
    );
  }

  public static contractInterface(ctx: NetworkContext): AppInterface {
    const address = ctx.paymentAppAddr;
    const applyAction = "0x00000000"; // not used
    const resolver = new ethers.utils.Interface([
      // TODO: Put this somewhere eh
      // https://github.com/counterfactual/monorepo/issues/134
      "resolve(tuple(address,address,uint256,uint256),tuple(uint8,uint256,address))"
    ]).functions.resolve.sighash;
    const turn = "0x00000000"; // not used
    const isStateTerminal = "0x00000000"; // not used
    return new AppInterface(
      address,
      applyAction,
      resolver,
      turn,
      isStateTerminal,
      "tuple(address alice, address bob, uint256 aliceBalance, uint256 bobBalance)"
    );
  }

  constructor(
    readonly alice: Address, // first person in free balance object
    readonly aliceBalance: ethers.utils.BigNumber,
    readonly bob: Address, // second person in free balance object
    readonly bobBalance: ethers.utils.BigNumber,
    readonly uniqueId: number,
    readonly localNonce: number,
    readonly timeout: number,
    readonly dependencyNonce: Nonce
  ) {}
}
