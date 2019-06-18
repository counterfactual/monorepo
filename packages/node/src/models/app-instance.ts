import CounterfactualApp from "@counterfactual/contracts/build/CounterfactualApp.json";
import {
  AppIdentity,
  AppInterface,
  SolidityABIEncoderV2Type
} from "@counterfactual/types";
import {
  CoinTransferInterpreterParams,
  TwoPartyFixedOutcomeInterpreterParams
} from "@counterfactual/types/dist/src/data-types";
import { Contract } from "ethers";
import { BaseProvider } from "ethers/providers";
import {
  BigNumber,
  bigNumberify,
  defaultAbiCoder,
  keccak256,
  solidityPack
} from "ethers/utils";
import * as log from "loglevel";
import { Memoize } from "typescript-memoize";

import { appIdentityToHash } from "../ethereum/utils/app-identity";

export type AppInstanceJson = {
  multisigAddress: string;
  signingKeys: string[];
  defaultTimeout: number;
  appInterface: AppInterface;
  isVirtualApp: boolean;
  appSeqNo: number;
  rootNonceValue: number;
  latestState: SolidityABIEncoderV2Type;
  latestNonce: number;
  latestTimeout: number;

  /**
   * Interpreter-related Fields
   */
  twoPartyOutcomeInterpreterParams?: {
    // Derived from:
    // packages/contracts/contracts/interpreters/TwoPartyEthAsLump.sol#L10
    playerAddrs: [string, string];
    amount: { _hex: string };
  };

  coinTransferInterpreterParams?: {
    // Derived from:
    // packages/contracts/contracts/interpreters/ETHInterpreter.sol#L18
    limit: { _hex: string };
  };
};

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
 *           proxy agreement (TwoPartyVirtualEthAsLump.sol)

 * @property latestState The unencoded representation of the latest state.

 * @property latestNonce The nonce of the latest signed state update.

 * @property latestTimeout The timeout used in the latest signed state update.

 * @property coinTransferInterpreterParams The limit / maximum amount of funds
 *           to be distributed for an app where the interpreter type is COIN_TRANSFER

 * @property twoPartyOutcomeInterpreterParams Addresses of the two beneficiaries
 *           and the amount that is to be distributed for an app
 *           where the interpreter type is TWO_PARTY_FIXED_OUTCOME
 */
// TODO: dont forget dependnecy nonce docstring
export class AppInstance {
  private readonly json: AppInstanceJson;

  constructor(
    multisigAddress: string,
    signingKeys: string[],
    defaultTimeout: number,
    appInterface: AppInterface,
    isVirtualApp: boolean,
    appSeqNo: number,
    rootNonceValue: number,
    latestState: any,
    latestNonce: number,
    latestTimeout: number,
    twoPartyOutcomeInterpreterParams?: TwoPartyFixedOutcomeInterpreterParams,
    coinTransferInterpreterParams?: CoinTransferInterpreterParams
  ) {
    this.json = {
      multisigAddress,
      signingKeys,
      defaultTimeout,
      appInterface,
      isVirtualApp,
      appSeqNo,
      rootNonceValue,
      latestState,
      latestNonce,
      latestTimeout,
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
            limit: {
              _hex: coinTransferInterpreterParams.limit.toHexString()
            }
          }
        : undefined
    };
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
      json.rootNonceValue,
      latestState,
      json.latestNonce,
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
            limit: bigNumberify(json.coinTransferInterpreterParams.limit._hex)
          }
        : undefined
    );
    return ret;
  }

  public toJson(): AppInstanceJson {
    // removes any fields which have an `undefined` value, as that's invalid JSON
    // an example would be having an `undefined` value for the `actionEncoding`
    // of an AppInstance that's not turn based
    return JSON.parse(JSON.stringify(this.json));
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

  @Memoize()
  public get uninstallKey() {
    // The unique "key" in the UninstallKeyRegistry is computed to be:
    // hash(<stateChannel.multisigAddress address>, hash(<app nonce>))
    const ret = keccak256(
      solidityPack(
        ["address", "bytes32"],
        [
          this.json.multisigAddress,
          keccak256(solidityPack(["uint256"], [this.json.appSeqNo]))
        ]
      )
    );

    log.debug(`
      app-instance: computed
        uninstallKey = ${ret} using
        sender = ${this.json.multisigAddress},
        salt = ${keccak256(solidityPack(["uint256"], [this.json.appSeqNo]))}
    `);

    return ret;
  }

  // TODO: All these getters seems a bit silly, would be nice to improve
  //       the implementation to make it cleaner.

  public get state() {
    return this.json.latestState;
  }

  public get nonce() {
    return this.json.latestNonce;
  }

  public get coinTransferInterpreterParams() {
    return this.json.coinTransferInterpreterParams
      ? {
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

  public get rootNonceValue() {
    return this.json.rootNonceValue;
  }

  public lockState(nonce: number) {
    return AppInstance.fromJson({
      ...this.json,
      latestState: this.json.latestState,
      latestNonce: nonce
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
      latestNonce: this.nonce + 1,
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
