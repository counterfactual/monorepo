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

export const HARDCODED_PROXY_BYTECODE =
  "0x608060405234801561001057600080fd5b5060405161014d38038061014d8339818101604052602081101561003357600080fd5b50516001600160a01b038116610094576040517f08c379a00000000000000000000000000000000000000000000000000000000081526004018080602001828103825260248152602001806101296024913960400191505060405180910390fd5b600080546001600160a01b039092166001600160a01b03199092169190911790556066806100c36000396000f3fe60806040526001600160a01b03600054163660008037600080366000845af43d6000803e80602c573d6000fd5b3d6000f3fea265627a7a723058209d60a4264f378c116325d2df15fcde6d489d5d8b028cad374d18ee00e0b141a364736f6c634300050a0032496e76616c6964206d617374657220636f707920616464726573732070726f7669646564";
