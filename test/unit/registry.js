const ethers = require('ethers')
const _ = require('lodash')
const solc = require('solc')

const utils = require('../helpers/utils.js')

const ProxyFactory = artifacts.require('ProxyFactory')
const Registry = artifacts.require('Registry')

const zeroBytes32 = '0x0000000000000000000000000000000000000000000000000000000000000000'

// skip these tests until https://github.com/trufflesuite/ganache-core/issues/98 is resolved
contract.skip('Registry', (accounts) => {

    let registry, simpleContract

    function signMessage (message, wallet) {
        const signingKey = new ethers.SigningKey(wallet.privateKey)
        const sig = signingKey.signDigest(message)
        return [sig.recoveryParam + 27, sig.r, sig.s]
    }

    let signers = [
        new ethers.Wallet.createRandom(),
        new ethers.Wallet.createRandom(),
    ].sort((a, b) => a.address > b.address)

    before(async () => {
        registry = await Registry.new(ProxyFactory.address)
    })

    it("computes counterfactual addresses of bytes deployments", async () => {
        assert.equal(
            ethers.utils.solidityKeccak256(
                ['bytes', 'address[]'],
                [zeroBytes32, [accounts[0]]]
            ),
            await registry.getCounterfactualAddress(
                zeroBytes32,
                [accounts[0]]
            )
        )
    })

    it("deploys a contract", async () => {

        let source = `
        contract Test {
            function sayHello() public pure returns (string) {
                return "hi";
            }
        }`
        let output = await solc.compile(source, 0);
        let interface = JSON.parse(output.contracts[':Test']['interface'])
        let bytecode = '0x' + output.contracts[':Test']['bytecode']

        const codeHash = await registry.getTransactionHash(bytecode)

        const signatures = _.zipObject(['v', 'r', 's'], _.zip(
            signMessage(codeHash, signers[0]),
            signMessage(codeHash, signers[1]),
        ))

        const TestContract = web3.eth.contract(interface);
        const tx = await registry.deploySigned(bytecode, signatures.v, signatures.r, signatures.s)
        simpleContract = utils.getParamFromTxEvent(
            tx, 'ContractCreated', 'deployedAddress', registry.address, TestContract,
        )

        const cfAddress = ethers.utils.solidityKeccak256(['bytes', 'address[]'], [
            bytecode,
            [signers[0].address, signers[1].address]
        ])

        assert.equal(
            await simpleContract.address,
            await registry.resolve(cfAddress)
        )

        assert.equal('hi', await simpleContract.sayHello())
    })

    it("deploys a contract using msg.sender", async () => {

        let source = `
        contract Test {
            function sayHello() public pure returns (string) {
                return "hi";
            }
        }`
        let output = await solc.compile(source, 0);
        let interface = JSON.parse(output.contracts[':Test']['interface'])
        let bytecode = '0x' + output.contracts[':Test']['bytecode']

        const TestContract = web3.eth.contract(interface);
        const tx = await registry.deployAsOwner(bytecode)
        const testContract = utils.getParamFromTxEvent(
            tx, 'ContractCreated', 'deployedAddress', registry.address, TestContract,
        )

        const cfAddress = ethers.utils.solidityKeccak256(['bytes', 'address[]'], [
            bytecode,
            [accounts[0]]
        ])

        assert.equal(
            await testContract.address,
            await registry.resolve(cfAddress)
        )

        assert.equal(
            cfAddress,
            await registry.reverseResolve(await testContract.address)
        )

        assert.equal('hi', await testContract.sayHello())
    })

    it("deploys a contract through the ProxyFactory as owner", async () => {
        const params = '0x'

        const cfAddress = ethers.utils.solidityKeccak256(
            ['address', 'bytes', 'address[]'],
            [simpleContract.address, params, [accounts[0]]
        ])

        const TestContract = web3.eth.contract(simpleContract.abi);
        const tx = await registry.deployAsOwnerProxy(simpleContract.address, params)
        const testContract = utils.getParamFromTxEvent(
            tx, 'ContractCreated', 'deployedAddress', registry.address, TestContract,
        )

        assert.equal(
            await testContract.address,
            await registry.resolve(cfAddress)
        )

        assert.equal(
            cfAddress,
            await registry.reverseResolve(await testContract.address)
        )

        assert.equal("hi", await testContract.sayHello())
    })

    it("deploys a contract through the ProxyFactory signed", async () => {
        const params = '0x'

        const codeHash = await registry.getTransactionHash(params)

        const signatures = _.zipObject(['v', 'r', 's'], _.zip(
            signMessage(codeHash, signers[0]),
            signMessage(codeHash, signers[1]),
        ))

        const cfAddress = ethers.utils.solidityKeccak256(
            ['address', 'bytes', 'address[]'],
            [simpleContract.address, params, [signers[0].address, signers[1].address]
        ])

        const TestContract = web3.eth.contract(simpleContract.abi);
        const tx = await registry.deploySignedProxy(
            simpleContract.address,
            params,
            signatures.v,
            signatures.r,
            signatures.s
        )
        const testContract = utils.getParamFromTxEvent(
            tx, 'ContractCreated', 'deployedAddress', registry.address, TestContract,
        )

        assert.equal(
            await testContract.address,
            await registry.resolve(cfAddress)
        )

        assert.equal(
            cfAddress,
            await registry.reverseResolve(await testContract.address)
        )

        assert.equal("hi", await testContract.sayHello())
    })

    it("deploys a contract and passes arguments", async () => {

        let source = `
        contract Test {
            address whatToSay;
            function Test(address _whatToSay) public {
                whatToSay = _whatToSay;
            }
            function sayHello() public view returns (address) {
                return whatToSay;
            }
        }`
        let output = await solc.compile(source, 0);
        let interface = JSON.parse(output.contracts[':Test']['interface'])
        let bytecode = '0x' + output.contracts[':Test']['bytecode']

        const code = bytecode + ethers.utils.AbiCoder.defaultCoder.encode(
            ["address"], [accounts[0]]
        ).substr(2)

        const codeHash = await registry.getTransactionHash(code)

        const signatures = _.zipObject(['v', 'r', 's'], _.zip(
            signMessage(codeHash, signers[0]),
            signMessage(codeHash, signers[1]),
        ))

        const cfAddress = ethers.utils.solidityKeccak256(['bytes', 'address[]'], [
            code,
            [signers[0].address, signers[1].address]
        ])

        const TestContract = web3.eth.contract(interface);
        const tx = await registry.deploySigned(code, signatures.v, signatures.r, signatures.s)
        const testContract = utils.getParamFromTxEvent(
            tx, 'ContractCreated', 'deployedAddress', registry.address, TestContract,
        )

        assert.equal(
            await testContract.address,
            await registry.resolve(cfAddress)
        )

        assert.equal(
            cfAddress,
            await registry.reverseResolve(await testContract.address)
        )

        assert.equal(accounts[0], await testContract.sayHello())

    })

<<<<<<< HEAD
})
=======
})
>>>>>>> a85f5ee0645b04df71f79a0379bec8762fa09727
