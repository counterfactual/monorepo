declare var ethers;

function getProp(propertyName: string, context: { [key: string]: any }) {
  const state = context.history.location
    ? context.history.location.state || {}
    : {};
  const query = context.history.location
    ? context.history.location.query || {}
    : {};
  return state[propertyName] || query[propertyName] || context[propertyName];
}

/// Returns the commit hash that can be used to commit to chosenNumber
/// using appSalt
function computeCommitHash(appSalt: string, chosenNumber: number) {
  return ethers.utils.solidityKeccak256(
    ["bytes32", "uint256"],
    [appSalt, chosenNumber]
  );
}

function generateSalt() {
  return ethers.utils.bigNumberify(ethers.utils.randomBytes(32)).toHexString();
}

export { getProp, computeCommitHash, generateSalt };
