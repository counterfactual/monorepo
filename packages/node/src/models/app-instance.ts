import CounterfactualApp from "@counterfactual/contracts/build/CounterfactualApp.json";
import {
  AppIdentity,
  AppInstanceJson,
  AppInterface,
  CoinTransferInterpreterParams,
  OutcomeType,
  SolidityABIEncoderV2Type,
  TwoPartyFixedOutcomeInterpreterParams
} from "@counterfactual/types";
import { Contract } from "ethers";
import { BaseProvider } from "ethers/providers";
import {
  BigNumber,
  bigNumberify,
  defaultAbiCoder,
  keccak256
} from "ethers/utils";
import { Memoize } from "typescript-memoize";

import { appIdentityToHash } from "../ethereum/utils/app-identity";

/**
 * Representation of an AppInstance.
 *
 * @property multisigAddress The address of the multisignature wallet on-chain for
 *           the state channel that holds the state this AppInstance controls.

 * @property participants The sorted array of public keys used by the users of
 *           this AppInstance for which n-of-n consensus is needed on updates.

 * @property defaultTimeout The default timeout used when a new update is made.

 * @property appInterface An AppInterface object representing the logic this
 *           AppInstance relies on for verifying and proposing state updates.

 * @property isVirtualApp A flag indicating whether this AppInstance's state
 *           deposits come directly from a multisig or through a virtual app
 *           proxy agreement.

 * @property latestState The unencoded representation of the latest state.

 * @property latestVersionNumber The versionNumber of the latest signed state update.

 * @property latestTimeout The timeout used in the latest signed state update.

 * @property coinTransferInterpreterParams The limit / maximum amount of funds
 *           to be distributed for an app where the interpreter type is COIN_TRANSFER

 * @property twoPartyOutcomeInterpreterParams Addresses of the two beneficiaries
 *           and the amount that is to be distributed for an app
 *           where the interpreter type is TWO_PARTY_FIXED_OUTCOME
 */
export class AppInstance {
  constructor(
    public readonly multisigAddress: string,
    public readonly participants: string[],
    public readonly defaultTimeout: number,
    public readonly appInterface: AppInterface,
    public readonly isVirtualApp: boolean,
    public readonly appSeqNo: number,
    public readonly latestState: any,
    public readonly latestVersionNumber: number,
    public readonly latestTimeout: number,
    public readonly outcomeType: OutcomeType,
    public readonly twoPartyOutcomeInterpreterParams?: TwoPartyFixedOutcomeInterpreterParams,
    public readonly coinTransferInterpreterParams?: CoinTransferInterpreterParams
  ) {}

  public static fromJson(json: AppInstanceJson) {
    const serialized = JSON.parse(JSON.stringify(json), (
      // @ts-ignore
      key,
      val
    ) => (val["_hex"] ? bigNumberify(val) : val));
    return new AppInstance(
      serialized.multisigAddress,
      serialized.participants,
      serialized.defaultTimeout,
      serialized.appInterface,
      serialized.isVirtualApp,
      serialized.appSeqNo,
      serialized.latestState,
      serialized.latestVersionNumber,
      serialized.latestTimeout,
      serialized.outcomeType,
      serialized.twoPartyOutcomeInterpreterParams,
      serialized.coinTransferInterpreterParams
    );
  }

  public toJson(): AppInstanceJson {
    // removes any fields which have an `undefined` value, as that's invalid JSON
    // an example would be having an `undefined` value for the `actionEncoding`
    // of an AppInstance that's not turn based
    return JSON.parse(
      JSON.stringify({
        multisigAddress: this.multisigAddress,
        participants: this.participants,
        defaultTimeout: this.defaultTimeout,
        appInterface: this.appInterface,
        isVirtualApp: this.isVirtualApp,
        appSeqNo: this.appSeqNo,
        latestState: this.latestState,
        latestVersionNumber: this.latestVersionNumber,
        latestTimeout: this.latestTimeout,
        outcomeType: this.outcomeType,
        twoPartyOutcomeInterpreterParams: this.twoPartyOutcomeInterpreterParams,
        coinTransferInterpreterParams: this.coinTransferInterpreterParams,
        identityHash: this.identityHash
      }),
      (
        // @ts-ignore
        key,
        val
      ) => (BigNumber.isBigNumber(val) ? { _hex: val.toHexString() } : val)
    );
  }

  @Memoize()
  public get identityHash() {
    return appIdentityToHash(this.identity);
  }

  @Memoize()
  public get identity(): AppIdentity {
    return {
      participants: this.participants,
      appDefinition: this.appInterface.addr,
      defaultTimeout: this.defaultTimeout,
      channelNonce: this.appSeqNo
    };
  }

  @Memoize()
  public get hashOfLatestState() {
    return keccak256(this.encodedLatestState);
  }

  @Memoize()
  public get encodedLatestState() {
    return defaultAbiCoder.encode(
      [this.appInterface.stateEncoding],
      [this.latestState]
    );
  }

  public get state() {
    return this.latestState;
  }

  public get versionNumber() {
    return this.latestVersionNumber;
  }

  public get timeout() {
    return this.latestTimeout;
  }

  public setState(
    newState: SolidityABIEncoderV2Type,
    timeout: number = this.defaultTimeout
  ) {
    try {
      defaultAbiCoder.encode([this.appInterface.stateEncoding], [newState]);
    } catch (e) {
      // TODO: Catch ethers.errors.INVALID_ARGUMENT specifically in catch {}
      console.error(
        "Attempted to setState on an app with an invalid state object"
      );
      throw e;
    }

    return AppInstance.fromJson({
      ...this.toJson(),
      latestState: newState,
      latestVersionNumber: this.versionNumber + 1,
      latestTimeout: timeout
    });
  }

  public async computeOutcome(
    state: SolidityABIEncoderV2Type,
    provider: BaseProvider
  ): Promise<string> {
    return await this.toEthersContract(provider).functions.computeOutcome(
      this.encodeState(state)
    );
  }

  public async computeStateTransition(
    action: SolidityABIEncoderV2Type,
    provider: BaseProvider
  ): Promise<SolidityABIEncoderV2Type> {
    const ret: SolidityABIEncoderV2Type = {};

    const computedNextState = this.decodeAppState(
      await this.toEthersContract(provider).functions.applyAction(
        this.encodedLatestState,
        this.encodeAction(action)
      )
    );

    // ethers returns an array of [ <each value by idx>, <each value by key> ]
    // so we need to clean this response before returning
    for (const key in this.state) {
      ret[key] = computedNextState[key];
    }

    return ret;
  }

  public encodeAction(action: SolidityABIEncoderV2Type) {
    return defaultAbiCoder.encode(
      [this.appInterface.actionEncoding!],
      [action]
    );
  }

  public encodeState(state: SolidityABIEncoderV2Type) {
    return defaultAbiCoder.encode([this.appInterface.stateEncoding], [state]);
  }

  public decodeAppState(
    encodedSolidityABIEncoderV2Type: string
  ): SolidityABIEncoderV2Type {
    return defaultAbiCoder.decode(
      [this.appInterface.stateEncoding],
      encodedSolidityABIEncoderV2Type
    )[0];
  }

  public toEthersContract(provider: BaseProvider) {
    return new Contract(
      this.appInterface.addr,
      CounterfactualApp.abi,
      provider
    );
  }
}
