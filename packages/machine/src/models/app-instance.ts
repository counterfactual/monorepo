import { AppIdentity, AppInterface, Terms } from "@counterfactual/types";
import { defaultAbiCoder, keccak256, solidityPack } from "ethers/utils";
import { Memoize } from "typescript-memoize";

import { appIdentityToHash } from "../ethereum/utils/app-identity";
import { APP_INTERFACE, TERMS } from "../ethereum/utils/encodings";

/**
 * Represenation of the values a dependency nonce can take on.
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
  dependencyReferenceNonce: number;
  latestState: object;
  latestNonce: number;
  latestTimeout: number;
  dependencyValue: DependencyValue;
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
  public dependencyValue: DependencyValue;

  constructor(
    public readonly multisigAddress: string,
    public readonly signingKeys: string[],
    public readonly defaultTimeout: number,
    // @ts-ignore
    public readonly appInterface: AppInterface,
    public readonly terms: Terms,
    public readonly isMetachannelApp: boolean,
    public readonly dependencyReferenceNonce: number,
    public latestState: object, // FIXME: it could also be any[]
    public latestNonce: number,
    public latestTimeout: number
  ) {
    // Set the value of the uninstall key to 0 on construction
    this.dependencyValue = DependencyValue.NOT_UNINSTALLED;
  }

  public static fromJson(json: AppInstanceJson) {
    const ret = new AppInstance(
      json.multisigAddress,
      json.signingKeys,
      json.defaultTimeout,
      json.appInterface,
      json.terms,
      json.isMetachannelApp,
      json.dependencyReferenceNonce,
      json.latestState,
      json.latestNonce,
      json.latestTimeout
    );
    ret.dependencyValue = json.dependencyValue;
    return ret;
  }

  @Memoize()
  public get id() {
    return appIdentityToHash(this.identity);
  }

  @Memoize()
  public get identity(): AppIdentity {
    const iface = defaultAbiCoder.encode([APP_INTERFACE], [this.appInterface]);
    const terms = defaultAbiCoder.encode([TERMS], [this.terms]);
    return {
      owner: this.multisigAddress,
      signingKeys: this.signingKeys,
      appInterfaceHash: keccak256(iface),
      termsHash: keccak256(terms),
      defaultTimeout: this.defaultTimeout
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
          this.multisigAddress,
          0,
          keccak256(
            solidityPack(
              ["uint256"],
              // In this case, we expect the <app nonce> variable to be
              // 1 since this newly installed app is the only app installed
              // after the ETH FreeBalance was installed.
              [this.dependencyReferenceNonce]
            )
          )
        ]
      )
    );
  }

  // TODO: add some other method for setting state with custom timeout too
  public set state(newState: object) {
    // TODO: I think this code could be written cleaner by checking for
    //       ethers.errors.INVALID_ARGUMENT specifically in catch {}
    try {
      defaultAbiCoder.encode([this.appInterface.stateEncoding], [newState]);
    } catch (e) {
      console.error(
        "Attempted to setState on an app with an invalid state object"
      );
      throw e;
    }

    this.latestState = newState;
    this.latestNonce += 1;
    this.latestTimeout = this.defaultTimeout;
  }
}
