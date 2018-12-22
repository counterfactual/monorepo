import { AppIdentity, AppInterface, Terms } from "@counterfactual/types";

import { defaultAbiCoder, keccak256, solidityPack } from "ethers/utils";
import { Memoize } from "typescript-memoize";

import { appIdentityToHash } from "../middleware/protocol-operation/utils/app-identity";
import {
  APP_INTERFACE,
  TERMS
} from "../middleware/protocol-operation/utils/encodings";

/**
 * Representation of the values a dependency nonce can take on.
 */
export enum DependencyValue {
  NOT_UNINSTALLED = 0,
  UNINSTALLED = 1
}

export type AppInstanceJson = {
  multisigAddress: string;
  signingKeys: string[];
  defaultTimeout: number;
  appInterface: AppInterface;
  terms: Terms;
  isMetachannelApp: boolean;
  appSeqNo: number;
  latestState: object;
  latestNonce: number;
  latestTimeout: number;
  hasBeenUninstalled: boolean;
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

 * @property isMetachannelApp A flag indicating whether this AppInstance's state
 *           deposits are within a metachannel or in a single on-chain deposit.

 * @property terms The terms for which this AppInstance is based on.

 * @property latestState The unencoded representation of the latest state.

 * @property latestNonce The nonce of the latest signed state update.

 * @property latestTimeout The timeout used in the latest signed state update.
 */
// TODO: dont forget dependnecy nonce docstring
export class AppInstance {
  private readonly json: AppInstanceJson;

  constructor(
    multisigAddress: string,
    signingKeys: string[],
    defaultTimeout: number,
    appInterface: AppInterface,
    terms: Terms,
    isMetachannelApp: boolean,
    appSeqNo: number,
    latestState: object,
    latestNonce: number,
    latestTimeout: number
  ) {
    this.json = {
      multisigAddress,
      signingKeys,
      defaultTimeout,
      appInterface,
      terms,
      isMetachannelApp,
      appSeqNo,
      latestState,
      latestNonce,
      latestTimeout,
      hasBeenUninstalled: false
    };
  }

  public static fromJson(json: AppInstanceJson) {
    const ret = new AppInstance(
      json.multisigAddress,
      json.signingKeys,
      json.defaultTimeout,
      json.appInterface,
      json.terms,
      json.isMetachannelApp,
      json.appSeqNo,
      json.latestState,
      json.latestNonce,
      json.latestTimeout
    );
    ret.json.hasBeenUninstalled = json.hasBeenUninstalled;
    return ret;
  }

  @Memoize()
  public get id() {
    return appIdentityToHash(this.identity);
  }

  @Memoize()
  public get identity(): AppIdentity {
    const encodedAppInterface = defaultAbiCoder.encode(
      [APP_INTERFACE],
      [this.json.appInterface]
    );
    const encodedTerms = defaultAbiCoder.encode([TERMS], [this.json.terms]);
    return {
      owner: this.json.multisigAddress,
      signingKeys: this.json.signingKeys,
      appInterfaceHash: keccak256(encodedAppInterface),
      termsHash: keccak256(encodedTerms),
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
  public get encodedTerms() {
    return defaultAbiCoder.encode([TERMS], [this.json.terms]);
  }

  @Memoize()
  public get uninstallKey() {
    // The unique "key" in the NonceRegistry is computed to be:
    // hash(<stateChannel.multisigAddress address>, <timeout = 0>, hash(<app nonce>))
    // where <app nonce> is 0 since FreeBalance is assumed to be the
    // firstmost intalled app in the channel.
    return keccak256(
      solidityPack(
        ["address", "uint256", "bytes32"],
        [
          this.json.multisigAddress,
          0,
          keccak256(
            solidityPack(
              ["uint256"],
              // In this case, we expect the <app nonce> variable to be
              // 1 since this newly installed app is the only app installed
              // after the ETH FreeBalance was installed.
              [this.json.appSeqNo]
            )
          )
        ]
      )
    );
  }

  // TODO: All these getters seems a bit silly, would be nice to improve
  //       the implementation to make it cleaner.

  public get terms() {
    return this.json.terms;
  }

  public get state() {
    return this.json.latestState;
  }

  public get nonce() {
    return this.json.latestNonce;
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

  public get isMetachannelApp() {
    return this.json.isMetachannelApp;
  }

  public setState(
    newState: object,
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
      latestNonce: this.json.latestNonce + 1,
      latestTimeout: timeout
    });
  }
}
