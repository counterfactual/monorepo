const CFAddressLib                  = artifacts.require("./CFAddressLib.sol");
const Counterfactual                = artifacts.require("./Counterfactual.sol");
const DelegateTargets               = artifacts.require("./DelegateTargets.sol");
const GnosisSafeStateChannelEdition = artifacts.require("./GnosisSafeStateChannelEdition.sol");
const MockRegistry                  = artifacts.require("./MockRegistry.sol");
const ProxyFactory                  = artifacts.require("./ProxyFactory.sol");

const notOwnedAddress = "0x0000000000000000000000000000000000000001";

module.exports = async (deployer) => {

	deployer.then(async () => {
		await deployer.deploy(GnosisSafeStateChannelEdition);

		await deployer.deploy(ProxyFactory);

		await deployer.deploy(Counterfactual);

		await deployer.deploy(CFAddressLib);

		await deployer.deploy(MockRegistry);

		await deployer.deploy(DelegateTargets);
	});
};
