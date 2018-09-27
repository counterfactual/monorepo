import * as ethers from "ethers";
import { Instruction } from "../../instructions";
import { CfState, Context, StateChannelInfoImpl } from "../../state";
import {
  Address,
  AppChannelInfo,
  H256,
  InstallData,
  InternalMessage,
  PeerBalance,
  StateProposal
} from "../../types";
import {
  CfAppInterface,
  CfFreeBalance,
  CfNonce,
  CfStateChannel,
  Terms
} from "../cf-operation/types";
import { getLastResult } from "../middleware";

export class InstallProposer {
  public static propose(
    message: InternalMessage,
    context: Context,
    state: CfState
  ): StateProposal {
    const multisig: Address = message.clientMessage.multisigAddress;
    const data: InstallData = message.clientMessage.data;
    const app = new CfAppInterface(
      data.app.address,
      data.app.applyAction,
      data.app.resolve,
      data.app.getTurnTaker,
      data.app.isStateTerminal,
      data.app.abiEncoding
    );
    const terms = new Terms(
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
    const freeBalance = new CfFreeBalance(
      peerA.address,
      peerA.balance,
      peerB.address,
      peerB.balance,
      existingFreeBalance.uniqueId,
      existingFreeBalance.localNonce + 1,
      data.timeout,
      existingFreeBalance.nonce
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

  private static newSigningKeys(context: Context, data: InstallData): string[] {
    const lastResult = getLastResult(Instruction.IO_WAIT, context.results);

    if (lastResult && lastResult.value && lastResult.value.data) {
      return [lastResult.value.data.keyA, lastResult.value.data.keyB];
    } else {
      return [data.keyA!, data.keyB!];
    }
  }

  private static newAppChannel(
    cfAddr: H256,
    data: InstallData,
    app: CfAppInterface,
    terms: Terms,
    signingKeys: string[],
    uniqueId: number
  ): AppChannelInfo {
    return {
      id: cfAddr,
      uniqueId,
      peerA: data.peerA,
      peerB: data.peerB,
      keyA: signingKeys[0],
      keyB: signingKeys[1],
      encodedState: data.encodedAppState,
      localNonce: 1,
      timeout: data.timeout,
      terms,
      cfApp: app,
      dependencyNonce: new CfNonce(uniqueId, 1)
    };
  }

  private static proposedCfAddress(
    state: CfState,
    message: InternalMessage,
    app: CfAppInterface,
    terms: Terms,
    signingKeys: string[],
    uniqueId: number
  ): H256 {
    return new CfStateChannel(
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
    existingFreeBalance: CfFreeBalance,
    data: InstallData
  ): [PeerBalance, PeerBalance] {
    const peerA = new PeerBalance(
      existingFreeBalance.alice,
      existingFreeBalance.aliceBalance.sub(data.peerA.balance)
    );
    const peerB = new PeerBalance(
      existingFreeBalance.bob,
      existingFreeBalance.bobBalance.sub(data.peerB.balance)
    );
    return [peerA, peerB];
  }

  private static nextUniqueId(state: CfState, multisig: Address): number {
    const channel = state.channelStates[multisig];
    // + 1 for the free balance
    return Object.keys(channel.appChannels).length + 1;
  }
}
