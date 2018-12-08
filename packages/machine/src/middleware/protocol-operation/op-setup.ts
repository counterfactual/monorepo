import { ethers } from "ethers";

import StateChannelTransaction from "@counterfactual/contracts/build/contracts/StateChannelTransaction.json";
import { AppIdentity, Terms } from "@counterfactual/types";

import { appIdentityToHash } from "../../utils/app-identity";

import { MultisigTxOp } from "./multisig-tx-op";
import { MultisigInput, Operation } from "./types";

const { keccak256, solidityPack, Interface, defaultAbiCoder } = ethers.utils;

export class OpSetup extends MultisigTxOp {
  public constructor(
    readonly networkContext: any,
    readonly multisig: string,
    readonly multisigOwners: string[],
    readonly freeBalanceAppIdentity: AppIdentity,
    readonly freeBalanceTerms: Terms
  ) {
    super(multisig, multisigOwners);
  }

  multisigInput(): MultisigInput {
    const iface = new Interface(StateChannelTransaction.abi);
    return new MultisigInput(
      this.networkContext.StateChannelTransaction,
      0,
      iface.functions.executeAppConditionalTransaction.encode([
        this.networkContext.AppRegistry,
        this.networkContext.NonceRegistry,
        keccak256(
          solidityPack(
            ["address", "uint256", "bytes32"],
            [
              this.multisig,
              // The timeout is hard-coded to be 0 as is defined by the protocol
              0,
              keccak256(
                defaultAbiCoder.encode(
                  ["uint256"],
                  [
                    // The dependency nonce salt is 0 for the Setup Protocol because
                    // the Setup Protocol assumes it is the first thing run within
                    // the channel context.
                    0
                  ]
                )
              )
            ]
          )
        ),
        appIdentityToHash(this.freeBalanceAppIdentity),
        this.freeBalanceTerms
      ]),
      Operation.Delegatecall
    );
  }
}
