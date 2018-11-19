import * as cf from "@counterfactual/cf.js";
import { ethers } from "ethers";

import { Context } from "../../instruction-executor";
import { Node } from "../../node";
import { InternalMessage } from "../../types";

import { OpInstall } from "./op-install";
import { OpSetState } from "./op-set-state";
import { OpSetup } from "./op-setup";
import { OpUninstall } from "./op-uninstall";
import { ProtocolOperation } from "./types";

/**
 * Registered with OP_GENERATE
 */
export class EthOpGenerator {
  public static generate(
    message: InternalMessage,
    next: Function,
    context: Context,
    node: Node
  ): ProtocolOperation {
    const proposedState = context.intermediateResults.proposedStateTransition!;
    let op;
    if (message.actionName === cf.legacy.node.ActionName.UPDATE) {
      op = this.update(message, context, node, proposedState.state);
    } else if (message.actionName === cf.legacy.node.ActionName.SETUP) {
      op = this.setup(message, context, node, proposedState.state);
    } else if (message.actionName === cf.legacy.node.ActionName.INSTALL) {
      op = this.install(
        message,
        context,
        node,
        proposedState.state,
        proposedState.cfAddr!
      );
    } else if (message.actionName === cf.legacy.node.ActionName.UNINSTALL) {
      op = this.uninstall(message, context, node, proposedState.state);
    }
    return op;
  }

  public static update(
    message: InternalMessage,
    context: Context,
    node: Node,
    proposedUpdate: any
  ): ProtocolOperation {
    const multisig: cf.legacy.utils.Address =
      message.clientMessage.multisigAddress;
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
    appChannel.cfApp = new cf.legacy.app.AppInterface(
      appChannel.cfApp.address,
      appChannel.cfApp.applyAction,
      appChannel.cfApp.resolve,
      appChannel.cfApp.getTurnTaker,
      appChannel.cfApp.isStateTerminal,
      appChannel.cfApp.abiEncoding
    );

    appChannel.terms = new cf.legacy.app.Terms(
      appChannel.terms.assetType,
      appChannel.terms.limit,
      appChannel.terms.token
    );

    const signingKeys = [
      message.clientMessage.fromAddress,
      message.clientMessage.toAddress
    ];
    signingKeys.sort(
      (addrA: cf.legacy.utils.Address, addrB: cf.legacy.utils.Address) => {
        return new ethers.utils.BigNumber(addrA).lt(addrB) ? -1 : 1;
      }
    );

    return new OpSetState(
      node.networkContext,
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

  public static setup(
    message: InternalMessage,
    context: Context,
    node: Node,
    proposedSetup: any
  ): ProtocolOperation {
    const multisig: cf.legacy.utils.Address =
      message.clientMessage.multisigAddress;
    const freeBalance: cf.legacy.utils.FreeBalance =
      proposedSetup[multisig].freeBalance;
    const nonce = freeBalance.dependencyNonce;
    const newFreeBalance = new cf.legacy.utils.FreeBalance(
      freeBalance.alice,
      freeBalance.aliceBalance,
      freeBalance.bob,
      freeBalance.bobBalance,
      freeBalance.uniqueId,
      freeBalance.localNonce,
      freeBalance.timeout,
      freeBalance.dependencyNonce
    );
    const canon = cf.legacy.utils.CanonicalPeerBalance.canonicalize(
      new cf.legacy.utils.PeerBalance(message.clientMessage.fromAddress, 0),
      new cf.legacy.utils.PeerBalance(message.clientMessage.toAddress, 0)
    );
    const signingKeys = [canon.peerA.address, canon.peerB.address];
    const freeBalanceAppInstance = new cf.legacy.app.AppInstance(
      node.networkContext,
      multisig,
      signingKeys,
      cf.legacy.utils.FreeBalance.contractInterface(node.networkContext),
      cf.legacy.utils.FreeBalance.terms(),
      freeBalance.timeout,
      freeBalance.uniqueId
    );

    return new OpSetup(
      node.networkContext,
      multisig,
      freeBalanceAppInstance,
      newFreeBalance,
      nonce
    );
  }

  public static install(
    message: InternalMessage,
    context: Context,
    node: Node,
    proposedInstall: any,
    cfAddr: cf.legacy.utils.H256
  ) {
    const channel = proposedInstall[message.clientMessage.multisigAddress];
    const freeBalance = channel.freeBalance;
    const multisig: cf.legacy.utils.Address =
      message.clientMessage.multisigAddress;
    const appChannel = channel.appInstances[cfAddr];

    const signingKeys = [appChannel.keyA, appChannel.keyB];

    const app = new cf.legacy.app.AppInstance(
      node.networkContext,
      multisig,
      signingKeys,
      appChannel.cfApp,
      appChannel.terms,
      appChannel.timeout,
      appChannel.uniqueId
    );
    const newFreeBalance = new cf.legacy.utils.FreeBalance(
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
      node.networkContext,
      multisig,
      app,
      newFreeBalance,
      appChannel.dependencyNonce
    );
    return op;
  }

  public static uninstall(
    message: InternalMessage,
    context: Context,
    node: Node,
    proposedUninstall: any
  ): ProtocolOperation {
    const multisig: cf.legacy.utils.Address =
      message.clientMessage.multisigAddress;
    const cfAddr = message.clientMessage.appId;
    if (cfAddr === undefined) {
      throw new Error("update message must have appId set");
    }

    const freeBalance = proposedUninstall[multisig].freeBalance;
    const appChannel = proposedUninstall[multisig].appInstances[cfAddr];

    const newFreeBalance = new cf.legacy.utils.FreeBalance(
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
      node.networkContext,
      multisig,
      newFreeBalance,
      appChannel.dependencyNonce
    );
    return op;
  }
}
