import { legacy } from "@counterfactual/cf.js";
import { ethers } from "ethers";

import { Context } from "../../instruction-executor";
import { Node } from "../../node";
import { InternalMessage } from "../../types";
import {
  encodeFreeBalanceState,
  freeBalanceTerms,
  freeBalanceTermsHash,
  getFreeBalanceAppInterfaceHash
} from "../../utils/free-balance";

import { OpInstall } from "./op-install";
import { OpSetState } from "./op-set-state";
import { OpSetup } from "./op-setup";
import { OpUninstall } from "./op-uninstall";
import { ProtocolOperation } from "./types";

const { keccak256, BigNumber } = ethers.utils;

// TODO: de-class-ify this ... no need for it to be a class
export class EthOpGenerator {
  public static generate(
    message: InternalMessage,
    next: Function,
    context: Context,
    node: Node
  ): ProtocolOperation {
    const proposedState = context.proposedStateTransition!;

    switch (message.actionName) {
      case legacy.node.ActionName.SETUP:
        return constructSetupOp(message, node, proposedState.state);

      case legacy.node.ActionName.UPDATE:
        return constructUpdateOp(message, context, node, proposedState.state);

      case legacy.node.ActionName.INSTALL:
        return constructInstallOp(
          message,
          context,
          node,
          proposedState.state,
          proposedState.cfAddr!
        );

      case legacy.node.ActionName.UNINSTALL:
        return constructUninstallOp(
          message,
          context,
          node,
          proposedState.state
        );

      default:
        throw Error("???");
    }
  }
}

export function constructUpdateOp(
  message: InternalMessage,
  context: Context,
  node: Node,
  proposedUpdate: any
): ProtocolOperation {
  const multisig: string = message.clientMessage.multisigAddress;

  if (message.clientMessage.appInstanceId === undefined) {
    // FIXME: handle more gracefully
    // https://github.com/counterfactual/monorepo/issues/121
    throw Error("update message must have appId set");
  }

  const appChannel =
    proposedUpdate[multisig].appInstances[message.clientMessage.appInstanceId];

  // TODO: ensure these members are typed instead of having to reconstruct
  // class instances
  // https://github.com/counterfactual/monorepo/issues/135
  appChannel.cfApp = new legacy.app.AppInterface(
    appChannel.cfApp.address,
    appChannel.cfApp.applyAction,
    appChannel.cfApp.resolve,
    appChannel.cfApp.getTurnTaker,
    appChannel.cfApp.isStateTerminal,
    appChannel.cfApp.abiEncoding
  );

  appChannel.terms = new legacy.app.Terms(
    appChannel.terms.assetType,
    appChannel.terms.limit,
    appChannel.terms.token
  );

  const signingKeys = [
    message.clientMessage.fromAddress,
    message.clientMessage.toAddress
  ];

  // FIXME: shouldn't be here...
  signingKeys.sort((addrA: string, addrB: string) => {
    return new BigNumber(addrA).lt(addrB) ? -1 : 1;
  });

  return new OpSetState(
    node.networkContext,
    {
      signingKeys,
      owner: multisig,
      appInterfaceHash: appChannel.appInterfaceHash,
      termsHash: appChannel.termsHash,
      defaultTimeout: appChannel.timeout
    },
    appChannel.appStateHash,
    appChannel.localNonce,
    appChannel.timeout
  );
}

// TODO: why isn't this used?
export function constructSetupOp(
  message: InternalMessage,
  node: Node,
  proposedSetup: any
): ProtocolOperation {
  const multisig = message.clientMessage.multisigAddress;

  const freeBalance = proposedSetup[multisig].freeBalance;

  // Ideally we can skip this to the very end. Maybe in the Op layr?
  const sortedKeys = [
    message.clientMessage.fromAddress,
    message.clientMessage.toAddress
  ].sort((a, b) => (parseInt(a, 16) < parseInt(b, 16) ? -1 : 1));

  return new OpSetup(
    node.networkContext,
    multisig,
    sortedKeys,
    {
      owner: multisig,
      signingKeys: [freeBalance.alice, freeBalance.bob],
      appInterfaceHash: getFreeBalanceAppInterfaceHash(
        node.networkContext.ETHBucket
      ),
      termsHash: freeBalanceTermsHash,
      defaultTimeout: 100
    },
    freeBalanceTerms
  );
}

export function constructInstallOp(
  message: InternalMessage,
  context: Context,
  node: Node,
  proposedInstall: legacy.channel.StateChannelInfos,
  cfAddr: string
) {
  const channel = proposedInstall[message.clientMessage.multisigAddress];
  const freeBalance = channel.freeBalance;
  const multisig = message.clientMessage.multisigAddress;
  const appChannel = channel.appInstances[cfAddr];

  const appIdentity = {
    owner: multisig,
    signingKeys: [appChannel.keyA!, appChannel.keyB!],
    appInterfaceHash: appChannel.cfApp.hash(),
    termsHash: appChannel.terms.hash(),
    defaultTimeout: appChannel.timeout
  };

  const newFreeBalance = new legacy.utils.FreeBalance(
    freeBalance.alice,
    freeBalance.aliceBalance,
    freeBalance.bob,
    freeBalance.bobBalance,
    freeBalance.uniqueId,
    // TODO: Note down how important this is!!!!
    freeBalance.localNonce + 1,
    freeBalance.timeout,
    freeBalance.dependencyNonce
  );

  return new OpInstall(
    node.networkContext,
    multisig,
    [message.clientMessage.fromAddress, message.clientMessage.toAddress],
    appIdentity,
    appChannel.terms,
    {
      owner: multisig,
      signingKeys: [freeBalance.alice, freeBalance.bob],
      appInterfaceHash: getFreeBalanceAppInterfaceHash(
        node.networkContext.ETHBucket
      ),
      termsHash: freeBalanceTermsHash,
      defaultTimeout: 100
    },
    freeBalanceTerms,
    keccak256(encodeFreeBalanceState(newFreeBalance)),
    newFreeBalance.localNonce,
    newFreeBalance.timeout,
    newFreeBalance.dependencyNonce.salt
  );
}

export function constructUninstallOp(
  message: InternalMessage,
  context: Context,
  node: Node,
  proposedUninstall: any
): ProtocolOperation {
  const multisig: string = message.clientMessage.multisigAddress;

  const cfAddr = message.clientMessage.appInstanceId;

  if (cfAddr === undefined) {
    throw new Error("update message must have appId set");
  }

  const freeBalance = proposedUninstall[multisig].freeBalance;
  const appChannel = proposedUninstall[multisig].appInstances[cfAddr];

  const newFreeBalance = new legacy.utils.FreeBalance(
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
    node.networkContext,
    multisig,
    [message.clientMessage.fromAddress, message.clientMessage.toAddress],
    {
      owner: multisig,
      signingKeys: [freeBalance.alice, freeBalance.bob],
      appInterfaceHash: getFreeBalanceAppInterfaceHash(
        node.networkContext.ETHBucket
      ),
      termsHash: freeBalanceTermsHash,
      defaultTimeout: 100
    },
    freeBalanceTerms,
    keccak256(encodeFreeBalanceState(newFreeBalance)),
    newFreeBalance.localNonce,
    newFreeBalance.timeout,
    appChannel.dependencyNonce.salt
  );
  return op;
}
