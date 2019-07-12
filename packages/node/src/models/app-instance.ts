import CounterfactualApp from "@counterfactual/contracts/build/CounterfactualApp.json";
import {
  AppIdentity,
  AppInstanceJson,
  AppInterface,
  CoinTransferInterpreterParams,
  SolidityABIEncoderV2Type,
  TwoPartyFixedOutcomeInterpreterParams
} from "@counterfactual/types";
import { Contract } from "ethers";
import { AddressZero } from "ethers/constants";
import { BaseProvider } from "ethers/providers";
import {
  BigNumber,
  bigNumberify,
  defaultAbiCoder,
  keccak256
} from "ethers/utils";
import { Memoize } from "typescript-memoize";

import { appIdentityToHash } from "../ethereum/utils/app-identity";

import { CONVENTION_FOR_ETH_TOKEN_ADDRESS } from "./free-balance";

/**
 * Representation of an AppInstance.
 *
 * @property owner The address of the multisignature wallet on-chain for the
 *           state channel that hold the state this AppInstance controls.

 * @property signingKeys The sorted array of public keys used by the users of
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
// TODO: dont forget dependnecy versionNumber docstring
export class AppInstance {
  private readonly json: AppInstanceJson;

  constructor(
    multisigAddress: string,
    signingKeys: string[],
    defaultTimeout: number,
    appInterface: AppInterface,
    isVirtualApp: boolean,
    appSeqNo: number,
    latestState: any,
    latestVersionNumber: number,
    latestTimeout: number,
    twoPartyOutcomeInterpreterParams?: TwoPartyFixedOutcomeInterpreterParams,
    coinTransferInterpreterParams?: CoinTransferInterpreterParams,
    tokenAddress: string = CONVENTION_FOR_ETH_TOKEN_ADDRESS
  ) {
    this.json = {
      multisigAddress,
      signingKeys,
      defaultTimeout,
      appInterface,
      isVirtualApp,
      appSeqNo,
      latestState,
      latestVersionNumber,
      latestTimeout,
      tokenAddress,
      identityHash: AddressZero,
      twoPartyOutcomeInterpreterParams: twoPartyOutcomeInterpreterParams
        ? {
            playerAddrs: twoPartyOutcomeInterpreterParams.playerAddrs,
            amount: {
              _hex: twoPartyOutcomeInterpreterParams.amount.toHexString()
            }
          }
        : undefined,
      coinTransferInterpreterParams: coinTransferInterpreterParams
        ? {
            tokenAddress,
            limit: {
              _hex: coinTransferInterpreterParams.limit.toHexString()
            }
          }
        : undefined
    };
    this.json.identityHash = this.identityHash;
  }

  public static fromJson(json: AppInstanceJson) {
    // FIXME: Do recursive not shallow
    const latestState = json.latestState;
    for (const key in latestState) {
      // @ts-ignore
      if (latestState[key]["_hex"]) {
        latestState[key] = bigNumberify(latestState[key] as BigNumber);
      }
    }

    const ret = new AppInstance(
      json.multisigAddress,
      json.signingKeys,
      json.defaultTimeout,
      json.appInterface,
      json.isVirtualApp,
      json.appSeqNo,
      latestState,
      json.latestVersionNumber,
      json.latestTimeout,
      json.twoPartyOutcomeInterpreterParams
        ? {
            playerAddrs: json.twoPartyOutcomeInterpreterParams.playerAddrs,
            amount: bigNumberify(
              json.twoPartyOutcomeInterpreterParams.amount._hex
            )
          }
        : undefined,
      json.coinTransferInterpreterParams
        ? {
            tokenAddress: json.tokenAddress,
            limit: bigNumberify(json.coinTransferInterpreterParams.limit._hex)
          }
        : undefined,
      json.tokenAddress
    );
    return ret;
  }

  public toJson(): AppInstanceJson {
    // removes any fields which have an `undefined` value, as that's invalid JSON
    // an example would be having an `undefined` value for the `actionEncoding`
    // of an AppInstance that's not turn based
    return JSON.parse(
      JSON.stringify({ ...this.json, identityHash: this.identityHash })
    );
  }

  @Memoize()
  public get identityHash() {
    return appIdentityToHash(this.identity);
  }

  @Memoize()
  public get identity(): AppIdentity {
    return {
      owner: this.json.multisigAddress,
      signingKeys: this.json.signingKeys,
      appDefinition: this.json.appInterface.addr,
      defaultTimeout: this.json.defaultTimeout
    };
  }

  @Memoize()
  public get hashOfLatestState() {
    return keccak256(this.encodedLatestState);
  }

  @Memoize()
  public get encodedLatestState() {
    return defaultAbiCoder.encode(
      [this.json.appInterface.stateEncoding],
      [this.json.latestState]
    );
  }

  // TODO: All these getters seems a bit silly, would be nice to improve
  //       the implementation to make it cleaner.

  public get state() {
    return this.json.latestState;
  }

  public get versionNumber() {
    return this.json.latestVersionNumber;
  }

  public get coinTransferInterpreterParams() {
    return this.json.coinTransferInterpreterParams
      ? {
          tokenAddress: this.json.tokenAddress,
          limit: bigNumberify(
            this.json.coinTransferInterpreterParams.limit._hex
          )
        }
      : undefined;
  }

  public get twoPartyOutcomeInterpreterParams() {
    return this.json.twoPartyOutcomeInterpreterParams
      ? {
          playerAddrs: this.json.twoPartyOutcomeInterpreterParams.playerAddrs,
          amount: bigNumberify(
            this.json.twoPartyOutcomeInterpreterParams.amount._hex
          )
        }
      : undefined;
  }

  public get timeout() {
    return this.json.latestTimeout;
  }

  public get appInterface() {
    return this.json.appInterface;
  }

  public get defaultTimeout() {
    return this.json.defaultTimeout;
  }

  public get appSeqNo() {
    return this.json.appSeqNo;
  }

  public get multisigAddress() {
    return this.json.multisigAddress;
  }

  public get signingKeys() {
    return this.json.signingKeys;
  }

  public get isVirtualApp() {
    return this.json.isVirtualApp;
  }

  public get tokenAddress() {
    return this.json.tokenAddress;
  }

  public lockState(versionNumber: number) {
    return AppInstance.fromJson({
      ...this.json,
      latestState: this.json.latestState,
      latestVersionNumber: versionNumber
    });
  }

  public setState(
    newState: SolidityABIEncoderV2Type,
    timeout: number = this.json.defaultTimeout
  ) {
    try {
      defaultAbiCoder.encode(
        [this.json.appInterface.stateEncoding],
        [newState]
      );
    } catch (e) {
      // TODO: Catch ethers.errors.INVALID_ARGUMENT specifically in catch {}
      console.error(
        "Attempted to setState on an app with an invalid state object"
      );
      throw e;
    }

    return AppInstance.fromJson({
      ...this.json,
      latestState: newState,
      latestVersionNumber: this.versionNumber + 1,
      latestTimeout: timeout
    });
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
      [this.json.appInterface.actionEncoding!],
      [action]
    );
  }

  public encodeState(state: SolidityABIEncoderV2Type) {
    return defaultAbiCoder.encode(
      [this.json.appInterface.stateEncoding],
      [state]
    );
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
