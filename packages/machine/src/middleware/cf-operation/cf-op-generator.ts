import * as cf from "@counterfactual/cf.js";
import * as ethers from "ethers";

import { Instruction } from "../../instructions";
import { Context, State } from "../../state";
import { InternalMessage } from "../../types";
import { CfOpGenerator, getFirstResult } from "../middleware";

import { CfOpInstall } from "./cf-op-install";
import { CfOpSetState } from "./cf-op-setstate";
import { CfOpSetup } from "./cf-op-setup";
import { CfOpUninstall } from "./cf-op-uninstall";
import { CfOperation } from "./types";

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
    state: State
  ): CfOperation {
    const proposedState = getFirstResult(
      Instruction.STATE_TRANSITION_PROPOSE,
      context.results
    ).value;
    let op;
    if (message.actionName === cf.node.ActionName.UPDATE) {
      op = this.update(message, context, state, proposedState.state);
    } else if (message.actionName === cf.node.ActionName.SETUP) {
      op = this.setup(message, context, state, proposedState.state);
    } else if (message.actionName === cf.node.ActionName.INSTALL) {
      op = this.install(
        message,
        context,
        state,
        proposedState.state,
        proposedState.cfAddr
      );
    } else if (message.actionName === cf.node.ActionName.UNINSTALL) {
      op = this.uninstall(message, context, state, proposedState.state);
    }
    return op;
  }

  public update(
    message: InternalMessage,
    context: Context,
    state: State,
    proposedUpdate: any
  ): CfOperation {
    const multisig: cf.utils.Address = message.clientMessage.multisigAddress;
    if (message.clientMessage.appId === undefined) {
      // FIXME: handle more gracefully
      // https://github.com/counterfactual/monorepo/issues/121
      throw Error("update message must have appId set");
    }
    const appChannel =
      proposedUpdate[multisig].appChannels[message.clientMessage.appId];

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

    return new CfOpSetState(
      state.networkContext,
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
    state: State,
    proposedSetup: any
  ): CfOperation {
    const multisig: cf.utils.Address = message.clientMessage.multisigAddress;
    const freeBalance: cf.utils.FreeBalance =
      proposedSetup[multisig].freeBalance;
    const nonce = freeBalance.dependencyNonce;
    const cfFreeBalance = new cf.utils.FreeBalance(
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
      state.networkContext,
      multisig,
      signingKeys,
      cf.utils.FreeBalance.contractInterface(state.networkContext),
      cf.utils.FreeBalance.terms(),
      freeBalance.timeout,
      freeBalance.uniqueId
    );

    return new CfOpSetup(
      state.networkContext,
      multisig,
      freeBalanceAppInstance,
      cfFreeBalance,
      nonce
    );
  }

  public install(
    message: InternalMessage,
    context: Context,
    state: State,
    proposedInstall: any,
    cfAddr: cf.utils.H256
  ) {
    const channel = proposedInstall[message.clientMessage.multisigAddress];
    const freeBalance = channel.freeBalance;
    const multisig: cf.utils.Address = message.clientMessage.multisigAddress;
    const appChannel = channel.appChannels[cfAddr];

    const signingKeys = [appChannel.keyA, appChannel.keyB];

    const app = new cf.app.AppInstance(
      state.networkContext,
      multisig,
      signingKeys,
      appChannel.cfApp,
      appChannel.terms,
      appChannel.timeout,
      appChannel.uniqueId
    );
    const cfFreeBalance = new cf.utils.FreeBalance(
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
      state.networkContext,
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
    state: State,
    proposedUninstall: any
  ): CfOperation {
    const multisig: cf.utils.Address = message.clientMessage.multisigAddress;
    const cfAddr = message.clientMessage.appId;
    if (cfAddr === undefined) {
      throw new Error("update message must have appId set");
    }

    const freeBalance = proposedUninstall[multisig].freeBalance;
    const appChannel = proposedUninstall[multisig].appChannels[cfAddr];

    const cfFreeBalance = new cf.utils.FreeBalance(
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
      state.networkContext,
      multisig,
      cfFreeBalance,
      appChannel.dependencyNonce
    );
    return op;
  }
}
