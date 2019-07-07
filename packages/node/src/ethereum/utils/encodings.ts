// NOTE: It is important that the strings end with a comma and not a semicolon,
//       these are not struct declarations but simply multi-line tuple encodings.
export const APP_IDENTITY = `
  tuple(
    address owner,
    address[] signingKeys,
    address appDefinition,
    uint256 defaultTimeout
  )`;
