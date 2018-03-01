const utils = require('./utils.js')

const Nonce = artifacts.require("Nonce")

const contracts = [Nonce]

contract('Nonce', (accounts) => {

    let nonce
    let id

    before(utils.createGasStatCollectorBeforeHook(contracts))
    after(utils.createGasStatCollectorAfterHook(contracts))

    before(async () => {
        id = utils.randrange(1, 10e9)
        nonce = await Nonce.new(accounts[0], id, '0x0', -1)
    })

    it("should set an owner", async () => {
        assert.equal(accounts[0], await nonce.owner())
    })

    it("should set its timeout", async () => {
        assert.equal(10, await nonce.finalizesAt() - web3.eth.blockNumber)
    })

    it("should only allow positive nonce increments", async () => {
        await nonce.update(1)
        await nonce.update(2)
        await utils.assertRejects(nonce.update(2))
    })

    it("should be finalizable by its owner", async () => {
        await utils.assertRejects(nonce.finalize({from: accounts[1]}))
        await nonce.finalize({from: accounts[0]})
        assert.equal(true, await nonce.isFinal('0x0'))
        assert.equal(2, await nonce.latestNonce())
    })

    it("should eventually be considered final", async () => {
        nonce = await Nonce.new(accounts[0], id + 1, '0x0', -1)
        await utils.evm_mine(10)
        assert.equal(true, await nonce.isFinal('0x0'))
        assert.equal(0, await nonce.latestNonce())
    })

})

