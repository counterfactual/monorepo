import * as cf from "@counterfactual/cf.js";
import { ethers } from "ethers";

import { Context } from "../../instruction-executor";
import { Node, StateChannelInfoImpl } from "../../node";
import { InternalMessage, StateProposal } from "../../types";

export class InstallProposer {
  public static propose(
    message: InternalMessage,
    context: Context,
    node: Node
  ): StateProposal {
    const multisig: cf.legacy.utils.Address =
      message.clientMessage.multisigAddress;
    const data: cf.legacy.app.InstallData = message.clientMessage.data;
    const app = new cf.legacy.app.AppInterface(
      data.app.address,
      data.app.applyAction,
      data.app.resolve,
      data.app.getTurnTaker,
      data.app.isStateTerminal,
      data.app.stateEncoding
    );
    const terms = new cf.legacy.app.Terms(
      data.terms.assetType,
      data.terms.limit,
      data.terms.token
    );
    const uniqueId = InstallProposer.nextUniqueId(node, multisig);
    const signingKeys = InstallProposer.newSigningKeys(context, data);
    const cfAddr = InstallProposer.proposedCfAddress(
      node,
      message,
      app,
      terms,
      signingKeys,
      uniqueId
    );
    const existingFreeBalance = node.stateChannel(multisig).freeBalance;
    const newAppInstance = InstallProposer.newAppInstance(
      cfAddr,
      data,
      app,
      terms,
      signingKeys,
      uniqueId
    );
    const [peerA, peerB] = InstallProposer.newPeers(existingFreeBalance, data);
    const freeBalance = new cf.legacy.utils.FreeBalance(
      peerA.address,
      peerA.balance,
      peerB.address,
      peerB.balance,
      existingFreeBalance.uniqueId,
      existingFreeBalance.localNonce + 1,
      data.timeout,
      existingFreeBalance.dependencyNonce
    );
    const updatedStateChannel = new StateChannelInfoImpl(
      message.clientMessage.toAddress,
      message.clientMessage.fromAddress,
      multisig,
      { [newAppInstance.id]: newAppInstance },
      freeBalance
    );

    return {
      cfAddr,
      state: { [multisig]: updatedStateChannel }
    };
  }

  private static newSigningKeys(
    context: Context,
    data: cf.legacy.app.InstallData
  ): string[] {
    const lastResult = context.intermediateResults.inbox!;

    let signingKeys;
    if (lastResult && lastResult.data) {
      signingKeys = [lastResult.data.keyA, lastResult.data.keyB];
    } else {
      signingKeys = [data.keyA!, data.keyB!];
    }

    // TODO: Feels like this is the wrong place for this sorting...
    // https://github.com/counterfactual/monorepo/issues/129
    signingKeys.sort(
      (addrA: cf.legacy.utils.Address, addrB: cf.legacy.utils.Address) => {
        return new ethers.utils.BigNumber(addrA).lt(addrB) ? -1 : 1;
      }
    );

    return signingKeys;
  }

  private static newAppInstance(
    cfAddr: cf.legacy.utils.H256,
    data: cf.legacy.app.InstallData,
    app: cf.legacy.app.AppInterface,
    terms: cf.legacy.app.Terms,
    signingKeys: string[],
    uniqueId: number
  ): cf.legacy.app.AppInstanceInfo {
    return {
      uniqueId,
      terms,
      id: cfAddr,
      peerA: data.peerA,
      peerB: data.peerB,
      keyA: signingKeys[0],
      keyB: signingKeys[1],
      encodedState: data.encodedAppState,
      localNonce: 1,
      timeout: data.timeout,
      cfApp: app,
      dependencyNonce: new cf.legacy.utils.Nonce(false, uniqueId, 0)
    };
  }

  private static proposedCfAddress(
    node: Node,
    message: InternalMessage,
    app: cf.legacy.app.AppInterface,
    terms: cf.legacy.app.Terms,
    signingKeys: string[],
    uniqueId: number
  ): cf.legacy.utils.H256 {
    return new cf.legacy.app.AppInstance(
      node.networkContext,
      message.clientMessage.multisigAddress,
      signingKeys,
      app,
      terms,
      message.clientMessage.data.timeout,
      uniqueId
    ).cfAddress();
  }

  private static newPeers(
    existingFreeBalance: cf.legacy.utils.FreeBalance,
    data: cf.legacy.app.InstallData
  ): [cf.legacy.utils.PeerBalance, cf.legacy.utils.PeerBalance] {
    const peerA = new cf.legacy.utils.PeerBalance(
      existingFreeBalance.alice,
      existingFreeBalance.aliceBalance.sub(data.peerA.balance)
    );
    const peerB = new cf.legacy.utils.PeerBalance(
      existingFreeBalance.bob,
      existingFreeBalance.bobBalance.sub(data.peerB.balance)
    );
    return [peerA, peerB];
  }

  private static nextUniqueId(
    state: Node,
    multisig: cf.legacy.utils.Address
  ): number {
    const channel = state.channelStates[multisig];
    // + 1 for the free balance
    return Object.keys(channel.appInstances).length + 1;
  }
}
