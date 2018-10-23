import * as machine from "@counterfactual/machine";
import {
  InMemoryKeyValueStore,
  InMemoryKeyValueStoreImpl
} from "./localStorage";

interface Commitments {
  appId: string;
  commitments: Map<machine.types.ActionName, machine.cfTypes.Transaction>;

  addCommitment(
    action: machine.types.ActionName,
    cfOperation: machine.cfTypes.CfOperation,
    signatures: machine.types.Signature[]
  );

  hasCommitment(action: machine.types.ActionName);

  getTransaction(action: machine.types.ActionName);
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
      machine.types.ActionName,
      machine.cfTypes.Transaction
    >();
    const commitmentObjects = new Map(JSON.parse(serializedCommitments));
    commitmentObjects.forEach((commitment: any, action) => {
      commitments.set(
        action as machine.types.ActionName,
        new machine.cfTypes.Transaction(
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
    machine.types.ActionName,
    machine.cfTypes.Transaction
  >;

  constructor(
    appId: string,
    commitments: Map<
      machine.types.ActionName,
      machine.cfTypes.Transaction
    > = new Map()
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
    action: machine.types.ActionName,
    cfOperation: machine.cfTypes.CfOperation,
    signatures: machine.types.Signature[]
  ) {
    const commitment = cfOperation.transaction(signatures);
    if (
      action !== machine.types.ActionName.UPDATE &&
      this.commitments.has(action)
    ) {
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
  public async hasCommitment(
    action: machine.types.ActionName
  ): Promise<boolean> {
    return this.commitments.has(action);
  }

  /**
   * Gets an action's commitment for this app
   * @param action
   */
  public async getTransaction(
    action: machine.types.ActionName
  ): Promise<machine.cfTypes.Transaction> {
    if (this.commitments.has(action)) {
      return this.commitments.get(action)!;
    }
    throw Error("App ID: " + this.appId + " has no " + action + " commitment");
  }

  public serialize(): string {
    // FIXME: This is absurd, we shouldn't even be using a Map for this use case
    // considering that the keys are all strings anyway.
    // https://stackoverflow.com/a/29085474/2680092
    const pairs: [machine.types.ActionName, machine.cfTypes.Transaction][] = [];
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
    context: machine.state.Context
  ) {
    let appId;
    const action: machine.types.ActionName = internalMessage.actionName;
    const op: machine.cfTypes.CfOperation = machine.middleware.getFirstResult(
      machine.instructions.Instruction.OP_GENERATE,
      context.results
    ).value;
    let appCommitments: AppCommitments;

    const incomingMessage = this.incomingMessage(internalMessage, context);

    if (action === machine.types.ActionName.SETUP) {
      appId = internalMessage.clientMessage.multisigAddress;
    } else if (action === machine.types.ActionName.INSTALL) {
      const proposal = machine.middleware.getFirstResult(
        machine.instructions.Instruction.STATE_TRANSITION_PROPOSE,
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

    const signature: machine.types.Signature = machine.middleware.getFirstResult(
      machine.instructions.Instruction.OP_SIGN,
      context.results
    ).value;

    const counterpartySignature = incomingMessage!.signature;
    if (
      counterpartySignature === undefined ||
      signature.toString() === counterpartySignature.toString()
    ) {
      // FIXME: these errors should be handled more gracefully
      throw Error(
        "Cannot make commitment for operation: " +
          action +
          ". The counterparty hasn't signed the commitment"
      );
    }

    const sigs = [signature, counterpartySignature].map(sig => {
      if (!(sig instanceof machine.types.Signature)) {
        const { v, r, s } = sig as any;
        return new machine.types.Signature(v, r, s);
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
    internalMessage: machine.types.InternalMessage,
    context: machine.state.Context
  ): machine.types.ClientActionMessage | null {
    if (internalMessage.actionName === machine.types.ActionName.INSTALL) {
      return machine.middleware.getLastResult(
        machine.instructions.Instruction.IO_WAIT,
        context.results
      ).value;
    } else {
      const incomingMessageResult = machine.middleware.getLastResult(
        machine.instructions.Instruction.IO_WAIT,
        context.results
      );
      if (JSON.stringify(incomingMessageResult) === JSON.stringify({})) {
        // receiver since non installs should have no io_WAIT
        return internalMessage.clientMessage;
      } else {
        // sender so grab out the response
        return incomingMessageResult.value;
      }
    }
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
    action: machine.types.ActionName
  ): Promise<machine.cfTypes.Transaction> {
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
    action: machine.types.ActionName
  ): Promise<boolean> {
    const appCommitments = AppCommitments.deserialize(
      appId,
      this.store.get(appId)
    );
    return this.store.has(appId) && appCommitments.hasCommitment(action);
  }
}
