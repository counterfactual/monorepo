import { AppIdentity, AppInterface, Terms } from "@counterfactual/types";
import { defaultAbiCoder, keccak256 } from "ethers/utils";
import { Memoize } from "typescript-memoize";

import { appIdentityToHash } from "../utils/app-identity";
import { APP_INTERFACE, TERMS } from "../utils/encodings";

/**
 * Representation of an AppInstance.
 *
 * @argument owner The address of the multisignature wallet on-chain for the
 *           state channel that hold the state this AppInstance controls.

 * @argument signingKeys The sorted array of public keys used by the users of
 *           this AppInstance for which n-of-n consensus is needed on updates.

 * @argument defaultTimeout The default timeout used when a new update is made.

 * @argument interface An AppInterface object representing the logic this
 *           AppInstance relies on for verifying and proposing state updates.

 * @argument isMetachannelApp A flag indicating whether this AppInstance's state
 *           deposits are within a metachannel or in a single on-chain deposit.

 * @argument terms The terms for which this AppInstance is based on.

 * @argument latestState The unencoded representation of the latest state.

 * @argument latestNonce The nonce of the latest signed state update.

 * @argument latestTimeout The timeout used in the latest signed state update.
 */
export class AppInstance {
  constructor(
    public readonly multisigAddress: string,
    public readonly signingKeys: string[],
    public readonly defaultTimeout: number,
    // @ts-ignore
    public readonly interface: AppInterface,
    public readonly terms: Terms,
    public readonly isMetachannelApp: boolean,
    public latestState: object,
    public latestNonce: number,
    public latestTimeout: number
  ) {}

  @Memoize()
  public get id(): string {
    return appIdentityToHash(this.identity);
  }

  @Memoize()
  public get identity(): AppIdentity {
    const iface = defaultAbiCoder.encode([APP_INTERFACE], [this.interface]);
    const terms = defaultAbiCoder.encode([TERMS], [this.terms]);
    return {
      owner: this.multisigAddress,
      signingKeys: this.signingKeys,
      appInterfaceHash: keccak256(iface),
      termsHash: keccak256(terms),
      defaultTimeout: this.defaultTimeout
    };
  }
}
