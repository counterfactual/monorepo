const ethers = require('ethers')

const utils = require('../helpers/utils.js')

const Registry = artifacts.require("Registry")
const ETHRefund = artifacts.require("ETHRefund")

const unusedAddr = '0x0000000000000000000000000000000000000001'
const zeroBytes32 = '0x0000000000000000000000000000000000000000000000000000000000000000'

contract('ETHRefund', (accounts) => {

    const provider = new ethers.providers.Web3Provider(web3.currentProvider)
    const signer = provider.getSigner()

    let ethRefund
    let id

    const deployTx = ethers.Contract.getDeployTransaction(
        ETHRefund.binary,
        ETHRefund.abi,
        {
            recipient: accounts[1],
            threshold: ethers.utils.parseEther('3'),
        },
        {
            owner: accounts[0],
            registry: Registry.address,
            id: 1337,
            deltaTimeout: 10,
            // Apparently you cannot ignore args and have them default
            finalizesAt: 0,
            latestNonce: 0,
            wasDeclaredFinal: false,
            dependancy: {
	            addr: '0x0',
	            nonce: 0,
            }
        },
    )

    beforeEach(async () => {
        const tx = (await signer.sendTransaction({
            gasLimit: 4712388,
            gasPrice: await provider.getGasPrice(),
            ...deployTx
        }))
        ethRefund = new ethers.Contract(
        	ethers.utils.getContractAddress(tx),
        	ETHRefund.abi,
        	signer
        )
    })

    it("should have the correct state from constructor", async () => {
        const {recipient, threshold} = await ethRefund.state()
		assert.equal(recipient.toLowerCase(), accounts[1].toLowerCase())
		assert.equal(ethers.utils.formatUnits(threshold), '3.0')
    })

    it("should have the correct params from constructor", async () => {
        const parameters = await ethRefund.objectStorage()

        assert.equal(accounts[0].toLowerCase(), parameters.owner.toLowerCase())
        assert.equal(
        	Registry.address.toLowerCase(),
        	parameters.registry.toLowerCase()
        )
        assert.equal(1337, parameters.id)
        assert.equal(10, parameters.deltaTimeout)
        assert.equal(web3.eth.blockNumber + 10, parameters.finalizesAt)
        assert.equal(0, parameters.latestNonce)
        assert.equal(false, parameters.wasDeclaredFinal)
        assert.equal(zeroBytes32, parameters.dependancy.addr)
        assert.equal(0, parameters.dependancy.nonce)
    })

    it("should allow state updates", async () => {
    	const update = {
        	recipient: accounts[2],
        	threshold: ethers.utils.parseEther('93'),
        }
        await ethRefund.functions.update(update)
        const {recipient, threshold} = await ethRefund.state()
		assert.equal(recipient.toLowerCase(), accounts[2].toLowerCase())
		assert.equal(ethers.utils.formatUnits(threshold), '93.0')
    })

    it("should reject balance updates sent from non-owners", async () => {
    	const update = {
        	recipient: accounts[2],
        	threshold: ethers.utils.parseEther('93'),
        }
        await utils.assertRejects(
        	ethRefund
	        	.connect(provider.getSigner(accounts[1]))
	        	.functions
	        	.update(update)
	    )
    })

    it("should be finalizable by its owner", async () => {
        const ref2 = ethRefund.connect(provider.getSigner(accounts[1]))

        await utils.assertRejects(ref2.finalize())
        assert.equal(false, await ethRefund.functions.isFinal())
        await ethRefund.finalize()
        assert.equal(true, await ethRefund.functions.isFinal())
    })

    it("should eventually be considered final", async () => {
        assert.equal(false, await ethRefund.functions.isFinal())
        await utils.evm_mine(10)
        assert.equal(true, await ethRefund.functions.isFinal())
    })

})

