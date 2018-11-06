import * as cf from "@counterfactual/cf.js";
import * as ethers from "ethers";

import { Instruction } from "../../instructions";
import { CfState, Context, StateChannelInfoImpl } from "../../state";
import { InternalMessage, StateProposal } from "../../types";
import { CfAppInstance } from "../cf-operation/types";
import { getLastResult } from "../middleware";

export class InstallProposer {
  public static propose(
    message: InternalMessage,
    context: Context,
    state: CfState
  ): StateProposal {
    const multisig: cf.utils.Address = message.clientMessage.multisigAddress;
    const data: cf.app.InstallData = message.clientMessage.data;
    const app = new cf.app.CfAppInterface(
      data.app.address,
      data.app.applyAction,
      data.app.resolve,
      data.app.getTurnTaker,
      data.app.isStateTerminal,
      data.app.stateEncoding
    );
    const terms = new cf.app.Terms(
      data.terms.assetType,
      data.terms.limit,
      data.terms.token
    );
    const uniqueId = InstallProposer.nextUniqueId(state, multisig);
    const signingKeys = InstallProposer.newSigningKeys(context, data);
    const cfAddr = InstallProposer.proposedCfAddress(
      state,
      message,
      app,
      terms,
      signingKeys,
      uniqueId
    );
    const existingFreeBalance = state.stateChannel(multisig).freeBalance;
    const newAppChannel = InstallProposer.newAppChannel(
      cfAddr,
      data,
      app,
      terms,
      signingKeys,
      uniqueId
    );
    const [peerA, peerB] = InstallProposer.newPeers(existingFreeBalance, data);
    const freeBalance = new cf.utils.CfFreeBalance(
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
      { [newAppChannel.id]: newAppChannel },
      freeBalance
    );

    return {
      cfAddr,
      state: { [multisig]: updatedStateChannel }
    };
  }

  private static newSigningKeys(
    context: Context,
    data: cf.app.InstallData
  ): string[] {
    const lastResult = getLastResult(Instruction.IO_WAIT, context.results);

    let signingKeys;
    if (lastResult && lastResult.value && lastResult.value.data) {
      signingKeys = [lastResult.value.data.keyA, lastResult.value.data.keyB];
    } else {
      signingKeys = [data.keyA!, data.keyB!];
    }

    // TODO: Feels like this is the wrong place for this sorting...
    // https://github.com/counterfactual/monorepo/issues/129
    signingKeys.sort((addrA: cf.utils.Address, addrB: cf.utils.Address) => {
      return new ethers.utils.BigNumber(addrA).lt(addrB) ? -1 : 1;
    });

    return signingKeys;
  }

  private static newAppChannel(
    cfAddr: cf.utils.H256,
    data: cf.app.InstallData,
    app: cf.app.CfAppInterface,
    terms: cf.app.Terms,
    signingKeys: string[],
    uniqueId: number
  ): cf.app.AppInstanceInfo {
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
      dependencyNonce: new cf.utils.CfNonce(false, uniqueId, 0)
    };
  }

  private static proposedCfAddress(
    state: CfState,
    message: InternalMessage,
    app: cf.app.CfAppInterface,
    terms: cf.app.Terms,
    signingKeys: string[],
    uniqueId: number
  ): cf.utils.H256 {
    return new CfAppInstance(
      state.networkContext,
      message.clientMessage.multisigAddress,
      signingKeys,
      app,
      terms,
      message.clientMessage.data.timeout,
      uniqueId
    ).cfAddress();
  }

  private static newPeers(
    existingFreeBalance: cf.utils.CfFreeBalance,
    data: cf.app.InstallData
  ): [cf.utils.PeerBalance, cf.utils.PeerBalance] {
    const peerA = new cf.utils.PeerBalance(
      existingFreeBalance.alice,
      existingFreeBalance.aliceBalance.sub(data.peerA.balance)
    );
    const peerB = new cf.utils.PeerBalance(
      existingFreeBalance.bob,
      existingFreeBalance.bobBalance.sub(data.peerB.balance)
    );
    return [peerA, peerB];
  }

  private static nextUniqueId(
    state: CfState,
    multisig: cf.utils.Address
  ): number {
    const channel = state.channelStates[multisig];
    // + 1 for the free balance
    return Object.keys(channel.appChannels).length + 1;
  }
}
