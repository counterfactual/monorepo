import * as cf from "@counterfactual/cf.js";
import { ethers } from "ethers";

import { Context } from "../../instruction-executor";
import { Opcode } from "../../instructions";
import { InternalMessage, StateProposal } from "../../types";
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
    network: cf.legacy.network.NetworkContext
  ): ProtocolOperation {
    const proposedState: StateProposal = getFirstResult(
      Opcode.STATE_TRANSITION_PROPOSE,
      context.results
    ).value;
    let op;
    if (message.actionName === cf.legacy.node.ActionName.UPDATE) {
      op = this.update(message, context, network, proposedState.channel);
    } else if (message.actionName === cf.legacy.node.ActionName.SETUP) {
      op = this.setup(message, context, network, proposedState.channel);
    } else if (message.actionName === cf.legacy.node.ActionName.INSTALL) {
      op = this.install(
        message,
        context,
        network,
        proposedState.channel,
        proposedState.cfAddr!
      );
    } else if (message.actionName === cf.legacy.node.ActionName.UNINSTALL) {
      op = this.uninstall(message, context, network, proposedState.channel);
    }
    return op;
  }

  public update(
    message: InternalMessage,
    context: Context,
    network: cf.legacy.network.NetworkContext,
    proposedChannel: cf.legacy.channel.StateChannelInfo
  ): ProtocolOperation {
    const multisig: cf.legacy.utils.Address =
      message.clientMessage.multisigAddress;
    if (message.clientMessage.appId === undefined) {
      // FIXME: handle more gracefully
      // https://github.com/counterfactual/monorepo/issues/121
      throw Error("update message must have appId set");
    }

    const appChannel =
      proposedChannel.appInstances[message.clientMessage.appId];

    // TODO: ensure these members are typed instead of having to reconstruct
    // class instances
    // https://github.com/counterfactual/monorepo/issues/135
    appChannel.cfApp = new cf.legacy.app.AppInterface(
      appChannel.cfApp.address,
      appChannel.cfApp.applyAction,
      appChannel.cfApp.resolve,
      appChannel.cfApp.getTurnTaker,
      appChannel.cfApp.isStateTerminal,
      appChannel.cfApp.stateEncoding
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
      network,
      multisig,
      // FIXME: signing keys should be app-specific ephemeral keys
      // https://github.com/counterfactual/monorepo/issues/120
      signingKeys,
      appChannel.appStateHash!,
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
    network: cf.legacy.network.NetworkContext,
    proposedChannel: cf.legacy.channel.StateChannelInfo
  ): ProtocolOperation {
    const multisig: cf.legacy.utils.Address = proposedChannel.multisigAddress;
    const freeBalance: cf.legacy.utils.FreeBalance =
      proposedChannel.freeBalance;
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
      network,
      multisig,
      signingKeys,
      cf.legacy.utils.FreeBalance.contractInterface(network),
      cf.legacy.utils.FreeBalance.terms(),
      freeBalance.timeout,
      freeBalance.uniqueId
    );

    return new OpSetup(
      network,
      multisig,
      freeBalanceAppInstance,
      newFreeBalance,
      nonce
    );
  }

  public install(
    message: InternalMessage,
    context: Context,
    network: cf.legacy.network.NetworkContext,
    proposedChannel: cf.legacy.channel.StateChannelInfo,
    cfAddr: cf.legacy.utils.H256
  ) {
    const freeBalance = proposedChannel.freeBalance;
    const multisig: cf.legacy.utils.Address =
      message.clientMessage.multisigAddress;
    const appChannel = proposedChannel.appInstances[cfAddr];

    const signingKeys = [appChannel.keyA!, appChannel.keyB!];

    const app = new cf.legacy.app.AppInstance(
      network,
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
      freeBalance.dependencyNonce
    );

    const op = new OpInstall(
      network,
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
    network: cf.legacy.network.NetworkContext,
    proposedChannel: cf.legacy.channel.StateChannelInfo
  ): ProtocolOperation {
    const multisig: cf.legacy.utils.Address =
      message.clientMessage.multisigAddress;
    const cfAddr = message.clientMessage.appId;
    if (cfAddr === undefined) {
      throw new Error("update message must have appId set");
    }

    const freeBalance = proposedChannel.freeBalance;
    const appChannel = proposedChannel.appInstances[cfAddr];

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

    const op = new OpUninstall(
      network,
      multisig,
      newFreeBalance,
      appChannel.dependencyNonce
    );
    return op;
  }
}
