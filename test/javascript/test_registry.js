const ethers = require('ethers')
const solc = require('solc')
const utils = require('./utils.js')

const Registry = artifacts.require('Registry')


contract('Registry', (accounts) => {

    let registry

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

        const codeHash = ethers.utils.solidityKeccak256(['bytes'], [bytecode])

        const TestContract = web3.eth.contract(interface);
        const testContract = utils.getParamFromTxEvent(
            await registry.deploySigned(bytecode, ...utils.ecsignMulti(codeHash, accounts.slice(0, 2))),
            'ContractCreated', 'deployedAddress', registry.address, TestContract, 'deploy'
        )

        const cfAddress = ethers.utils.solidityKeccak256(
            ['bytes', 'address[]'],
            [bytecode, [accounts[0], accounts[1]]]
        )

        assert.equal(
            await testContract.address,
            await registry.isDeployed.call(cfAddress)
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

        const codeHash = ethers.utils.solidityKeccak256(['bytes'], [bytecode])

        const TestContract = web3.eth.contract(interface);
        const testContract = utils.getParamFromTxEvent(
            await registry.deploy(bytecode),
            'ContractCreated', 'deployedAddress', registry.address, TestContract, 'deploy'
        )

        const cfAddress = ethers.utils.solidityKeccak256(
            ['bytes', 'address[]'],
            [bytecode, [accounts[0]]]
        )

        assert.equal(
            await testContract.address,
            await registry.isDeployed.call(cfAddress)
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

        const codeHash = ethers.utils.solidityKeccak256(['bytes'], [code])

        const [ r0, s0, v0 ] = utils.ecsign(codeHash, accounts[0])
        const [ r1, s1, v1 ] = utils.ecsign(codeHash, accounts[1])

        const cfAddress = ethers.utils.solidityKeccak256(
            ['bytes', 'address[]'],
            [code, [accounts[0], accounts[1]]]
        )

        const TestContract = web3.eth.contract(interface);
        const testContract = utils.getParamFromTxEvent(
            await registry.deploySigned(code, [v0, v1], [r0, r1], [s0, s1]),
            'ContractCreated', 'deployedAddress', registry.address, TestContract, 'deploy'
        )

        assert.equal(
            await testContract.address,
            await registry.isDeployed.call(cfAddress)
        )

        assert.equal(accounts[0], await testContract.sayHello())

    })

})


