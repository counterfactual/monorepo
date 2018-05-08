const ethers = require('ethers')

const GnosisSafe = artifacts.require('./GnosisSafe.sol')
const ProxyFactory = artifacts.require('./ProxyFactory.sol')
const Registry = artifacts.require('./Registry.sol')
const Counterfactual = artifacts.require('./Counterfactual.sol')
const ETHController = artifacts.require('./ETHController.sol')
const ConditionalTransfer = artifacts.require('./ConditionalTransfer.sol')
const Nonce = artifacts.require('./Nonce.sol')
const ETHBalance = artifacts.require('./ETHBalance.sol')
const ETHRefund = artifacts.require('./ETHRefund.sol')
const CFLib = artifacts.require('./CFLib.sol')
const CFLibTester = artifacts.require('./CFLibTester.sol')
const MockRegistry = artifacts.require('./MockRegistry.sol')
const ForceMoveGame = artifacts.require('./ForceMoveGame.sol')

const notOwnedAddress = '0x0000000000000000000000000000000000000001'

module.exports = async (deployer) => {

	deployer.then(async () => {
		await deployer.deploy(GnosisSafe, [notOwnedAddress], 1, 0, 0)

		await deployer.deploy(ProxyFactory)

		await deployer.deploy(Registry, ProxyFactory.address)

		await deployer.deploy(Counterfactual)

		await deployer.link(Counterfactual, [
			ETHController,
			ConditionalTransfer,
			Nonce,
			ETHBalance,
			ETHRefund,
			ForceMoveGame,
		])

		await deployer.deploy(CFLib)

		await deployer.link(CFLib, [
			CFLibTester,
			ETHBalance
		])

		await deployer.deploy(MockRegistry)
	})
}
