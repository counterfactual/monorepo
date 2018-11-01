import MinimumViableMultisigJson from "@counterfactual/contracts/build/contracts/MinimumViableMultisig.json";
import NonceRegistryJson from "@counterfactual/contracts/build/contracts/NonceRegistry.json";
import * as ethers from "ethers";

import * as abi from "../../abi";

import { Address, Bytes } from "../../types";
import { NetworkContext } from "../../utils/network-context";
import { Signature } from "../../utils/signature";

import * as common from "./common";
import {
  CfFreeBalance,
  CfNonce,
  CfOperation,
  CfStateChannel,
  MultiSend,
  MultisigInput,
  Operation,
  Transaction
} from "./types";

const { keccak256 } = ethers.utils;

export abstract class CfMultiSendOp extends CfOperation {
  constructor(
    readonly networkContext: NetworkContext,
    readonly multisig: Address,
    readonly cfFreeBalance: CfFreeBalance,
    readonly dependencyNonce: CfNonce
  ) {
    super();
  }

  public transaction(sigs: Signature[]): Transaction {
    const multisigInput = this.multisigInput();
    const signatureBytes = Signature.toSortedBytes(sigs, this.hashToSign());
    const txData = new ethers.utils.Interface(
      MinimumViableMultisigJson.abi
    ).functions.execTransaction.encode([
      multisigInput.to,
      multisigInput.val,
      multisigInput.data,
      multisigInput.op,
      signatureBytes
    ]);
    return new Transaction(this.multisig, 0, txData);
  }

  public hashToSign(): string {
    const multisigInput = this.multisigInput();
    const owners = [this.cfFreeBalance.alice, this.cfFreeBalance.bob];
    return keccak256(
      abi.encodePacked(
        ["bytes1", "address[]", "address", "uint256", "bytes", "uint8"],
        [
          "0x19",
          owners,
          multisigInput.to,
          multisigInput.val,
          multisigInput.data,
          multisigInput.op
        ]
      )
    );
  }

  public freeBalanceInput(): MultisigInput {
    const to = this.networkContext.registryAddr;
    const val = 0;
    const data = this.freeBalanceData();
    const op = Operation.Delegatecall;
    return new MultisigInput(to, val, data, op);
  }

  public freeBalanceData(): Bytes {
    const terms = CfFreeBalance.terms();
    const app = CfFreeBalance.contractInterface(this.networkContext);
    const freeBalanceCfAddress = new CfStateChannel(
      this.networkContext,
      this.multisig,
      [this.cfFreeBalance.alice, this.cfFreeBalance.bob],
      app,
      terms,
      this.cfFreeBalance.timeout,
      this.cfFreeBalance.uniqueId
    ).cfAddress();

    const appStateHash = keccak256(
      abi.encode(
        ["address", "address", "uint256", "uint256"],
        [
          this.cfFreeBalance.alice,
          this.cfFreeBalance.bob,
          this.cfFreeBalance.aliceBalance,
          this.cfFreeBalance.bobBalance
        ]
      )
    );
    // don't need signatures since the multisig is the owner
    const signatures = "0x0";
    return common.proxyCallSetStateData(
      this.networkContext,
      appStateHash,
      freeBalanceCfAddress,
      this.cfFreeBalance.localNonce,
      this.cfFreeBalance.timeout,
      signatures
    );
  }

  public dependencyNonceInput(): MultisigInput {
    // FIXME: new NonceRegistryJson design will obviate timeout
    // https://github.com/counterfactual/monorepo/issues/122
    const timeout = 0;
    const to = this.networkContext.nonceRegistryAddr;
    const val = 0;
    const data = new ethers.utils.Interface(
      NonceRegistryJson.abi
    ).functions.setNonce.encode([
      timeout,
      this.dependencyNonce.salt,
      this.dependencyNonce.nonceValue
    ]);
    const op = Operation.Call;
    return new MultisigInput(to, val, data, op);
  }

  public abstract eachMultisigInput(): MultisigInput[];

  /**
   * @returns the input for the transaction from the multisig that will trigger
   *          a multisend transaction.
   */
  private multisigInput(): MultisigInput {
    return new MultiSend(this.eachMultisigInput(), this.networkContext).input(
      this.networkContext.multiSendAddr
    );
  }
}
