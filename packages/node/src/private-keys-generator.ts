import { Node } from "@counterfactual/types";
import { Wallet } from "ethers";
import { BigNumber } from "ethers/utils";
import { fromExtendedKey, fromMnemonic } from "ethers/utils/hdnode";
import log from "loglevel";
import { Memoize } from "typescript-memoize";

import { CF_PATH } from "./constants";

export const EXTENDED_PRIVATE_KEY_PATH = "EXTENDED_PRIVATE_KEY";

export class PrivateKeysGetter {
  private appInstanceIdentityHashToPrivateKey: Map<string, string> = new Map();
  private readonly privateKeys: Set<string> = new Set();

  constructor(
    private readonly privateKeyGenerator: Node.IPrivateKeyGenerator
  ) {}

  @Memoize()
  public async getPrivateKey(appInstanceIdentityHash: string): Promise<string> {
    const validHDPathRepresentationOfIdentityHash = convertDecimalStringToValidHDPath(
      new BigNumber(appInstanceIdentityHash).toString()
    );

    if (
      this.appInstanceIdentityHashToPrivateKey.has(
        validHDPathRepresentationOfIdentityHash
      )
    ) {
      return await this.appInstanceIdentityHashToPrivateKey.get(
        validHDPathRepresentationOfIdentityHash
      )!;
    }

    const privateKey = await this.privateKeyGenerator(
      validHDPathRepresentationOfIdentityHash
    );
    try {
      new Wallet(privateKey);
    } catch (e) {
      throw new Error(`
        Invalid private key retrieved from wallet-provided
        callback given AppInstance ID ${appInstanceIdentityHash}: ${JSON.stringify(
        e,
        null,
        4
      )}
      `);
    }

    if (this.privateKeys.has(privateKey)) {
      throw new Error(
        `Wallet-provided callback function returned a colliding private key for two different AppInstance IDs`
      );
    }

    this.appInstanceIdentityHashToPrivateKey = this.appInstanceIdentityHashToPrivateKey.set(
      validHDPathRepresentationOfIdentityHash,
      privateKey
    );
    this.privateKeys.add(privateKey);

    return privateKey;
  }
}

export async function getPrivateKeysGeneratorAndXPubOrThrow(
  storeService: Node.IStoreService,
  privateKeyGenerator?: Node.IPrivateKeyGenerator,
  publicExtendedKey?: string
): Promise<[PrivateKeysGetter, string]> {
  if (publicExtendedKey && !privateKeyGenerator) {
    throw new Error(
      "Cannot provide an extended public key but not provide a private key generation function"
    );
  }

  if (!publicExtendedKey && privateKeyGenerator) {
    throw new Error(
      "Cannot provide a private key generation function but not provide an extended public key"
    );
  }

  if (publicExtendedKey && privateKeyGenerator) {
    return Promise.resolve([
      new PrivateKeysGetter(privateKeyGenerator),
      publicExtendedKey
    ]);
  }

  let extendedPrvKey = await storeService.get(EXTENDED_PRIVATE_KEY_PATH);

  if (!extendedPrvKey) {
    log.info(
      "No (extended public key, private key generation function) pair was provided and no extended private key was found in store. Generating a random extended private key"
    );
    extendedPrvKey = fromMnemonic(Wallet.createRandom().mnemonic).extendedKey;
    await storeService.set([
      { path: EXTENDED_PRIVATE_KEY_PATH, value: extendedPrvKey }
    ]);
  } else {
    log.info("Using extended private key found in the store.");
  }
  const [
    privKeyGenerator,
    extendedPubKey
  ] = generatePrivateKeyGeneratorAndXPubPair(extendedPrvKey);
  return Promise.resolve([
    new PrivateKeysGetter(privKeyGenerator),
    extendedPubKey
  ]);
}

// Reference implementation for how the `IPrivateKeyGenerator` interface
// should be implemented, with specific reference to hardcoding the
// "Counterfactual" derivation path.
export function generatePrivateKeyGeneratorAndXPubPair(
  extendedPrvKey: string
): [Node.IPrivateKeyGenerator, string] {
  const hdNode = fromExtendedKey(extendedPrvKey).derivePath(CF_PATH);

  return [
    function(uniqueID: string): Promise<string> {
      return Promise.resolve(hdNode.derivePath(uniqueID).privateKey);
    },
    hdNode.neuter().extendedKey
  ];
}

/**
 * Given a decimal representation of a hex string such as
 * "61872445784447517153266591489987994343175816860517849584947754093871275612211",
 * this function would produce
 * "6187244578/4447517153/2665914899/8799434317/5816860517/8495849477/5409387127/5612211"
 */
function convertDecimalStringToValidHDPath(numbers: string): string {
  const components = numbers.split("").reduce(
    (componentAccumulator: [string[]], number: string, index) => {
      if (index === 0) {
        return componentAccumulator;
      }
      if (index % 10 === 0) {
        componentAccumulator.push([number]);
      } else {
        componentAccumulator[componentAccumulator.length - 1].push(number);
      }
      return componentAccumulator;
    },
    [[numbers[0]]]
  );

  return components.map((component: string[]) => component.join("")).join("/");
}
