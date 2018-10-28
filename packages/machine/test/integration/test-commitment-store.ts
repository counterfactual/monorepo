import { Instruction } from "../../src/instructions";
import {
  CfOperation,
  Transaction
} from "../../src/middleware/cf-operation/types";
import { getFirstResult, getLastResult } from "../../src/middleware/middleware";
import { Context } from "../../src/state";
import {
  ActionName,
  ClientActionMessage,
  InternalMessage
} from "../../src/types";
import { Signature } from "../../src/utils/signature";

import {
  InMemoryKeyValueStore,
  InMemoryKeyValueStoreImpl
} from "./test-key-value-store";

interface Commitments {
  appId: string;
  commitments: Map<ActionName, Transaction>;

  addCommitment(
    action: ActionName,
    cfOperation: CfOperation,
    signatures: Signature[]
  );

  hasCommitment(action: ActionName);

  getTransaction(action: ActionName);
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
    const commitments = new Map<ActionName, Transaction>();
    const commitmentObjects = new Map(JSON.parse(serializedCommitments));
    commitmentObjects.forEach((commitment: any, action) => {
      commitments.set(
        action as ActionName,
        new Transaction(commitment.to, commitment.value, commitment.data)
      );
    });
    return new AppCommitments(appId, commitments);
  }

  public readonly appId: string;
  public readonly commitments: Map<ActionName, Transaction>;

  constructor(
    appId: string,
    commitments: Map<ActionName, Transaction> = new Map()
  ) {
    this.appId = appId;
    this.commitments = commitments;
  }

  /**
   * Adds a commitment for some action on this app.
   * @param action
   * @param cfOperation
   * @param signatures
   */
  public async addCommitment(
    action: ActionName,
    cfOperation: CfOperation,
    signatures: Signature[]
  ) {
    const commitment = cfOperation.transaction(signatures);
    if (action !== ActionName.UPDATE && this.commitments.has(action)) {
      return;
      // FIXME: we should never non-maliciously get to this state
      // https://github.com/counterfactual/monorepo/issues/201
      throw Error("Can't reset setup/install/uninstall commitments");
    }
    this.commitments.set(action, commitment);
  }

  /**
   * Determines whether a given action's commitment has been set
   * @param action
   */
  public async hasCommitment(action: ActionName): Promise<boolean> {
    return this.commitments.has(action);
  }

  /**
   * Gets an action's commitment for this app
   * @param action
   */
  public async getTransaction(action: ActionName): Promise<Transaction> {
    if (this.commitments.has(action)) {
      return this.commitments.get(action)!;
    }
    throw Error(`App ID: ${this.appId} has no ${action} commitment`);
  }

  public serialize(): string {
    // FIXME: This is absurd, we shouldn't even be using a Map for this use case
    // considering that the keys are all strings anyway.
    // https://stackoverflow.com/a/29085474/2680092
    // https://github.com/counterfactual/monorepo/issues/202
    const pairs: [ActionName, Transaction][] = [];
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
    const action: ActionName = internalMessage.actionName;
    const op: CfOperation = getFirstResult(
      Instruction.OP_GENERATE,
      context.results
    ).value;
    let appCommitments: AppCommitments;

    const incomingMessage = this.incomingMessage(internalMessage, context);

    if (action === ActionName.SETUP) {
      appId = internalMessage.clientMessage.multisigAddress;
    } else if (action === ActionName.INSTALL) {
      const proposal = getFirstResult(
        Instruction.STATE_TRANSITION_PROPOSE,
        context.results
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

    const signature: Signature = getFirstResult(
      Instruction.OP_SIGN,
      context.results
    ).value;

    const counterpartySignature = incomingMessage!.signature;
    if (
      counterpartySignature === undefined ||
      signature.toString() === counterpartySignature.toString()
    ) {
      // FIXME: these errors should be handled more gracefully
      // https://github.com/counterfactual/monorepo/issues/203
      throw Error(
        `Cannot make commitment for operation ${action}.
        The counterparty hasn't signed the commitment.`
      );
    }

    const sigs = [signature, counterpartySignature].map(sig => {
      if (!(sig instanceof Signature)) {
        const { v, r, s } = sig as any;
        return new Signature(v, r, s);
      }
      return sig;
    });

    await appCommitments.addCommitment(action, op, sigs);
    this.store.put(appId, Object(appCommitments.serialize()));
    next();
  }

  /**
   * Returns the last message sent from my peer.
   */
  public incomingMessage(
    internalMessage: InternalMessage,
    context: Context
  ): ClientActionMessage | null {
    if (internalMessage.actionName === ActionName.INSTALL) {
      return getLastResult(Instruction.IO_WAIT, context.results).value;
    }
    const incomingMessageResult = getLastResult(
      Instruction.IO_WAIT,
      context.results
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
    action: ActionName
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
    action: ActionName
  ): Promise<boolean> {
    const appCommitments = AppCommitments.deserialize(
      appId,
      this.store.get(appId)
    );
    return this.store.has(appId) && appCommitments.hasCommitment(action);
  }
}
