// const ethers = require("ethers")

const CFAddressLib   = artifacts.require("./CFAddressLib.sol");
const Counterfactual = artifacts.require("./Counterfactual.sol");

const CFLibTester            = artifacts.require("./CFLibTester.sol");
const Conditional            = artifacts.require("./Conditional.sol");
const ETHConditionalTransfer = artifacts.require("./ETHConditionalTransfer.sol");
const ETHBalance             = artifacts.require("./ETHBalance.sol");
const ETHRefund              = artifacts.require("./ETHRefund.sol");
const ForceMoveGame          = artifacts.require("./ForceMoveGame.sol");
const Nonce                  = artifacts.require("./Nonce.sol");
const ProxyFactory           = artifacts.require("./ProxyFactory.sol");
const Registry               = artifacts.require("./Registry.sol");
const TicTacToeInterpreter   = artifacts.require("./TicTacToeInterpreter.sol");
const UnidirectionalETHBalance = artifacts.require("./UnidirectionalETHBalance.sol");

module.exports = async (deployer) => {

	deployer.then(async () => {

		await deployer.deploy(Registry, ProxyFactory.address);

		await deployer.link(Counterfactual, [
			Nonce,
			ETHBalance,
			ETHRefund,
			ForceMoveGame,
			UnidirectionalETHBalance,
			TicTacToeInterpreter,
			ETHConditionalTransfer,
		]);

		await deployer.link(CFAddressLib, [
			Conditional,
			CFLibTester,
			ETHBalance,
		]);

	});
};
