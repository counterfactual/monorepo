import { Node } from "@counterfactual/types";
import { Wallet } from "ethers";
import { BigNumber } from "ethers/utils";
import { fromMnemonic } from "ethers/utils/hdnode";
import log from "loglevel";
import { Memoize } from "typescript-memoize";

export const MNEMONIC_PATH = "MNEMONIC";

export class SigningKeysGenerator {
  // The namespacing is on the channel the AppInstance is in
  private appInstanceIdentityHashToPrivateKey: Map<string, string> = new Map();
  private signingKeys: Set<string> = new Set();

  constructor(
    private readonly privateKeyGenerator: Node.IPrivateKeyGenerator
  ) {}

  @Memoize()
  public async getSigningKey(appInstanceIdentityHash: string): Promise<string> {
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

    const signingKey = await this.privateKeyGenerator(
      validHDPathRepresentationOfIdentityHash
    );
    try {
      new Wallet(signingKey);
    } catch (e) {
      throw new Error(`
        Invalid signing key retrieved from wallet-provided
        callback given AppInstance ID ${appInstanceIdentityHash}: ${e}
      `);
    }

    if (this.signingKeys.has(signingKey)) {
      throw new Error(
        `Wallet-provided callback function returned a colliding signing key for two different AppInstance IDs`
      );
    }

    this.appInstanceIdentityHashToPrivateKey = this.appInstanceIdentityHashToPrivateKey.set(
      validHDPathRepresentationOfIdentityHash,
      signingKey
    );
    this.signingKeys.add(signingKey);

    return signingKey;
  }
}

export async function getSigningKeysGeneratorAndXPubOrThrow(
  storeService: Node.IStoreService,
  privateKeyGenerator?: Node.IPrivateKeyGenerator,
  publicExtendedKey?: string
): Promise<[SigningKeysGenerator, string]> {
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
    return Promise.resolve([
      new SigningKeysGenerator(privateKeyGenerator),
      publicExtendedKey
    ]);
  }

  // TODO: update this as of PR https://github.com/counterfactual/monorepo/pull/2075
  let mnemonic = await storeService.get(MNEMONIC_PATH);

  if (!mnemonic) {
    log.info(
      "No (public extended key, private key generation function) pair was provided and no mnemonic was found in store. Generating a random mnemonic"
    );
    mnemonic = Wallet.createRandom().mnemonic;
    await storeService.set([{ key: MNEMONIC_PATH, value: mnemonic }]);
  }
  const [
    privKeyGenerator,
    pubExtendedKey
  ] = generatePrivateKeyGeneratorAndXPubPair(mnemonic);
  return Promise.resolve([
    new SigningKeysGenerator(privKeyGenerator),
    pubExtendedKey
  ]);
}

// Reference implementation for how the `IPrivateKeyGenerator` interface
// should be implemented, with specific reference to hardcoding the
// "Counterfactual" derivation path.
export function generatePrivateKeyGeneratorAndXPubPair(
  mnemonic: string
): [Node.IPrivateKeyGenerator, string] {
  // 25446 is 0x6366... or "cf" in ascii, for "Counterfactual".
  const hdNode = fromMnemonic(mnemonic).derivePath("m/44'/60'/0'/25446");

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
