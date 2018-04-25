const ethers = require('ethers')

const utils = require('../helpers/utils.js')

const Registry = artifacts.require("Registry")
const Nonce = artifacts.require("Nonce")

const unusedAddr = '0x0000000000000000000000000000000000000001'
const zeroBytes32 = '0x0000000000000000000000000000000000000000000000000000000000000000'

const STARTING_NONCE = 99

contract('Nonce', (accounts) => {

    const provider = new ethers.providers.Web3Provider(web3.currentProvider)
    const signer = provider.getSigner()

    const {bytecode, abi} = Nonce

    let nonce
    let id

    const deployTx = ethers.Contract.getDeployTransaction(
        Nonce.binary,
        Nonce.abi,
        {
            nonce: STARTING_NONCE,
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
        const addr = ethers.utils.getContractAddress(tx)
        nonce = new ethers.Contract(addr, Nonce.abi, signer)

    })

    it("should have the correct state from constructor", async () => {
        assert.equal(STARTING_NONCE, await nonce.state())
    })

    it("should have the correct params from constructor", async () => {
        const parameters = await nonce.objectStorage()

        assert.equal(accounts[0].toLowerCase(), parameters.owner.toLowerCase())
        assert.equal(Registry.address.toLowerCase(), parameters.registry.toLowerCase())
        assert.equal(1337, parameters.id)
        assert.equal(10, parameters.deltaTimeout)
        assert.equal(web3.eth.blockNumber + 10, parameters.finalizesAt)
        assert.equal(0, parameters.latestNonce)
        assert.equal(false, parameters.wasDeclaredFinal)
        assert.equal(zeroBytes32, parameters.dependancy.addr)
        assert.equal(0, parameters.dependancy.nonce)
    })

    it("should only allow positive nonce increments", async () => {
        await nonce.functions.update({nonce: STARTING_NONCE + 1})
        await nonce.functions.update({nonce: STARTING_NONCE + 2})
        await utils.assertRejects(nonce.functions.update({nonce: STARTING_NONCE + 2}))
        await utils.assertRejects(nonce.functions.update({nonce: STARTING_NONCE + 1}))
        await utils.assertRejects(nonce.functions.update({nonce: STARTING_NONCE}))
    })

    it("should reject state updates sent from non-owners", async () => {
        await utils.assertRejects(
            nonce
                .connect(provider.getSigner(accounts[1]))
                .functions
                .update({nonce: await nonce.state() + 1})
        )
    })

    it("should be finalizable by its owner", async () => {
        const nonceRef2 = nonce.connect(provider.getSigner(accounts[1]))

        await utils.assertRejects(nonceRef2.finalize())
        assert.equal(false, await nonce.functions.isFinal())
        await nonce.finalize()
        assert.equal(true, await nonce.functions.isFinal())
        assert.equal(STARTING_NONCE, await nonce.state())
    })

    it("should eventually be considered final", async () => {
        assert.equal(false, await nonce.functions.isFinal())
        await utils.evm_mine(10)
        assert.equal(true, await nonce.functions.isFinal())
        assert.equal(STARTING_NONCE, await nonce.state())
    })

})

