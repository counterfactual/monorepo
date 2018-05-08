const ethers = require('ethers')
const utils = require('../helpers/utils.js')

const ETHBalance = artifacts.require("ETHBalance")
const Registry = artifacts.require("Registry")

const zeroAddr = '0x0000000000000000000000000000000000000000'
const zeroBytes32 = '0x0000000000000000000000000000000000000000000000000000000000000000'

contract('ETHBalance', (accounts) => {

    const provider = new ethers.providers.Web3Provider(web3.currentProvider)
    const signer = provider.getSigner()

    let ethbalance, nonce, moreGas

    const deployTx = ethers.Contract.getDeployTransaction(
        ETHBalance.binary,
        ETHBalance.abi,
        {
            owner: accounts[0],
            registry: Registry.address,
            id: 1337,
            deltaTimeout: 10,
            finalizesAt: 0,
            latestNonce: 0,
            wasDeclaredFinal: false,
            dependancy: {
				addr: '0x0',
				nonce: 0,
            }
        },
    )

    before(async () => {
        moreGas = {
            gasLimit: 4712388,
            gasPrice: await provider.getGasPrice(),
        }
    })

    beforeEach(async () => {
        const tx = (await signer.sendTransaction({
            gasLimit: 4712388,
            gasPrice: await provider.getGasPrice(),
            ...deployTx
        }))
        ethbalance = new ethers.Contract(
			ethers.utils.getContractAddress(tx),
			ETHBalance.abi,
			signer
        )
        nonce = 0
    })

    it("should have the correct params from constructor", async () => {
        const parameters = await ethbalance.objectStorage()

        assert.equal(accounts[0].toLowerCase(), parameters.owner.toLowerCase())
        assert.equal(Registry.address.toLowerCase(), parameters.registry.toLowerCase())
        assert.equal(1337, parameters.id)
        assert.equal(10, parameters.deltaTimeout)
        assert.equal(web3.eth.blockNumber + 10, parameters.finalizesAt)
        assert.equal(nonce, parameters.latestNonce)
        assert.equal(false, parameters.wasDeclaredFinal)
        assert.equal(zeroBytes32, parameters.dependancy.addr)
        assert.equal(0, parameters.dependancy.nonce)
    })

    it("should allow balance updates", async () => {
		const update = [{
			cfAddr: {addr: accounts[2], registry: zeroAddr},
			balance: ethers.utils.parseEther('97.0'),
		}, {
			cfAddr: {addr: accounts[3], registry: zeroAddr},
			balance: ethers.utils.parseEther('3.0'),
		}]
		await ethbalance.setState(update, zeroBytes32, ++nonce, moreGas)
		const state = await ethbalance.getState()
		assert.equal(
			state[0].cfAddr.addr.toLowerCase(),
			utils.toBytes32Str(accounts[2].toLowerCase())
		)
		assert.equal(
			state[1].cfAddr.addr.toLowerCase(),
			utils.toBytes32Str(accounts[3].toLowerCase())
		)
		assert.equal(ethers.utils.formatUnits(state[0].balance), '97.0')
        assert.equal(ethers.utils.formatUnits(state[1].balance), '3.0')
        assert.equal(await ethbalance.getLatestNonce(), 1)
    })

    it("should allow balance updates that change number of participants up", async () => {
		const update = [{
			cfAddr: {addr: accounts[2], registry: zeroAddr},
			balance: ethers.utils.parseEther('97.0'),
		}, {
			cfAddr: {addr: accounts[3], registry: zeroAddr},
			balance: ethers.utils.parseEther('3.0'),
		}, {
			cfAddr: {addr: accounts[4], registry: zeroAddr},
			balance: ethers.utils.parseEther('1.0'),
		}]

        await ethbalance.setState(update, zeroBytes32, ++nonce, moreGas)
		const state = await ethbalance.getState()

		assert.equal(
			state[0].cfAddr.addr.toLowerCase(),
			utils.toBytes32Str(accounts[2].toLowerCase())
		)
		assert.equal(
			state[1].cfAddr.addr.toLowerCase(),
			utils.toBytes32Str(accounts[3].toLowerCase())
		)
		assert.equal(
			state[2].cfAddr.addr.toLowerCase(),
			utils.toBytes32Str(accounts[4].toLowerCase())
		)

		assert.equal(ethers.utils.formatUnits(state[0].balance), '97.0')
        assert.equal(ethers.utils.formatUnits(state[1].balance), '3.0')
        assert.equal(ethers.utils.formatUnits(state[2].balance), '1.0')
        assert.equal(await ethbalance.getLatestNonce(), 1)
    })

    it("should allow balance updates that change number of participants down", async () => {
		const update = [{
            cfAddr: {addr: accounts[2], registry: zeroAddr},
            balance: ethers.utils.parseEther('97.0'),
        }, {
            cfAddr: {addr: accounts[3], registry: zeroAddr},
            balance: ethers.utils.parseEther('3.0'),
        }]
        await ethbalance.setState(update, zeroBytes32, ++nonce, moreGas)
		const state = await ethbalance.getState()
		assert.equal(
			state[0].cfAddr.addr.toLowerCase(),
			utils.toBytes32Str(accounts[2].toLowerCase())
		)
        assert.equal(ethers.utils.formatUnits(state[0].balance), '97.0')
        assert.equal(await ethbalance.getLatestNonce(), 1)
    })

    it("should reject balance updates sent from non-owners", async () => {
		const update = [{
            cfAddr: {addr:accounts[2], registry: zeroAddr},
            balance: ethers.utils.parseEther('97.0'),
        }, {
            cfAddr: {addr: accounts[3], registry: zeroAddr},
            balance: ethers.utils.parseEther('3.0'),
        }]

        await utils.assertRejects(
			ethbalance
				.connect(provider.getSigner(accounts[1]))
				.functions
				.setState(update, zeroBytes32, ++nonce)
        )
        assert.equal(await ethbalance.getLatestNonce(), 0)
    })

    it("should be finalizable by its owner", async () => {
        const ref2 = ethbalance.connect(provider.getSigner(accounts[1]))

        await utils.assertRejects(ref2.finalize())
        assert.equal(false, await ethbalance.isFinal())
        await ethbalance.finalize()
        assert.equal(true, await ethbalance.isFinal())
        assert.equal(await ethbalance.getLatestNonce(), 0)
    })

    it("should eventually be considered final", async () => {
        assert.equal(false, await ethbalance.isFinal())
        await utils.evm_mine(10)
        assert.equal(true, await ethbalance.isFinal())
        assert.equal(await ethbalance.getLatestNonce(), 0)
    })
})
