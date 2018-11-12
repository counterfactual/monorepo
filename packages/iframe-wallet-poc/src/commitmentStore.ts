import * as cf from "@counterfactual/cf.js";
import * as machine from "@counterfactual/machine";
import { ethers } from "ethers";

import {
  InMemoryKeyValueStore,
  InMemoryKeyValueStoreImpl
} from "./localStorage";

interface Commitments {
  appId: string;
  commitments: Map<cf.node.ActionName, machine.protocolTypes.Transaction>;

  addCommitment(
    action: cf.node.ActionName,
    protocolOperation: machine.protocolTypes.ProtocolOperation,
    signatures: ethers.utils.Signature[]
  );

  hasCommitment(action: cf.node.ActionName);

  getTransaction(action: cf.node.ActionName);
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
    const commitments = new Map<
      cf.node.ActionName,
      machine.protocolTypes.Transaction
    >();
    const commitmentObjects = new Map(JSON.parse(serializedCommitments));
    commitmentObjects.forEach((commitment: any, action) => {
      commitments.set(
        action as cf.node.ActionName,
        new machine.protocolTypes.Transaction(
          commitment.to,
          commitment.value,
          commitment.data
        )
      );
    });
    return new AppCommitments(appId, commitments);
  }

  public readonly appId: string;
  public readonly commitments: Map<
    cf.node.ActionName,
    machine.protocolTypes.Transaction
  >;

  constructor(
    appId: string,
    commitments: Map<
      cf.node.ActionName,
      machine.protocolTypes.Transaction
    > = new Map()
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
    action: cf.node.ActionName,
    protocolOperation: machine.protocolTypes.ProtocolOperation,
    signatures: ethers.utils.Signature[]
  ) {
    const commitment = protocolOperation.transaction(signatures);
    if (action !== cf.node.ActionName.UPDATE && this.commitments.has(action)) {
      return;
      // FIXME: we should never non-maliciously get to this state
      throw Error("Can't reset setup/install/uninstall commitments");
    }
    this.commitments.set(action, commitment);
  }

  /**
   * Determines whether a given action's commitment has been set
   * @param action
   */
  public async hasCommitment(action: cf.node.ActionName): Promise<boolean> {
    return this.commitments.has(action);
  }

  /**
   * Gets an action's commitment for this app
   * @param action
   */
  public async getTransaction(
    action: cf.node.ActionName
  ): Promise<machine.protocolTypes.Transaction> {
    if (this.commitments.has(action)) {
      return this.commitments.get(action)!;
    }
    throw Error(`App ID: ${this.appId} has no ${action} commitment`);
  }

  public serialize(): string {
    // FIXME: This is absurd, we shouldn't even be using a Map for this use case
    // considering that the keys are all strings anyway.
    // https://stackoverflow.com/a/29085474/2680092
    const pairs: [cf.node.ActionName, machine.protocolTypes.Transaction][] = [];
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
export class CommitmentStore {
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
    internalMessage: machine.types.InternalMessage,
    next: Function,
    context: machine.instructionExecutor.Context
  ) {
    let appId;
    const action: cf.node.ActionName = internalMessage.actionName;
    const op: machine.protocolTypes.ProtocolOperation = machine.middleware.getFirstResult(
      machine.instructions.Opcode.OP_GENERATE,
      context.results2
    ).value;
    let appCommitments: AppCommitments;

    const incomingMessage = this.incomingMessage(internalMessage, context);

    if (action === cf.node.ActionName.SETUP) {
      appId = internalMessage.clientMessage.multisigAddress;
    } else if (action === cf.node.ActionName.INSTALL) {
      const proposal = machine.middleware.getFirstResult(
        machine.instructions.Opcode.STATE_TRANSITION_PROPOSE,
        context.results2
      ).value;
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

    const signature: ethers.utils.Signature = machine.middleware.getFirstResult(
      machine.instructions.Opcode.OP_SIGN,
      context.results2
    ).value;

    const counterpartySignature = incomingMessage!.signature!;
    const signatureHex = cf.utils.signaturesToBytes(signature);
    const counterpartySignatureHex = cf.utils.signaturesToBytes(
      counterpartySignature
    );
    if (
      counterpartySignature === undefined ||
      signatureHex === counterpartySignatureHex
    ) {
      // FIXME: these errors should be handled more gracefully
      throw Error(
        `Cannot make commitment for operation: ${action}. The counterparty hasn't signed the commitment`
      );
    }

    await appCommitments.addCommitment(action, op, [
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
    internalMessage: machine.types.InternalMessage,
    context: machine.instructionExecutor.Context
  ): cf.node.ClientActionMessage | null {
    if (internalMessage.actionName === cf.node.ActionName.INSTALL) {
      return machine.middleware.getLastResult(
        machine.instructions.Opcode.IO_WAIT,
        context.results2
      ).value;
    }
    const incomingMessageResult = machine.middleware.getLastResult(
      machine.instructions.Opcode.IO_WAIT,
      context.results2
    );
    if (JSON.stringify(incomingMessageResult) === JSON.stringify({})) {
      // receiver since non installs should have no io_WAIT
      return internalMessage.clientMessage;
    }
    // sender so grab out the response
    return incomingMessageResult.value;
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
    action: cf.node.ActionName
  ): Promise<machine.protocolTypes.Transaction> {
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
    action: cf.node.ActionName
  ): Promise<boolean> {
    const appCommitments = AppCommitments.deserialize(
      appId,
      this.store.get(appId)
    );
    return this.store.has(appId) && appCommitments.hasCommitment(action);
  }
}
