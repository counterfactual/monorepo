const ethers = require('ethers')

const utils = require('../helpers/utils.js')

const Registry = artifacts.require("Registry")
const ProxyFactory = artifacts.require("ProxyFactory")
const GnosisSafe = artifacts.require("GnosisSafe")
const ETHController = artifacts.require("ETHController")
const ETHBalance = artifacts.require("ETHBalance")

const unusedAddr = '0x0000000000000000000000000000000000000001'
const unusedBytes32 = '0x0000000000000000000000000000000000000000000000000000000000000001'
const zeroAddress = '0x0000000000000000000000000000000000000000'
const zeroBytes32 = '0x0000000000000000000000000000000000000000000000000000000000000000'

contract('ETHController', (accounts) => {

    const provider = new ethers.providers.Web3Provider(web3.currentProvider)
    const signer = provider.getSigner()

    let sc
    let id

    const testObjectStorage = {
        owner: accounts[0],
        registry: Registry.address,
        id: 0,
        deltaTimeout: 10,
        // Apparently you cannot ignore args and have them default
        finalizesAt: 0,
        latestNonce: 0,
        wasDeclaredFinal: false,
        dependancy: {
            addr: '0x0',
            nonce: 0,
        }
    }

    const testUpdate = [
        [{
            target: unusedBytes32,
            balance: ethers.utils.parseEther('1'),
        }],
        [{
            target: unusedAddr,
            balance: ethers.utils.parseEther('1.5'),
        }],
        1,
    ]

    beforeEach(async () => {

        const tx = (await signer.sendTransaction({
            gasLimit: 4712388,
            gasPrice: await provider.getGasPrice(),
            ...ethers.Contract.getDeployTransaction(
                ETHController.binary,
                ETHController.abi,
                testObjectStorage,
            )
        }))
        const addr = ethers.utils.getContractAddress(tx)
        sc = new ethers.Contract(addr, ETHController.abi, signer)

    })

    it("should have the correct params from constructor", async () => {
        const parameters = await sc.objectStorage()

        assert.equal(accounts[0].toLowerCase(), parameters.owner.toLowerCase())
        assert.equal(Registry.address.toLowerCase(), parameters.registry.toLowerCase())
        assert.equal(0, parameters.id)
        assert.equal(10, parameters.deltaTimeout)
        assert.equal(web3.eth.blockNumber + 10, parameters.finalizesAt)
        assert.equal(0, parameters.latestNonce)
        assert.equal(false, parameters.wasDeclaredFinal)
        assert.equal(zeroBytes32, parameters.dependancy.addr)
        assert.equal(0, parameters.dependancy.nonce)
    })

    it("should be able to set a counterfactual object and balance", async () => {

        await sc.functions.setState(...testUpdate, {
            gasLimit: 4712388,
            gasPrice: await provider.getGasPrice(),
        })

        assert.equal(await sc.lockedKeys(0), unusedBytes32)
        assert.equal(await sc.unlockedKeys(0), unusedAddr)
		assert.equal(ethers.utils.formatUnits(await sc.locked(unusedBytes32)), '1.0')
        assert.equal(ethers.utils.formatUnits(await sc.unlocked(unusedAddr)), '1.5')

    })

    it("should reject state updates sent from non-owners", async () => {
        await utils.assertRejects(
            sc
                .connect(provider.getSigner(accounts[1]))
                .functions
                .setState([], [], 2)
        )
    })

    it("should be finalizable by its owner", async () => {
        const ref = sc.connect(provider.getSigner(accounts[1]))
        await utils.assertRejects(ref.finalize())
        assert.equal(false, await sc.functions.isFinal())
        await sc.finalize()
        assert.equal(true, await sc.functions.isFinal())
    })

    it("should eventually be considered final", async () => {
        assert.equal(false, await sc.functions.isFinal())
        await utils.evm_mine(10)
        assert.equal(true, await sc.functions.isFinal())
    })


})

