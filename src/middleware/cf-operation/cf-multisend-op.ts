import * as ethers from "ethers";
import Multisig from "../../../contracts/build/contracts/MinimumViableMultisig.json";
import * as abi from "../../abi";
import { Address, Bytes, NetworkContext, Signature } from "../../types";
import * as common from "./common";
import {
  Abi,
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
    readonly ctx: NetworkContext,
    readonly multisig: Address,
    readonly cfFreeBalance: CfFreeBalance,
    readonly dependencyNonce: CfNonce
  ) {
    super();
  }

  public transaction(sigs: Signature[]): Transaction {
    const digest = this.hashToSign();
    sigs.sort((sigA, sigB) => {
      const addrA = sigA.recoverAddress(digest);
      const addrB = sigB.recoverAddress(digest);
      return new ethers.BigNumber(addrA).lt(addrB) ? -1 : 1;
    });
    const multisigInput = this.multisigInput();
    const txData = new ethers.Interface(
      Multisig.abi
    ).functions.execTransaction.encode([
      multisigInput.to,
      multisigInput.val,
      multisigInput.data,
      multisigInput.op,
      Signature.toBytes(sigs)
    ]);
    return new Transaction(this.multisig, 0, txData);
  }

  public hashToSign(): string {
    const multisigInput = this.multisigInput();
    return keccak256(
      abi.encodePacked(
        ["bytes1", "address[]", "address", "uint256", "bytes", "uint8"],
        [
          "0x19",
          [this.cfFreeBalance.alice, this.cfFreeBalance.bob],
          multisigInput.to,
          multisigInput.val,
          multisigInput.data,
          multisigInput.op
        ]
      )
    );
  }

  public freeBalanceInput(): MultisigInput {
    const to = this.ctx.Registry;
    const val = 0;
    const data = this.freeBalanceData();
    const op = Operation.Delegatecall;
    return new MultisigInput(to, val, data, op);
  }

  public freeBalanceData(): Bytes {
    const terms = CfFreeBalance.terms();
    const app = CfFreeBalance.contractInterface(this.ctx);
    const freeBalanceCfAddress = new CfStateChannel(
      this.ctx,
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
      appStateHash,
      freeBalanceCfAddress,
      this.cfFreeBalance.localNonce,
      this.cfFreeBalance.timeout,
      signatures,
      this.ctx.Registry
    );
  }

  public dependencyNonceInput(): MultisigInput {
    const timeout = 0; // FIXME: new NonceRegistry design will obviate timeout
    const to = this.ctx.NonceRegistry;
    const val = 0;
    const data = new ethers.Interface([Abi.setNonce]).functions.setNonce.encode(
      [timeout, this.dependencyNonce.salt, this.dependencyNonce.nonceValue]
    );
    const op = Operation.Call;
    return new MultisigInput(to, val, data, op);
  }

  public abstract eachMultisigInput(): MultisigInput[];

  /**
   * @returns the input for the transaction from the multisig that will trigger
   *          a multisend transaction.
   */
  private multisigInput(): MultisigInput {
    return new MultiSend(this.eachMultisigInput()).input(this.ctx.MultiSend);
  }
}
