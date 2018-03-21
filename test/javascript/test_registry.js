const ethers = require('ethers')
const _ = require('lodash')
const solc = require('solc')
const utils = require('./utils.js')

const Registry = artifacts.require('Registry')


contract('Registry', (accounts) => {

    let registry

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
        registry = await Registry.deployed()
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
        const testContract = utils.getParamFromTxEvent(
            await registry.deploySigned(bytecode, signatures.v, signatures.r, signatures.s),
            'ContractCreated', 'deployedAddress', registry.address, TestContract,
        )

        const cfAddress = await registry.getCounterfactualAddress(
            bytecode,
            [signers[0].address, signers[1].address]
        )

        assert.equal(
            await testContract.address,
            await registry.resolve(cfAddress)
        )

        assert.equal('hi', await testContract.sayHello())
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
        const testContract = utils.getParamFromTxEvent(
            await registry.deployAsOwner(bytecode),
            'ContractCreated', 'deployedAddress', registry.address, TestContract,
        )

        const cfAddress = await registry.getCounterfactualAddress(bytecode, [accounts[0]])

        assert.equal(
            await testContract.address,
            await registry.resolve(cfAddress)
        )

        assert.equal('hi', await testContract.sayHello())
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

        const code = bytecode + ethers.Interface.encodeParams(
            ["address"], [accounts[0]]
        ).substr(2)

        const codeHash = await registry.getTransactionHash(code)

        const signatures = _.zipObject(['v', 'r', 's'], _.zip(
            signMessage(codeHash, signers[0]),
            signMessage(codeHash, signers[1]),
        ))

        const cfAddress = await registry.getCounterfactualAddress(
            code, [signers[0].address, signers[1].address]
        )

        const TestContract = web3.eth.contract(interface);
        const testContract = utils.getParamFromTxEvent(
            await registry.deploySigned(code, signatures.v, signatures.r, signatures.s),
            'ContractCreated', 'deployedAddress', registry.address, TestContract,
        )

        assert.equal(
            await testContract.address,
            await registry.resolve(cfAddress)
        )

        assert.equal(accounts[0], await testContract.sayHello())

    })

})


