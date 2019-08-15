import { AddressZero } from "ethers/constants";

// Adds indentation, white space, and line break characters to the return-value JSON text to make it easier to read
export const JSON_STRINGIFY_SPACE = 2;

/**
 * We use 0x00...000 to represent an identifier for the ETH token
 * in places where values are indexed on token address. Of course,
 * in practice, there is no "token address" for ETH because it is a
 * native asset on the ethereum blockchain, but using this as an index
 * is convenient for storing this data in the same data structure that
 * also carries data about ERC20 tokens.
 */
export const CONVENTION_FOR_ETH_TOKEN_ADDRESS = AddressZero;

// 25446 is 0x6366... or "cf" in ascii, for "Counterfactual".
export const CF_PATH = "m/44'/60'/0'/25446";

// When the source code of the contract changes, the deployed bytecode will
// also change and the tests will fail as the deplyed bytecode checking
// in the create channel call will fail.
export const MULTISIG_DEPLOYED_BYTECODE =
  "0x608060405273ffffffffffffffffffffffffffffffffffffffff600054163660008037600080366000845af43d6000803e6000811415603d573d6000fd5b3d6000f3fea265627a7a723058202b014062fac5bbf2f3a320134dac5811a29f916a0f071e16e4493bf4a28fe8a064736f6c634300050a0032";
