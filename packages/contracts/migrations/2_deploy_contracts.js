const { deployTruffleArtifacts } = require("../dist/utils/deploy");

module.exports = deployer => deployTruffleArtifacts(artifacts, deployer);
