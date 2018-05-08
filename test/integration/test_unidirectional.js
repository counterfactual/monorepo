const ethers = require('ethers')
const solc = require('solc')

const {
    signMessage,
    unusedAddr,
    zeroAddress,
    zeroBytes32,
    evm_mine,
    assertRejects,
} = require('../helpers/utils.js')

const {
    deployCFObject,
    deployMultisig,
} = require('../helpers/cfhelpers.js')

const Registry = artifacts.require("Registry")
const UnidirectionalETHBalance = artifacts.require("UnidirectionalETHBalance")

contract('UnidirectionalETHBalance', (accounts) => {

    let registry, multisig, signer

    const provider = new ethers.providers.Web3Provider(web3.currentProvider)

    let i = 0;
    const defaultObjectStorage = (registry) => ({
        owner: accounts[0],
        registry: registry.address,
        id: i++,
        deltaTimeout: 10,
        finalizesAt: 0,
        latestNonce: 0,
        wasDeclaredFinal: false,
        dependancy: {
            addr: '0x0',
            nonce: 0,
        }
    })

    beforeEach(async () => {
        registry = await Registry.new(unusedAddr)
        signer = ethers.Wallet.createRandom()
        signer.provider = provider
    })

    it("Can instantly send money to the recipient", async () => {   

        const extraGas = {
            gasLimit: 4712388,
            gasPrice: await provider.getGasPrice(),
        }

        const multisig = await deployMultisig([signer.address])

        const cargs = [signer.address, signer.address, ethers.utils.parseEther('1')]
        const unidirectional = await deployCFObject(multisig, registry, signer, UnidirectionalETHBalance, cargs)

        const sig = signMessage(
            ethers.utils.solidityKeccak256(
                ['bytes1', 'address', 'uint256'],
                ['0x19', multisig.address, ethers.utils.parseEther('0.5')],
            ),
            signer
        )

        await unidirectional.contract.connect(await provider.getSigner()).setAmount(
            {v: sig[0], r: sig[1], s: sig[2]},
            {v: sig[0], r: sig[1], s: sig[2]},
            ethers.utils.parseEther('0.5')
        )

        assert.equal(
            (await unidirectional.contract.decidedAmount()).toString(),
            (ethers.utils.parseEther('0.5')).toString(),
        )

        assert.equal(
            (await unidirectional.contract.maxAmount()).toString(),
            (ethers.utils.parseEther('1.0')).toString(),
        )

        const moneybags = await provider.getSigner(accounts[0])
        await moneybags.sendTransaction({
            to: multisig.address,
            value: ethers.utils.parseEther('2.5'),
        })

        const data = new ethers
            .Interface(registry.abi)
            .functions
            .proxyDelegatecall(
                registry.address,
                unidirectional.cfaddress,
                new ethers
                    .Interface(UnidirectionalETHBalance.abi)
                    .functions
                    .claimAmount(registry.address, unidirectional.cfaddress)
                    .data
            )
            .data
        const txArgs = [registry.address, 0, data, 1]
        await multisig.executeTransaction(
            ...txArgs,
            ...signMessage(
                await multisig.getTransactionHash(...txArgs),
                signer
            ).map(x => [x]),
            [signer.address],
            []
        )

        assert.equal(
            (await provider.getBalance(multisig.address)).toString(),
            (ethers.utils.parseEther('2.0')).toString()
        )

        assert.equal(
            (await provider.getBalance(signer.address)).toString(),
            (ethers.utils.parseEther('0.5')).toString()
        )

        await assertRejects(
            unidirectional.contract.connect(await provider.getSigner()).setAmount(
                {v: sig[0], r: sig[1], s: sig[2]},
                {v: sig[0], r: sig[1], s: sig[2]},
                ethers.utils.parseEther('0.5')
            )
        )

    })


})