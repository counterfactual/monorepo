import { NetworkContext } from "@counterfactual/types";
import { getAddress, hexlify, randomBytes } from "ethers/utils";

/// todo(xuanji): make this random but deterministically generated from some seed
export function generateRandomNetworkContext(): NetworkContext {
  return {
    ETHBucket: getAddress(hexlify(randomBytes(20))),
    StateChannelTransaction: getAddress(hexlify(randomBytes(20))),
    MultiSend: getAddress(hexlify(randomBytes(20))),
    NonceRegistry: getAddress(hexlify(randomBytes(20))),
    AppRegistry: getAddress(hexlify(randomBytes(20))),
    ETHBalanceRefund: getAddress(hexlify(randomBytes(20))),
    ETHVirtualAppAgreement: getAddress(hexlify(randomBytes(20))),
    MinimumViableMultisig: getAddress(hexlify(randomBytes(20))),
    ProxyFactory: getAddress(hexlify(randomBytes(20)))
  };
}
