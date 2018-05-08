const ethers = require('ethers')

const utils = require('../helpers/utils.js')

const Registry = artifacts.require("Registry")
const Counterfactual = artifacts.require("Counterfactual")

const zeroAddr = '0x0000000000000000000000000000000000000000'
const zeroBytes32 = '0x0000000000000000000000000000000000000000000000000000000000000000'

contract('Counterfactual', (accounts) => {

    const provider = new ethers.providers.Web3Provider(web3.currentProvider)
    const signer = provider.getSigner()

    let baseObject

    const deployTx = ethers.Contract.getDeployTransaction(
        Counterfactual.binary,
        Counterfactual.abi,
    )

    beforeEach(async () => {
        const tx = (await signer.sendTransaction({
            gasLimit: 4712388,
            gasPrice: await provider.getGasPrice(),
            ...deployTx
        }))
        baseObject = new ethers.Contract(
            ethers.utils.getContractAddress(tx),
            Counterfactual.abi,
            signer
        )
    })

    it("should initilize with default parameters", async () => {
        const parameters = await baseObject.objectStorage()

        assert.equal(zeroAddr, parameters[0])
        assert.equal(zeroAddr, parameters[1])
        assert.equal(false, parameters[2])
        assert.equal(0, parameters[3])
        assert.equal(0, parameters[4])
        assert.equal(0, parameters[5])
        assert.equal(0, parameters[6])
        assert.equal(zeroBytes32, parameters[7].addr)
        assert.equal(0, parameters[7].nonce)
    })

})

