import { Instruction } from "../../instructions";
import { CfState, Context } from "../../state";
import {
  ActionName,
  Address,
  CanonicalPeerBalance,
  H256,
  InternalMessage,
  PeerBalance,
  Signature
} from "../../types";
import { CfOpGenerator, getFirstResult } from "../middleware";
import { CfOpInstall } from "./cf-op-install";
import { CfOpSetState } from "./cf-op-setstate";
import { CfOpSetup } from "./cf-op-setup";
import { CfOpUninstall } from "./cf-op-uninstall";
import {
  CfAppInterface,
  CfFreeBalance,
  CfOperation,
  CfStateChannel,
  Terms
} from "./types";

/**
 * Middleware to be used and registered with the VM on OP_GENERATE instructions
 * to generate CfOperations. When combined with signatures from all parties
 * in the state channel, the CfOperation transitions the state to that
 * yielded by STATE_TRANSITION_PROPOSE.
 */
export class EthCfOpGenerator extends CfOpGenerator {
  public generate(
    message: InternalMessage,
    next: Function,
    context: Context,
    cfState: CfState
  ): CfOperation {
    const proposedState = getFirstResult(
      Instruction.STATE_TRANSITION_PROPOSE,
      context.results
    ).value;
    let op;
    if (message.actionName === ActionName.UPDATE) {
      op = this.update(message, context, cfState, proposedState.state);
    } else if (message.actionName === ActionName.SETUP) {
      op = this.setup(message, context, cfState, proposedState.state);
    } else if (message.actionName === ActionName.INSTALL) {
      op = this.install(
        message,
        context,
        cfState,
        proposedState.state,
        proposedState.cfAddr
      );
    } else if (message.actionName === ActionName.UNINSTALL) {
      op = this.uninstall(message, context, cfState, proposedState.state);
    }
    return op;
  }

  public update(
    message: InternalMessage,
    context: Context,
    cfState: CfState,
    proposedUpdate: any
  ): CfOperation {
    const multisig: Address = message.clientMessage.multisigAddress;
    if (message.clientMessage.appId === undefined) {
      // FIXME: handle more gracefully
      throw Error("update message must have appId set");
    }
    const appChannel =
      proposedUpdate[multisig].appChannels[message.clientMessage.appId];

    // TODO: ensure these members are typed instead of having to reconstruct
    // class instances
    appChannel.cfApp = new CfAppInterface(
      appChannel.cfApp.address,
      appChannel.cfApp.applyAction,
      appChannel.cfApp.resolve,
      appChannel.cfApp.getTurnTaker,
      appChannel.cfApp.isStateTerminal,
      appChannel.cfApp.abiEncoding
    );

    appChannel.terms = new Terms(
      appChannel.terms.assetType,
      appChannel.terms.limit,
      appChannel.terms.token
    );

    return new CfOpSetState(
      cfState.networkContext,
      multisig,
      [appChannel.keyA, appChannel.keyB],
      appChannel.appStateHash,
      appChannel.uniqueId,
      appChannel.terms,
      appChannel.cfApp,
      appChannel.localNonce,
      appChannel.timeout
    );
  }

  public setup(
    message: InternalMessage,
    context: Context,
    cfState: CfState,
    proposedSetup: any
  ): CfOperation {
    const multisig: Address = message.clientMessage.multisigAddress;
    const freeBalance = proposedSetup[multisig].freeBalance;
    const nonce = freeBalance.nonce;
    const cfFreeBalance = new CfFreeBalance(
      freeBalance.alice,
      freeBalance.aliceBalance,
      freeBalance.bob,
      freeBalance.bobBalance,
      freeBalance.uniqueId,
      freeBalance.localNonce,
      freeBalance.timeout,
      freeBalance.nonce
    );
    const canon = CanonicalPeerBalance.canonicalize(
      new PeerBalance(message.clientMessage.fromAddress, 0),
      new PeerBalance(message.clientMessage.toAddress, 0)
    );
    const signingKeys = [canon.peerA.address, canon.peerB.address];
    const cfStateChannel = new CfStateChannel(
      cfState.networkContext,
      multisig,
      signingKeys,
      CfFreeBalance.contractInterface(cfState.networkContext),
      CfFreeBalance.terms(),
      freeBalance.timeout,
      freeBalance.uniqueId
    );

    return new CfOpSetup(
      cfState.networkContext,
      multisig,
      cfStateChannel,
      cfFreeBalance,
      nonce
    );
  }

  public install(
    message: InternalMessage,
    context: Context,
    cfState: CfState,
    proposedInstall: any,
    cfAddr: H256
  ) {
    const channel = proposedInstall[message.clientMessage.multisigAddress];
    const freeBalance = channel.freeBalance;
    const multisig: Address = message.clientMessage.multisigAddress;
    const appChannel = channel.appChannels[cfAddr];

    const app = new CfStateChannel(
      cfState.networkContext,
      multisig,
      [appChannel.keyA, appChannel.keyB],
      appChannel.cfApp,
      appChannel.terms,
      appChannel.timeout,
      appChannel.uniqueId
    );
    const cfFreeBalance = new CfFreeBalance(
      freeBalance.alice,
      freeBalance.aliceBalance,
      freeBalance.bob,
      freeBalance.bobBalance,
      freeBalance.uniqueId,
      freeBalance.localNonce,
      freeBalance.timeout,
      freeBalance.nonce
    );

    const op = new CfOpInstall(
      cfState.networkContext,
      multisig,
      app,
      cfFreeBalance,
      appChannel.dependencyNonce
    );
    return op;
  }

  public uninstall(
    message: InternalMessage,
    context: Context,
    cfState: CfState,
    proposedUninstall: any
  ): CfOperation {
    const multisig: Address = message.clientMessage.multisigAddress;
    const cfAddr = message.clientMessage.appId;
    if (cfAddr === undefined) {
      throw new Error("update message must have appId set");
    }

    const freeBalance = proposedUninstall[multisig].freeBalance;
    const appChannel = proposedUninstall[multisig].appChannels[cfAddr];

    const cfFreeBalance = new CfFreeBalance(
      freeBalance.alice,
      freeBalance.aliceBalance,
      freeBalance.bob,
      freeBalance.bobBalance,
      freeBalance.uniqueId,
      freeBalance.localNonce,
      freeBalance.timeout,
      freeBalance.nonce
    );

    const op = new CfOpUninstall(
      cfState.networkContext,
      multisig,
      cfFreeBalance,
      appChannel.dependencyNonce
    );
    return op;
  }
}
