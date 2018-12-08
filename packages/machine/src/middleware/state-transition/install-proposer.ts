import { legacy } from "@counterfactual/cf.js";
import { ethers } from "ethers";

import { Context } from "../../instruction-executor";
import { Node, StateChannelInfoImpl } from "../../node";
import { InternalMessage, StateProposal } from "../../types";
import { appIdentityToHash } from "../../utils/app-identity";
import { APP_INTERFACE, TERMS } from "../../utils/encodings";

const { keccak256, defaultAbiCoder } = ethers.utils;

export class InstallProposer {
  public static propose(
    message: InternalMessage,
    context: Context,
    node: Node
  ): StateProposal {
    const data: legacy.app.InstallData = message.clientMessage.data;

    const app = new legacy.app.AppInterface(
      data.app.address,
      data.app.applyAction,
      data.app.resolve,
      data.app.getTurnTaker,
      data.app.isStateTerminal,
      data.app.stateEncoding
    );

    const terms = new legacy.app.Terms(
      data.terms.assetType,
      data.terms.limit,
      data.terms.token
    );

    const uniqueId = InstallProposer.nextUniqueId(
      node,
      message.clientMessage.multisigAddress
    );

    const signingKeys = InstallProposer.newSigningKeys(context, data);

    // FIXME: Should change the class
    message.clientMessage.data.app.addr =
      message.clientMessage.data.app.address;

    const cfAddr = appIdentityToHash({
      owner: message.clientMessage.multisigAddress,
      signingKeys: [
        message.clientMessage.data.keyA,
        message.clientMessage.data.keyB
      ],
      appInterfaceHash: keccak256(
        defaultAbiCoder.encode(
          [APP_INTERFACE],
          [message.clientMessage.data.app]
        )
      ),
      termsHash: keccak256(defaultAbiCoder.encode([TERMS], [data.terms])),
      defaultTimeout: data.timeout
    });

    const existingFreeBalance = node.stateChannel(
      message.clientMessage.multisigAddress
    ).freeBalance;

    const newAppInstance = {
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
      dependencyNonce: new legacy.utils.Nonce(false, uniqueId, 0)
    };

    const [peerA, peerB] = InstallProposer.newPeers(existingFreeBalance, data);

    const freeBalance = new legacy.utils.FreeBalance(
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
      message.clientMessage.multisigAddress,
      { [newAppInstance.id]: newAppInstance },
      freeBalance
    );

    return {
      cfAddr,
      state: { [message.clientMessage.multisigAddress]: updatedStateChannel }
    };
  }

  private static newSigningKeys(
    context: Context,
    data: legacy.app.InstallData
  ): string[] {
    const signingKeys = [data.keyA!, data.keyB!];

    // TODO: Feels like this is the wrong place for this sorting...
    // https://github.com/counterfactual/monorepo/issues/129
    signingKeys.sort(
      (addrA: legacy.utils.Address, addrB: legacy.utils.Address) => {
        return new ethers.utils.BigNumber(addrA).lt(addrB) ? -1 : 1;
      }
    );

    return signingKeys;
  }

  private static newPeers(
    existingFreeBalance: legacy.utils.FreeBalance,
    data: legacy.app.InstallData
  ): [legacy.utils.PeerBalance, legacy.utils.PeerBalance] {
    const peerA = new legacy.utils.PeerBalance(
      existingFreeBalance.alice,
      existingFreeBalance.aliceBalance.sub(data.peerA.balance)
    );
    const peerB = new legacy.utils.PeerBalance(
      existingFreeBalance.bob,
      existingFreeBalance.bobBalance.sub(data.peerB.balance)
    );
    return [peerA, peerB];
  }

  private static nextUniqueId(
    state: Node,
    multisig: legacy.utils.Address
  ): number {
    const channel = state.channelStates[multisig];
    // + 1 for the free balance
    return Object.keys(channel.appInstances).length + 1;
  }
}
