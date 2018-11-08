import * as cf from "@counterfactual/cf.js";
import * as ethers from "ethers";

import { Instruction } from "../../instructions";
import { Context, NodeState } from "../../node-state";
import { InternalMessage } from "../../types";
import { getFirstResult, OpGenerator } from "../middleware";

import { OpInstall } from "./op-install";
import { OpSetState } from "./op-set-state";
import { OpSetup } from "./op-setup";
import { OpUninstall } from "./op-uninstall";
import { ProtocolOperation } from "./types";

/**
 * Middleware to be used and registered with the InstructionExecutor on OP_GENERATE instructions
 * to generate ProtocolOperations. When combined with signatures from all parties
 * in the state channel, the ProtocolOperation transitions the state to that
 * yielded by STATE_TRANSITION_PROPOSE.
 */
export class EthOpGenerator extends OpGenerator {
  public generate(
    message: InternalMessage,
    next: Function,
    context: Context,
    nodeState: NodeState
  ): ProtocolOperation {
    const proposedState = getFirstResult(
      Instruction.STATE_TRANSITION_PROPOSE,
      context.results
    ).value;
    let op;
    if (message.actionName === cf.node.ActionName.UPDATE) {
      op = this.update(message, context, nodeState, proposedState.state);
    } else if (message.actionName === cf.node.ActionName.SETUP) {
      op = this.setup(message, context, nodeState, proposedState.state);
    } else if (message.actionName === cf.node.ActionName.INSTALL) {
      op = this.install(
        message,
        context,
        nodeState,
        proposedState.state,
        proposedState.cfAddr
      );
    } else if (message.actionName === cf.node.ActionName.UNINSTALL) {
      op = this.uninstall(message, context, nodeState, proposedState.state);
    }
    return op;
  }

  public update(
    message: InternalMessage,
    context: Context,
    nodeState: NodeState,
    proposedUpdate: any
  ): ProtocolOperation {
    const multisig: cf.utils.Address = message.clientMessage.multisigAddress;
    if (message.clientMessage.appId === undefined) {
      // FIXME: handle more gracefully
      // https://github.com/counterfactual/monorepo/issues/121
      throw Error("update message must have appId set");
    }
    const appChannel =
      proposedUpdate[multisig].appInstances[message.clientMessage.appId];

    // TODO: ensure these members are typed instead of having to reconstruct
    // class instances
    // https://github.com/counterfactual/monorepo/issues/135
    appChannel.cfApp = new cf.app.AppInterface(
      appChannel.cfApp.address,
      appChannel.cfApp.applyAction,
      appChannel.cfApp.resolve,
      appChannel.cfApp.getTurnTaker,
      appChannel.cfApp.isStateTerminal,
      appChannel.cfApp.abiEncoding
    );

    appChannel.terms = new cf.app.Terms(
      appChannel.terms.assetType,
      appChannel.terms.limit,
      appChannel.terms.token
    );

    const signingKeys = [
      message.clientMessage.fromAddress,
      message.clientMessage.toAddress
    ];
    signingKeys.sort((addrA: cf.utils.Address, addrB: cf.utils.Address) => {
      return new ethers.utils.BigNumber(addrA).lt(addrB) ? -1 : 1;
    });

    return new OpSetState(
      nodeState.networkContext,
      multisig,
      // FIXME: signing keys should be app-specific ephemeral keys
      // https://github.com/counterfactual/monorepo/issues/120
      signingKeys,
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
    nodeState: NodeState,
    proposedSetup: any
  ): ProtocolOperation {
    const multisig: cf.utils.Address = message.clientMessage.multisigAddress;
    const freeBalance: cf.utils.FreeBalance =
      proposedSetup[multisig].freeBalance;
    const nonce = freeBalance.dependencyNonce;
    const newFreeBalance = new cf.utils.FreeBalance(
      freeBalance.alice,
      freeBalance.aliceBalance,
      freeBalance.bob,
      freeBalance.bobBalance,
      freeBalance.uniqueId,
      freeBalance.localNonce,
      freeBalance.timeout,
      freeBalance.dependencyNonce
    );
    const canon = cf.utils.CanonicalPeerBalance.canonicalize(
      new cf.utils.PeerBalance(message.clientMessage.fromAddress, 0),
      new cf.utils.PeerBalance(message.clientMessage.toAddress, 0)
    );
    const signingKeys = [canon.peerA.address, canon.peerB.address];
    const freeBalanceAppInstance = new cf.app.AppInstance(
      nodeState.networkContext,
      multisig,
      signingKeys,
      cf.utils.FreeBalance.contractInterface(nodeState.networkContext),
      cf.utils.FreeBalance.terms(),
      freeBalance.timeout,
      freeBalance.uniqueId
    );

    return new OpSetup(
      nodeState.networkContext,
      multisig,
      freeBalanceAppInstance,
      newFreeBalance,
      nonce
    );
  }

  public install(
    message: InternalMessage,
    context: Context,
    nodeState: NodeState,
    proposedInstall: any,
    cfAddr: cf.utils.H256
  ) {
    const channel = proposedInstall[message.clientMessage.multisigAddress];
    const freeBalance = channel.freeBalance;
    const multisig: cf.utils.Address = message.clientMessage.multisigAddress;
    const appChannel = channel.appInstances[cfAddr];

    const signingKeys = [appChannel.keyA, appChannel.keyB];

    const app = new cf.app.AppInstance(
      nodeState.networkContext,
      multisig,
      signingKeys,
      appChannel.cfApp,
      appChannel.terms,
      appChannel.timeout,
      appChannel.uniqueId
    );
    const newFreeBalance = new cf.utils.FreeBalance(
      freeBalance.alice,
      freeBalance.aliceBalance,
      freeBalance.bob,
      freeBalance.bobBalance,
      freeBalance.uniqueId,
      freeBalance.localNonce,
      freeBalance.timeout,
      freeBalance.nonce
    );

    const op = new OpInstall(
      nodeState.networkContext,
      multisig,
      app,
      newFreeBalance,
      appChannel.dependencyNonce
    );
    return op;
  }

  public uninstall(
    message: InternalMessage,
    context: Context,
    nodeState: NodeState,
    proposedUninstall: any
  ): ProtocolOperation {
    const multisig: cf.utils.Address = message.clientMessage.multisigAddress;
    const cfAddr = message.clientMessage.appId;
    if (cfAddr === undefined) {
      throw new Error("update message must have appId set");
    }

    const freeBalance = proposedUninstall[multisig].freeBalance;
    const appChannel = proposedUninstall[multisig].appInstances[cfAddr];

    const newFreeBalance = new cf.utils.FreeBalance(
      freeBalance.alice,
      freeBalance.aliceBalance,
      freeBalance.bob,
      freeBalance.bobBalance,
      freeBalance.uniqueId,
      freeBalance.localNonce,
      freeBalance.timeout,
      freeBalance.nonce
    );

    const op = new OpUninstall(
      nodeState.networkContext,
      multisig,
      newFreeBalance,
      appChannel.dependencyNonce
    );
    return op;
  }
}
