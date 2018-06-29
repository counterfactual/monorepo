const AssetLib = artifacts.require("./AssetLib.sol");
const MinimumViableMultisig = artifacts.require("./MinimumViableMultisig.sol");
const ProxyFactory = artifacts.require("./ProxyFactory.sol");
const Registry = artifacts.require("./Registry.sol");
const RegistryAddressLib = artifacts.require("./RegistryAddressLib.sol");
const RegistryCallLib = artifacts.require("./RegistryCallLib.sol");

module.exports = (deployer) => {
  deployer.then(async () => {
    await deployer.deploy(MinimumViableMultisig);

    await deployer.deploy(ProxyFactory);

    await deployer.deploy(RegistryAddressLib);

    await deployer.deploy(RegistryCallLib);

    await deployer.deploy(Registry);

    await deployer.deploy(AssetLib);
  });
};
