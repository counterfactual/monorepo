const ethers = require('ethers')

const {assertRejects} = require('../helpers/utils.js')

const CountingGame = artifacts.require("CountingGame")


const [START, FINAL] = [0, 1]

contract('Finite State Machine: CountingGame', (accounts) => {

    const provider = new ethers.providers.Web3Provider(web3.currentProvider)
    const signer = provider.getSigner()

    let countingGame

    beforeEach(async () => {
        
        countingGame = new ethers.Contract(
            (await CountingGame.new()).address,
            CountingGame.abi,
            signer
        )

    })

    it("should be able to handle START -> START", async () => {
        assert.equal(true, await countingGame.functions.validTransition({
            stateType: START,
            count: 0,
        }, {
            stateType: START,
            count: 1,
        }))
    })

    it("should be able to handle START -> FINAL", async () => {
        assert.equal(true, await countingGame.functions.validTransition({
            stateType: START,
            count: 0,
        }, {
            stateType: FINAL,
            count: 1,
        }))
    })

    it("should reject FINAL -> START", async () => {
        await assertRejects(countingGame.functions.validTransition({
            stateType: FINAL,
            count: 0,
        }, {
            stateType: START,
            count: 1,
        }))
    })

    it("should reject increments of 2", async () => {
        await assertRejects(countingGame.functions.validTransition({
            stateType: START,
            count: 0,
        }, {
            stateType: START,
            count: 2,
        }))
    })

})

