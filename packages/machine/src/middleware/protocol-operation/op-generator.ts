import { legacy } from "@counterfactual/cf.js";
import { ethers } from "ethers";

import { APP_INTERFACE, TERMS } from "../../encodings";
import {
  freeBalanceTermsHash,
  getFreeBalanceAppInterfaceHash
} from "../../free-balance-helpers";
import { Context } from "../../instruction-executor";
import { Node } from "../../node";
import { InternalMessage } from "../../types";

import { OpInstall } from "./op-install";
import { OpSetState } from "./op-set-state";
import { OpSetup } from "./op-setup";
import { OpUninstall } from "./op-uninstall";
import { ProtocolOperation } from "./types";

const { defaultAbiCoder, keccak256, Interface, BigNumber } = ethers.utils;
const { AddressZero } = ethers.constants;

export class EthOpGenerator {
  public static generate(
    message: InternalMessage,
    next: Function,
    context: Context,
    node: Node
  ): ProtocolOperation {
    const proposedState = context.intermediateResults.proposedStateTransition!;
    let op;
    if (message.actionName === legacy.node.ActionName.UPDATE) {
      op = this.update(message, context, node, proposedState.state);
    } else if (message.actionName === legacy.node.ActionName.INSTALL) {
      op = this.install(
        message,
        context,
        node,
        proposedState.state,
        proposedState.cfAddr!
      );
    } else if (message.actionName === legacy.node.ActionName.UNINSTALL) {
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
    const multisig: string = message.clientMessage.multisigAddress;
    if (message.clientMessage.appInstanceId === undefined) {
      // FIXME: handle more gracefully
      // https://github.com/counterfactual/monorepo/issues/121
      throw Error("update message must have appId set");
    }
    const appChannel =
      proposedUpdate[multisig].appInstances[
        message.clientMessage.appInstanceId
      ];

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

  public static setup(
    message: InternalMessage,
    node: Node,
    proposedSetup: any
  ): ProtocolOperation {
    const multisig = message.clientMessage.multisigAddress;

    const freeBalance = proposedSetup[multisig].freeBalance;

    // TODO: Review where this is used...
    return new OpSetup(
      node.networkContext,
      multisig,
      [message.clientMessage.fromAddress, message.clientMessage.toAddress],
      {
        owner: multisig,
        signingKeys: [freeBalance.alice, freeBalance.bob],
        appInterfaceHash: getFreeBalanceAppInterfaceHash(
          node.networkContext.AppRegistry
        ),
        termsHash: freeBalanceTermsHash,
        defaultTimeout: 100
      },
      {
        assetType: 0, // ETH,
        limit: ethers.constants.MaxUint256,
        token: AddressZero
      }
    );
  }

  public static install(
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
      // TODO: Replace usage of appChannel with Terms interface obj
      {
        assetType: appChannel.terms.assetType,
        limit: appChannel.terms.limit,
        token: appChannel.terms.token
      },
      {
        owner: multisig,
        signingKeys: [freeBalance.alice, freeBalance.bob],
        appInterfaceHash: keccak256(
          defaultAbiCoder.encode(
            [APP_INTERFACE],
            [
              {
                addr: AddressZero,
                resolve: new Interface([
                  `resolve(
                    tuple(address,address,uint256,uint256),
                    tuple(uint8,uint256,address)
                  )`
                ]).functions.resolve.sighash,
                getTurnTaker: "0x00000000",
                isStateTerminal: "0x00000000",
                applyAction: "0x00000000"
              }
            ]
          )
        ),
        termsHash: keccak256(
          defaultAbiCoder.encode(
            [TERMS],
            [
              {
                assetType: 0,
                // TODO: Note that the limit needs to be limitness
                limit: -1,
                token: AddressZero
              }
            ]
          )
        ),
        defaultTimeout: 100
      },
      {
        assetType: 0,
        // TODO: Note that the limit needs to be limitness
        limit: ethers.constants.MaxUint256,
        token: AddressZero
      },
      keccak256(
        defaultAbiCoder.encode(
          ["address", "address", "uint256", "uint256"],
          [
            newFreeBalance.alice,
            newFreeBalance.bob,
            newFreeBalance.aliceBalance,
            newFreeBalance.bobBalance
          ]
        )
      ),
      newFreeBalance.localNonce,
      newFreeBalance.timeout,
      newFreeBalance.dependencyNonce.salt
    );
  }

  public static uninstall(
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
        appInterfaceHash: keccak256(
          defaultAbiCoder.encode(
            [APP_INTERFACE],
            [
              {
                addr: AddressZero,
                resolve: new Interface([
                  `resolve(
                    tuple(address,address,uint256,uint256),
                    tuple(uint8,uint256,address)
                  )`
                ]).functions.resolve.sighash,
                getTurnTaker: "0x00000000",
                isStateTerminal: "0x00000000",
                applyAction: "0x00000000"
              }
            ]
          )
        ),
        termsHash: keccak256(
          defaultAbiCoder.encode(
            [TERMS],
            [
              {
                assetType: 0,
                // TODO: Note that the limit needs to be limitness
                limit: -1,
                token: AddressZero
              }
            ]
          )
        ),
        defaultTimeout: 100
      },
      {
        assetType: 0,
        // TODO: Note that the limit needs to be limitness
        limit: ethers.constants.MaxUint256,
        token: AddressZero
      },
      keccak256(
        defaultAbiCoder.encode(
          ["address", "address", "uint256", "uint256"],
          [
            newFreeBalance.alice,
            newFreeBalance.bob,
            newFreeBalance.aliceBalance,
            newFreeBalance.bobBalance
          ]
        )
      ),
      newFreeBalance.localNonce,
      newFreeBalance.timeout,
      appChannel.dependencyNonce.salt
    );
    return op;
  }
}
