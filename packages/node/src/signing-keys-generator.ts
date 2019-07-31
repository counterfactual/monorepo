import { Node } from "@counterfactual/types";
import { Wallet } from "ethers";
import { hashMessage } from "ethers/utils";
import log from "loglevel";
import { Memoize } from "typescript-memoize";

export const MNEMONIC_PATH = "MNEMONIC";

export class SigningKeysGenerator {
  // The namespacing is on the channel the AppInstance is in
  private namespacedAppInstanceNumberToSigningKey: Map<
    string,
    string
  > = new Map();
  private signingKeys: Set<string> = new Set();

  constructor(
    private readonly privateKeyGenerator: Node.IPrivateKeyGenerator
  ) {}

  @Memoize()
  /**
   * @param appSequenceNumber
   * @param multisigAddress The namespace under which `appSequenceNumber` is
   *        used since the provided callback function is idempotent for any
   *        value passed in. This prevents collisions that'd occur on  using the
   *        same `appSequenceNumber` across different channels from receiving the
   *        same signing key from the callback.
   */
  public async getSigningKey(
    appSequenceNumber: number,
    multisigAddress: string
  ): Promise<string> {
    const appInstanceUniqueId = hashMessage(
      `${multisigAddress}_${appSequenceNumber}`
    );

    if (this.namespacedAppInstanceNumberToSigningKey.has(appInstanceUniqueId)) {
      return await this.namespacedAppInstanceNumberToSigningKey.get(
        appInstanceUniqueId
      )!;
    }

    // FIXME: fallback on mnemonic-based signer if callback isn't specified
    // in which case the derivation path needs to be converted into a decimal
    // representation for it to be a valid path
    const signingKey = await this.privateKeyGenerator(appInstanceUniqueId);
    try {
      new Wallet(signingKey);
    } catch (e) {
      throw new Error(`
      Invalid signing key retrieved from Wallet-provided
      callback given the unique ID string: ${appInstanceUniqueId}`);
    }

    if (this.signingKeys.has(signingKey)) {
      throw new Error(
        `Wallet-provided callback function returned a pre-existing signing key for a new, different unique ID`
      );
    }

    this.namespacedAppInstanceNumberToSigningKey = this.namespacedAppInstanceNumberToSigningKey.set(
      appInstanceUniqueId,
      signingKey
    );
    this.signingKeys.add(signingKey);

    return signingKey;
  }
}

export async function getSigningKeysGeneratorOrThrow(
  storeService: Node.IStoreService,
  privateKeyGenerator?: Node.IPrivateKeyGenerator,
  publicExtendedKey?: string
): Promise<SigningKeysGenerator> {
  if (publicExtendedKey && !privateKeyGenerator) {
    throw new Error(
      "Cannot provide a public extended key but not provide a private key generation function"
    );
  }

  if (!publicExtendedKey && privateKeyGenerator) {
    throw new Error(
      "Cannot provide a private key generation function but not provide a public extended key"
    );
  }

  if (publicExtendedKey && privateKeyGenerator) {
  } else {
    // TODO: update this as of PR https://github.com/counterfactual/monorepo/pull/2075
    let mnemonic = await storeService.get(MNEMONIC_PATH);

    if (!mnemonic) {
      log.info(
        "No (public extended key, private key generation function) pair was provided and no mnemonic was found in store. Generating a random mnemonic"
      );
      mnemonic = Wallet.createRandom().mnemonic;
      await storeService.set([{ key: MNEMONIC_PATH, value: mnemonic }]);
    }
  }
}
