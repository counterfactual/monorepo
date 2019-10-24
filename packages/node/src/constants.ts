import { AddressZero } from "ethers/constants";

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

// Adds indentation, white space, and line break characters to the return-value JSON text to make it easier to read
export const JSON_STRINGIFY_SPACE = 2;
