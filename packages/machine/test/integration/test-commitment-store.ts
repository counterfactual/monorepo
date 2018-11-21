import * as cf from "@counterfactual/cf.js";
import { ethers } from "ethers";

import { Context } from "../../src/instruction-executor";
import {
  ProtocolOperation,
  Transaction
} from "../../src/middleware/protocol-operation/types";
import { InternalMessage } from "../../src/types";

import {
  InMemoryKeyValueStore,
  InMemoryKeyValueStoreImpl
} from "./test-key-value-store";

interface Commitments {
  appId: string;
  commitments: Map<cf.legacy.node.ActionName, Transaction>;

  addCommitment(
    action: cf.legacy.node.ActionName,
    protocolOperation: ProtocolOperation,
    signatures: ethers.utils.Signature[]
  );

  hasCommitment(action: cf.legacy.node.ActionName);

  getTransaction(action: cf.legacy.node.ActionName);
}

/**
 * AppCommitment holds the Commitments for install, update, and uninstall of apps
 * which by definition includes the signatures over the operation
 * Refer to: https://github.com/counterfactual/machine/blob/master/specs/counterfactual-protocols.md#commitments
 */
export class AppCommitments implements Commitments {
  public static deserialize(
    appId: string,
    serializedCommitments: string
  ): AppCommitments {
    const commitments = new Map<cf.legacy.node.ActionName, Transaction>();
    const commitmentObjects = new Map(JSON.parse(serializedCommitments));
    commitmentObjects.forEach((commitment: any, action) => {
      commitments.set(
        action as cf.legacy.node.ActionName,
        new Transaction(commitment.to, commitment.value, commitment.data)
      );
    });
    return new AppCommitments(appId, commitments);
  }

  public readonly appId: string;
  public readonly commitments: Map<cf.legacy.node.ActionName, Transaction>;

  constructor(
    appId: string,
    commitments: Map<cf.legacy.node.ActionName, Transaction> = new Map()
  ) {
    this.appId = appId;
    this.commitments = commitments;
  }

  /**
   * Adds a commitment for some action on this app.
   * @param action
   * @param protocolOperation
   * @param signatures
   */
  public async addCommitment(
    action: cf.legacy.node.ActionName,
    protocolOperation: ProtocolOperation,
    signatures: ethers.utils.Signature[]
  ) {
    const commitment = protocolOperation.transaction(signatures);
    if (
      action !== cf.legacy.node.ActionName.UPDATE &&
      this.commitments.has(action)
    ) {
      return;
      // FIXME: we should never non-maliciously get to this state
      // https://github.com/counterfactual/monorepo/issues/101
      throw Error("Can't reset setup/install/uninstall commitments");
    }
    this.commitments.set(action, commitment);
  }

  /**
   * Determines whether a given action's commitment has been set
   * @param action
   */
  public async hasCommitment(
    action: cf.legacy.node.ActionName
  ): Promise<boolean> {
    return this.commitments.has(action);
  }

  /**
   * Gets an action's commitment for this app
   * @param action
   */
  public async getTransaction(
    action: cf.legacy.node.ActionName
  ): Promise<Transaction> {
    if (this.commitments.has(action)) {
      return this.commitments.get(action)!;
    }
    throw Error(`App ID: ${this.appId} has no ${action} commitment`);
  }

  public serialize(): string {
    // FIXME: This is absurd, we shouldn't even be using a Map for this use case
    // considering that the keys are all strings anyway.
    // https://stackoverflow.com/a/29085474/2680092
    // https://github.com/counterfactual/monorepo/issues/100
    const pairs: [cf.legacy.node.ActionName, Transaction][] = [];
    this.commitments.forEach((v, k) => {
      pairs.push([k, v]);
    });
    return JSON.stringify(pairs);
  }
}

/**
 * The store is a mapping of appId to the three types of actions for an app:
 * - install
 * - update
 * - uninstall
 * Each action has a cf operation which encapsulates both the actual
 * operation and the data that's being operated on.
 */
export class TestCommitmentStore {
  public store: InMemoryKeyValueStore;
  private appCount: number;

  constructor() {
    this.appCount = 0;
    this.store = new InMemoryKeyValueStoreImpl();
  }

  /**
   * Sets the commitment at the end of a protocol's execution.
   * @param internalMessage
   * @param next
   * @param context
   * @throws Error if the counterparty's signature is not set
   */
  public async setCommitment(
    internalMessage: InternalMessage,
    next: Function,
    context: Context
  ) {
    let appId;
    const action: cf.legacy.node.ActionName = internalMessage.actionName;
    const operation = context.intermediateResults.operation!;
    let appCommitments: AppCommitments;

    const incomingMessage = this.incomingMessage(internalMessage, context);

    if (action === cf.legacy.node.ActionName.SETUP) {
      appId = internalMessage.clientMessage.multisigAddress;
    } else if (action === cf.legacy.node.ActionName.INSTALL) {
      const proposal = context.intermediateResults.proposedStateTransition!;
      appId = proposal.cfAddr;
    } else {
      appId = internalMessage.clientMessage.appId;
    }

    if (this.store.has(appId)) {
      appCommitments = AppCommitments.deserialize(appId, this.store.get(appId));
    } else {
      appCommitments = new AppCommitments(appId);
      this.appCount += 1;
      this.store.put(appId, Object(appCommitments.serialize()));
    }

    const signature = context.intermediateResults.signature!;

    const counterpartySignature = incomingMessage!.signature!;
    if (
      counterpartySignature === undefined ||
      cf.utils.signaturesToBytes(signature) ===
        cf.utils.signaturesToBytes(counterpartySignature)
    ) {
      // FIXME: these errors should be handled more gracefully
      // https://github.com/counterfactual/monorepo/issues/99
      throw Error(
        `Cannot make commitment for operation ${action}.
        The counterparty hasn't signed the commitment.`
      );
    }

    await appCommitments.addCommitment(action, operation, [
      signature,
      counterpartySignature
    ]);
    this.store.put(appId, Object(appCommitments.serialize()));
    next();
  }

  /**
   * Returns the last message sent from my peer.
   */
  public incomingMessage(
    internalMessage: InternalMessage,
    context: Context
  ): cf.legacy.node.ClientActionMessage | null {
    if (internalMessage.actionName === cf.legacy.node.ActionName.INSTALL) {
      return context.intermediateResults.inbox!;
    }
    const incomingMessageResult = context.intermediateResults.inbox!;
    if (incomingMessageResult === undefined) {
      // receiver since non installs should have no io_WAIT
      return internalMessage.clientMessage;
    }
    // sender so grab out the response
    return incomingMessageResult;
  }

  /**
   * Given an app ID, returns the signed transaction representing the action
   * operating over the specified app.
   * @param appId
   * @param action
   * @throws Error If appId doesn't exist in the store
   * @throws Error if action doesn't exist for the app
   */
  public async getTransaction(
    appId: string,
    action: cf.legacy.node.ActionName
  ): Promise<Transaction> {
    if (!this.store.has(appId)) {
      throw Error("Invalid app id");
    }
    const appCommitments = AppCommitments.deserialize(
      appId,
      this.store.get(appId)
    );

    return appCommitments.getTransaction(action);
  }

  public getAppCount(): number {
    return this.appCount;
  }

  public appExists(appId: string): boolean {
    return this.store.has(appId);
  }

  public async appHasCommitment(
    appId: string,
    action: cf.legacy.node.ActionName
  ): Promise<boolean> {
    const appCommitments = AppCommitments.deserialize(
      appId,
      this.store.get(appId)
    );
    return this.store.has(appId) && appCommitments.hasCommitment(action);
  }
}
