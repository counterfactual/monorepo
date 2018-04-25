const ethers = require('ethers')

const GnosisSafe = artifacts.require('./GnosisSafe.sol')
const ProxyFactory = artifacts.require('./ProxyFactory.sol')
const Registry = artifacts.require('./Registry.sol')
const CFLib = artifacts.require('./CFLib.sol')
const BaseCFObject = artifacts.require('./BaseCFObject.sol')
const ETHController = artifacts.require('./ETHController.sol')
const ETHConditionalTransfer = artifacts.require('./ETHConditionalTransfer.sol')
const Nonce = artifacts.require('./Nonce.sol')
const ETHBalance = artifacts.require('./ETHBalance.sol')
const ETHRefund = artifacts.require('./ETHRefund.sol')
const CountingGame = artifacts.require('./CountingGame.sol')

const notOwnedAddress = '0x0000000000000000000000000000000000000001'

module.exports = async (deployer) => {
    const provider = new ethers.providers.Web3Provider(deployer.provider)
    const signer = provider.getSigner()

	deployer.then(async () => {
		await deployer.deploy(GnosisSafe, [notOwnedAddress], 1, 0, 0)

		await deployer.deploy(ProxyFactory)

	    await deployer.deploy(Registry, ProxyFactory.address)

		await deployer.deploy(CFLib)

		await deployer.link(CFLib, [
			BaseCFObject,
			ETHController,
			ETHConditionalTransfer,
			Nonce,
			ETHBalance,
			ETHRefund,
		])
		await deployer.deploy(BaseCFObject)

		await deployer.link(BaseCFObject, [
			ETHController,
			ETHConditionalTransfer,
			Nonce,
			ETHBalance,
			ETHRefund,
		])
	})
}
