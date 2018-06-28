const RegistryAddressLib = artifacts.require("./RegistryAddressLib.sol");
const AssetLib = artifacts.require("./AssetLib.sol");
const AssetDispatcher = artifacts.require("./AssetDispatcher.sol");
const ETHForwarder = artifacts.require("./ETHForwarder.sol");
const ConditionalTransfer = artifacts.require("./ConditionalTransfer.sol");
const BytesApp  = artifacts.require("./BytesApp.sol");
const TicTacToe  = artifacts.require("./TicTacToe.sol");

const MetachannelModule = artifacts.require("./MetachannelModule.sol");

module.exports = async (deployer) => {
	await deployer.then(async () => {
		await deployer.link(RegistryAddressLib, [
			AssetDispatcher,
			ConditionalTransfer,
			BytesApp,
			TicTacToe,
			MetachannelModule,
			ETHForwarder
		]);

		await deployer.link(AssetLib, [AssetDispatcher]);

		await deployer.deploy(AssetDispatcher);

		await deployer.deploy(ConditionalTransfer, [
			(await AssetDispatcher.deployed()).address
		]);

		await deployer.deploy(BytesApp);
		await deployer.deploy(TicTacToe);

	});
};
