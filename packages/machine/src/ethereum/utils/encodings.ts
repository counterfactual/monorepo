// NOTE: It is important that the strings end with a comma and not a semicolon,
//       these are not struct declarations but simply multi-line tuple encodings.

export const TERMS = `
  tuple(
    uint8 assetType,
    uint256 limit,
    address token
  )`;

export const APP_INTERFACE = `
  tuple(
    address addr,
    bytes4 getTurnTaker,
    bytes4 applyAction,
    bytes4 resolve,
    bytes4 isStateTerminal
  )`;

export const APP_IDENTITY = `
  tuple(
    address owner,
    address[] signingKeys,
    address appDefinitionAddress,
    bytes32 termsHash,
    uint256 defaultTimeout
  )`;

export const SIGNED_STATE_HASH_UPDATE = `
  tuple(
    bytes32 stateHash,
    uint256 nonce,
    uint256 timeout,
    bytes signatures
  )`;
