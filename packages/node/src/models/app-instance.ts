import CounterfactualApp from "@counterfactual/contracts/build/CounterfactualApp.json";
import {
  AppIdentity,
  AppInstanceJson,
  AppInterface,
  MultiAssetMultiPartyCoinTransferInterpreterParams,
  multiAssetMultiPartyCoinTransferInterpreterParamsEncoding,
  OutcomeType,
  SingleAssetTwoPartyCoinTransferInterpreterParams,
  singleAssetTwoPartyCoinTransferInterpreterParamsEncoding,
  SolidityABIEncoderV2Type,
  TwoPartyFixedOutcomeInterpreterParams
} from "@counterfactual/types";
import { Contract } from "ethers";
import { BaseProvider } from "ethers/providers";
import { BigNumber, defaultAbiCoder, keccak256 } from "ethers/utils";
import { Memoize } from "typescript-memoize";

import { appIdentityToHash } from "../ethereum/utils/app-identity";
import { bigNumberifyJson } from "../utils";

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

 * @property multiAssetMultiPartyCoinTransferInterpreterParams The limit / maximum amount of funds
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
    private readonly twoPartyOutcomeInterpreterParamsInternal?: TwoPartyFixedOutcomeInterpreterParams,
    private readonly multiAssetMultiPartyCoinTransferInterpreterParamsInternal?: MultiAssetMultiPartyCoinTransferInterpreterParams,
    private readonly singleAssetTwoPartyCoinTransferInterpreterParamsInternal?: SingleAssetTwoPartyCoinTransferInterpreterParams
  ) {}

  get twoPartyOutcomeInterpreterParams() {
    if (this.outcomeType !== OutcomeType.TWO_PARTY_FIXED_OUTCOME) {
      throw new Error(
        `Invalid Accessor. AppInstance has outcomeType ${this.outcomeType}, not TWO_PARTY_FIXED_OUTCOME`
      );
    }

    return this.twoPartyOutcomeInterpreterParamsInternal!;
  }

  get multiAssetMultiPartyCoinTransferInterpreterParams() {
    if (
      this.outcomeType !== OutcomeType.MULTI_ASSET_MULTI_PARTY_COIN_TRANSFER &&
      // NOTE: The RefundAppState outcome type reuses the same property on this model
      this.outcomeType !== OutcomeType.COIN_TRANSFER
    ) {
      throw new Error(
        `Invalid Accessor. AppInstance has outcomeType ${this.outcomeType}, not MULTI_ASSET_MULTI_PARTY_COIN_TRANSFER`
      );
    }

    return this.multiAssetMultiPartyCoinTransferInterpreterParamsInternal!;
  }

  get singleAssetTwoPartyCoinTransferInterpreterParams() {
    if (this.outcomeType !== OutcomeType.SINGLE_ASSET_TWO_PARTY_COIN_TRANSFER) {
      throw new Error(
        `Invalid Accessor. AppInstance has outcomeType ${this.outcomeType}, not SINGLE_ASSET_TWO_PARTY_COIN_TRANSFER `
      );
    }

    return this.singleAssetTwoPartyCoinTransferInterpreterParamsInternal!;
  }
  public static fromJson(json: AppInstanceJson) {
    const deserialized = bigNumberifyJson(json);

    return new AppInstance(
      deserialized.multisigAddress,
      deserialized.participants,
      deserialized.defaultTimeout,
      deserialized.appInterface,
      deserialized.isVirtualApp,
      deserialized.appSeqNo,
      deserialized.latestState,
      deserialized.latestVersionNumber,
      deserialized.latestTimeout,
      deserialized.outcomeType,
      deserialized.twoPartyOutcomeInterpreterParams,
      deserialized.multiAssetMultiPartyCoinTransferInterpreterParams,
      deserialized.singleAssetTwoPartyCoinTransferInterpreterParams
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
        twoPartyOutcomeInterpreterParams: this
          .twoPartyOutcomeInterpreterParamsInternal,
        multiAssetMultiPartyCoinTransferInterpreterParams: this
          .multiAssetMultiPartyCoinTransferInterpreterParamsInternal,
        singleAssetTwoPartyCoinTransferInterpreterParams: this
          .singleAssetTwoPartyCoinTransferInterpreterParamsInternal,
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
  // todo(xuanji): we should print better error messages here
  public get encodedLatestState() {
    return defaultAbiCoder.encode(
      [this.appInterface.stateEncoding],
      [this.latestState]
    );
  }

  @Memoize()
  get encodedInterpreterParams() {
    if (!this.isVirtualApp) {
      switch (this.outcomeType) {
        case OutcomeType.COIN_TRANSFER: {
          return defaultAbiCoder.encode(
            [multiAssetMultiPartyCoinTransferInterpreterParamsEncoding],
            [this.multiAssetMultiPartyCoinTransferInterpreterParams]
          );
        }

        case OutcomeType.SINGLE_ASSET_TWO_PARTY_COIN_TRANSFER: {
          return defaultAbiCoder.encode(
            [singleAssetTwoPartyCoinTransferInterpreterParamsEncoding],
            [this.singleAssetTwoPartyCoinTransferInterpreterParams]
          );
        }

        case OutcomeType.TWO_PARTY_FIXED_OUTCOME: {
          return defaultAbiCoder.encode(
            ["tuple(address[2] playerAddrs, uint256 amount)"],
            [this.twoPartyOutcomeInterpreterParams]
          );
        }

        default: {
          throw new Error(
            "The outcome type in this application logic contract is not supported yet."
          );
        }
      }
    } else {
      switch (this.outcomeType) {
        case OutcomeType.COIN_TRANSFER: {
          throw new Error(
            "COIN_TRANSFER is a non-supported OutcomeType for a Virtual App"
          );
        }

        case OutcomeType.SINGLE_ASSET_TWO_PARTY_COIN_TRANSFER: {
          // CoinTransferFromVirtualAppInterpreter.sol
          const {
            limit,
            tokenAddress
          } = this.singleAssetTwoPartyCoinTransferInterpreterParams!;
          return defaultAbiCoder.encode(
            [
              `
                tuple(
                  uint256 capitalProvided,
                  address payable capitalProvider,
                  address virtualAppUser,
                  address tokenAddress,
              )
              `
            ],
            [
              {
                tokenAddress,
                capitalProvided: limit,
                // FIXME: These addresses are definitely wrong
                capitalProvider: this.participants[0],
                virtualAppUser: this.participants[1]
              }
            ]
          );
        }

        case OutcomeType.TWO_PARTY_FIXED_OUTCOME: {
          // TODO: https://github.com/counterfactual/monorepo/pull/1996
          throw new Error(
            "TWO_PARTY_FIXED_OUTCOME is a non-supported OutcomeType for a Virtual App"
          );
        }

        default: {
          throw new Error(
            "The outcome type in this application logic contract is not supported yet."
          );
        }
      }
    }
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
        `
Attempted to setState on an app with an invalid state object.
- appInstanceIdentityHash = ${this.identityHash}
- newState = ${newState}
- encodingExpected = ${this.appInterface.stateEncoding}
`,
        newState
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
    return this.toEthersContract(provider).functions.computeOutcome(
      this.encodeState(state)
    );
  }

  public async computeOutcomeWithCurrentState(
    provider: BaseProvider
  ): Promise<string> {
    return this.computeOutcome(this.state, provider);
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
