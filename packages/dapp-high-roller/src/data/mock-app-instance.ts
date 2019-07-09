import { SolidityABIEncoderV2Type } from "@counterfactual/types";
import { BigNumber } from "ethers/utils";

import { Address, AppABIEncodings, AppInstanceInfo, cf, Node } from "./types";

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

  readonly appDefinition: Address;
  readonly abiEncodings: AppABIEncodings;
  readonly myDeposit: BigNumber;
  readonly peerDeposit: BigNumber;
  readonly timeout: BigNumber;
  readonly intermediaries?: Address[];
  //   private readonly eventEmitter: EventEmitter = new EventEmitter();

  constructor(info: AppInstanceInfo, readonly provider: cf.Provider) {
    this.identityHash = info.identityHash;
    this.appDefinition = info.appDefinition;
    this.abiEncodings = info.abiEncodings;
    this.myDeposit = info.myDeposit;
    this.peerDeposit = info.peerDeposit;
    this.timeout = info.timeout;
    this.intermediaries = info.intermediaries;
  }

  /**
   * Whether this app is virtual i.e. installation was routed through intermediaries
   */
  get isVirtual(): boolean {
    return !!(this.intermediaries && this.intermediaries.length !== 0);
  }

  /**
   * Get latest state of this app instance
   *
   * @async
   * @return JSON representation of latest state
   */
  async getState(): Promise<SolidityABIEncoderV2Type> {
    const response = await this.provider.callRawNodeMethod(
      Node.MethodName.GET_STATE,
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
  async takeAction(
    action: SolidityABIEncoderV2Type
  ): Promise<SolidityABIEncoderV2Type> {
    const response = await this.provider.callRawNodeMethod(
      Node.MethodName.TAKE_ACTION,
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
  async uninstall(intermediary?: string) {
    await this.provider.callRawNodeMethod(
      intermediary
        ? Node.MethodName.UNINSTALL_VIRTUAL
        : Node.MethodName.UNINSTALL,
      {
        appInstanceId: this.identityHash,
        intermediaryIdentifier: intermediary
      }
    );
  }

  /**
   * Subscribe to event.
   *
   * @param eventType Event type to subscribe to.
   * @param callback Function to be called when event is fired.
   */
  /*  on(
    eventType: AppInstanceEventType,
    callback: (event: CounterfactualEvent) => void
  ) {
    this.eventEmitter.on(eventType, callback);
  } */

  /**
   * Subscribe to event. Unsubscribe once event is fired once.
   *
   * @param eventType Event type to subscribe to.
   * @param callback Function to be called when event is fired.
   */
  /*   once(
    eventType: AppInstanceEventType,
    callback: (event: CounterfactualEvent) => void
  ) {
    this.eventEmitter.once(eventType, callback);
  } */

  /**
   * Unsubscribe from event.
   *
   * @param eventType Event type to unsubscribe from.
   * @param callback Original callback passed to subscribe call.
   */
  /*   off(
    eventType: AppInstanceEventType,
    callback: (event: CounterfactualEvent) => void
  ) {
    this.eventEmitter.off(eventType, callback);
  } */

  /**
   * @ignore
   */
  /*   emit(eventType: AppInstanceEventType, event: CounterfactualEvent) {
    this.eventEmitter.emit(eventType, event);
  } */
}
