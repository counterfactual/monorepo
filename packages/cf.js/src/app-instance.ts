import {
  AppABIEncodings,
  AppInstanceInfo,
  AppInstanceJson,
  MultiAssetMultiPartyCoinTransferInterpreterParams,
  Node,
  SolidityValueType,
  TwoPartyFixedOutcomeInterpreterParams
} from "@counterfactual/types";
import { BigNumber } from "ethers/utils";
import EventEmitter from "eventemitter3";

import { Provider } from "./provider";
import { CounterfactualEvent } from "./types";

export enum AppInstanceEventType {
  UPDATE_STATE = "updateState",
  UNINSTALL = "uninstall",
  ERROR = "error"
}

/**
 * Represents an installed app instance
 */
export class AppInstance {
  /**
   * Unique ID of this app instance.
   */
  readonly identityHash: string;

  // Application-specific fields
  readonly appDefinition: string;
  readonly abiEncodings: AppABIEncodings;
  readonly timeout: BigNumber;

  // Funding-related fields
  readonly initiatorDeposit: BigNumber;
  readonly responderDeposit: BigNumber;
  readonly intermediaryIdentifier?: string;

  /**
   * Interpreter-related Fields
   */
  readonly twoPartyOutcomeInterpreterParams?: TwoPartyFixedOutcomeInterpreterParams;
  readonly multiAssetMultiPartyCoinTransferInterpreterParams?: MultiAssetMultiPartyCoinTransferInterpreterParams;

  private readonly eventEmitter: EventEmitter = new EventEmitter();
  private readonly validEventTypes = Object.keys(AppInstanceEventType).map(
    key => AppInstanceEventType[key]
  );

  constructor(
    info: AppInstanceInfo | AppInstanceJson,
    readonly provider: Provider
  ) {
    this.identityHash = info.identityHash;

    if (info["appInterface"] !== undefined) {
      this.appDefinition = info["appInterface"].addr;
      this.abiEncodings = {
        stateEncoding: info["appInterface"].stateEncoding,
        actionEncoding: info["appInterface"].actionEncoding
      };
      this.timeout = info["defaultTimeout"];
    } else {
      this.appDefinition = info["appDefinition"];
      this.abiEncodings = info["abiEncodings"];
      this.timeout = info["timeout"];
    }

    this.initiatorDeposit = info["initiatorDeposit"];
    this.responderDeposit = info["responderDeposit"];
    this.intermediaryIdentifier = info["intermediaryIdentifier"];
  }

  /**
   * Whether this app is virtual i.e. installation was routed through intermediaryIdentifier
   */
  get isVirtual(): boolean {
    return !!this.intermediaryIdentifier;
  }

  /**
   * Get latest state of this app instance
   *
   * @async
   * @return JSON representation of latest state
   */
  async getState(): Promise<SolidityValueType> {
    const response = await this.provider.callRawNodeMethod(
      Node.RpcMethodName.GET_STATE,
      {
        appInstanceId: this.identityHash
      }
    );
    const result = response.result as Node.GetStateResult;
    return result.state;
  }

  /**
   * Take an action on the state, modifying it.
   *
   * @note Throws an error if action is illegal given the latest state.
   *
   * @async
   * @param action Action to take
   * @return JSON representation of latest state after applying the action
   */
  async takeAction(action: SolidityValueType): Promise<SolidityValueType> {
    const response = await this.provider.callRawNodeMethod(
      Node.RpcMethodName.TAKE_ACTION,
      {
        action,
        appInstanceId: this.identityHash
      }
    );
    const result = response.result as Node.TakeActionResult;
    return result.newState;
  }

  // FIXME: uninstall() should return details about payout. What should they look like?
  /**
   * Uninstall this app instance
   *
   * @async
   */
  async uninstall() {
    await this.provider.callRawNodeMethod(
      this.intermediaryIdentifier
        ? Node.RpcMethodName.UNINSTALL_VIRTUAL
        : Node.RpcMethodName.UNINSTALL,
      {
        intermediaryIdentifier: this.intermediaryIdentifier,
        appInstanceId: this.identityHash
      }
    );
  }

  /**
   * Subscribe to event.
   *
   * @param eventType Event type to subscribe to.
   * @param callback Function to be called when event is fired.
   */
  on(
    eventType: AppInstanceEventType,
    callback: (event: CounterfactualEvent) => void
  ) {
    this.validateEventType(eventType);
    this.eventEmitter.on(eventType, callback);
  }

  /**
   * Subscribe to event. Unsubscribe once event is fired once.
   *
   * @param eventType Event type to subscribe to.
   * @param callback Function to be called when event is fired.
   */
  once(
    eventType: AppInstanceEventType,
    callback: (event: CounterfactualEvent) => void
  ) {
    this.validateEventType(eventType);
    this.eventEmitter.once(eventType, callback);
  }

  /**
   * Unsubscribe from event.
   *
   * @param eventType Event type to unsubscribe from.
   * @param callback Original callback passed to subscribe call.
   */
  off(
    eventType: AppInstanceEventType,
    callback: (event: CounterfactualEvent) => void
  ) {
    this.validateEventType(eventType);
    this.eventEmitter.off(eventType, callback);
  }

  /**
   * @ignore
   */
  private validateEventType(eventType: AppInstanceEventType) {
    if (!this.validEventTypes.includes(eventType)) {
      throw new Error(`"${eventType}" is not a valid event`);
    }
  }

  /**
   * @ignore
   */
  emit(eventType: AppInstanceEventType, event: CounterfactualEvent) {
    this.eventEmitter.emit(eventType, event);
  }
}
