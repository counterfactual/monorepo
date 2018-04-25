const ethers = require('ethers')
const solc = require('solc')

const {
    signMessage,
    unusedAddr,
    zeroAddress,
    zeroBytes32,
    evm_mine,
} = require('../helpers/utils.js')

const {
    deployCFObject,
    deployMultisig,
} = require('../helpers/cfhelpers.js')

const Registry = artifacts.require("Registry")
const ETHController = artifacts.require("ETHController")
const ETHConditionalTransfer = artifacts.require("ETHConditionalTransfer")

contract('ETHController', (accounts) => {

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

    it("Can handle simple transforms sent to it.", async () => {
        const szabo = 10e12

        const extraGas = {
            gasLimit: 4712388,
            gasPrice: await provider.getGasPrice(),
        }

        const forwarder = await (async () => {
            const source = `
            pragma solidity ^0.4.23;
            pragma experimental ABIEncoderV2;

            library TLib {
                struct Transform {
                    address[] receivers;
                    uint256[] amounts;
                }
            }
            interface IRegistry {
                function resolve(bytes32) returns (address);
            }
            interface IETHController {
                using TLib for TLib.Transform;
                function handleTransform(TLib.Transform);
            }
            contract Forwarder {
                using TLib for TLib.Transform;
                function sendTransform(address[] receivers, uint256[] amounts, address r, bytes32 cf) {
                    IETHController ec = IETHController(IRegistry(r).resolve(cf));
                    ec.handleTransform(TLib.Transform(receivers, amounts));
                }
            }`
            const output = await solc.compile(source, 0);
            const abi = JSON.parse(output.contracts[':Forwarder']['interface'])
            const bytecode = '0x' + output.contracts[':Forwarder']['bytecode']
            await registry.deployAsOwner(bytecode)
            const cfaddress = await registry.getCounterfactualAddress(
                bytecode,
                [accounts[0]]
            )
            return {
                cfaddress,
                contract: new ethers.Contract(
                    await registry.resolve(cfaddress),
                    abi,
                    await provider.getSigner(accounts[0]),
                )
            }
        })()

        const ethcontroller = await (async () => {
            const initcode = ethers.Contract.getDeployTransaction(
                ETHController.binary,
                ETHController.abi,
                defaultObjectStorage(registry),
            ).data
            await registry.deployAsOwner(initcode)
            const cfaddress = await registry.getCounterfactualAddress(initcode, [accounts[0]])
            return {
                cfaddress,
                contract: new ethers.Contract(
                    await registry.resolve(cfaddress),
                    ETHController.abi,
                    await provider.getSigner(accounts[0]),
                )
            }
        })()

        const update = [
            [{
                target: forwarder.cfaddress,
                balance: ethers.utils.parseEther('1'),
            }],
            [{
                target: accounts[0],
                balance: ethers.utils.parseEther('1.5'),
            }],
            1,
        ]    

        await ethcontroller.contract.setState(...update, extraGas)

        await forwarder.contract.sendTransform(
            [accounts[0]],
            [ethers.utils.parseEther('1')],
            registry.address,
            ethcontroller.cfaddress
        )

        assert.equal(
            await ethcontroller.contract.lockedKeys(0),
            zeroBytes32
        )
        assert.equal(
            (await ethcontroller.contract.unlockedKeys(0)).toLowerCase(),
            accounts[0].toLowerCase()
        )
        assert.equal(
            ethers.utils.formatUnits(await ethcontroller.contract.unlocked(accounts[0])),
            '2.5'
        )

    })

    it("Can handle transforms sent to it by ETHConditionalTransfer", async () => {   

        const extraGas = {
            gasLimit: 4712388,
            gasPrice: await provider.getGasPrice(),
        }

        const condition = await (async () => {
            const source = `
            contract SimpleResult {
                function getResult() returns (uint256) {
                    return 0;
                }
            }`
            const output = await solc.compile(source, 0);
            const abi = JSON.parse(output.contracts[':SimpleResult']['interface'])
            const bytecode = '0x' + output.contracts[':SimpleResult']['bytecode']
            await registry.deployAsOwner(bytecode)
            const cfaddress = await registry.getCounterfactualAddress(bytecode, [accounts[0]])
            return {
                cfaddress,
                contract: new ethers.Contract(
                    await registry.resolve(cfaddress),
                    abi,
                    await provider.getSigner(accounts[0]),
                )
            }
        })()

        const condtransfer = await (async () => {
            const initcode = ethers.Contract.getDeployTransaction(
                ETHConditionalTransfer.binary,
                ETHConditionalTransfer.abi,
                defaultObjectStorage(registry),
            ).data
            await registry.deployAsOwner(initcode)
            const cfaddress = await registry.getCounterfactualAddress(initcode, [accounts[0]])
            return {
                cfaddress,
                contract: new ethers.Contract(
                    await registry.resolve(cfaddress),
                    ETHConditionalTransfer.abi,
                    await provider.getSigner(accounts[0]),
                )
            }
        })()

        const ethcontroller = await (async () => {
            const initcode = ethers.Contract.getDeployTransaction(
                ETHController.binary,
                ETHController.abi,
                defaultObjectStorage(registry),
            ).data
            await registry.deployAsOwner(initcode)
            const cfaddress = await registry.getCounterfactualAddress(initcode, [accounts[0]])
            return {
                cfaddress,
                contract: new ethers.Contract(
                    await registry.resolve(cfaddress),
                    ETHController.abi,
                    await provider.getSigner(accounts[0]),
                )
            }
        })()

        const update = [
            [{
                target: condtransfer.cfaddress,
                balance: ethers.utils.parseEther('1'),
            }],
            [{
                target: accounts[0],
                balance: ethers.utils.parseEther('1.5'),
            }],
            1,
        ]    

        await ethcontroller.contract.setState(...update, extraGas)
        
        await condtransfer.contract.setState(
            ethcontroller.cfaddress,
            condition.cfaddress,
            [{
                receivers: [accounts[0]],
                amounts: [ethers.utils.parseEther('1.0')],
            }],
            1,
            extraGas
        )

        await condtransfer.contract.finalize()

        await condtransfer.contract.resolve()

        assert.equal(
            await ethcontroller.contract.lockedKeys(0),
            zeroBytes32
        )
        assert.equal(
            (await ethcontroller.contract.unlockedKeys(0)).toLowerCase(),
            accounts[0].toLowerCase()
        )
        assert.equal(
            ethers.utils.formatUnits(await ethcontroller.contract.unlocked(accounts[0])),
            '2.5'
        )

    })

    it("Can flush all amounts to owners via delegatecall", async () => {   

        const extraGas = {
            gasLimit: 4712388,
            gasPrice: await provider.getGasPrice(),
        }

        const multisig = await deployMultisig([signer.address])

        const ethcontroller = await deployCFObject(multisig, registry, signer, ETHController)

        const update = [
            [],
            [{
                target: signer.address,
                balance: ethers.utils.parseEther('2.5'),
            }],
            1,
        ]

        const data1 = new ethers
            .Interface(registry.abi)
            .functions
            .proxyCall(
                registry.address,
                ethcontroller.cfaddress,
                new ethers
                    .Interface(ETHController.abi)
                    .functions
                    .setState(...update)
                    .data
            )
            .data
        const txArgs1 = [registry.address, 0, data1, 1]
        await multisig.executeTransaction(
            ...txArgs1,
            ...signMessage(
                await multisig.getTransactionHash(...txArgs1),
                signer
            ).map(x => [x]),
            [signer.address],
            []
        )

        const moneybags = await provider.getSigner(accounts[0])
        await moneybags.sendTransaction({
            to: multisig.address,
            value: ethers.utils.parseEther('2.5'),
        })

        await evm_mine(9)

        const data = new ethers
            .Interface(registry.abi)
            .functions
            .proxyDelegatecall(
                registry.address,
                ethcontroller.cfaddress,
                new ethers
                    .Interface(ETHController.abi)
                    .functions
                    .flush(registry.address, ethcontroller.cfaddress)
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
            (ethers.utils.parseEther('0')).toString()
        )

        assert.equal(
            (await provider.getBalance(signer.address)).toString(),
            (ethers.utils.parseEther('2.5')).toString()
        )

    })


})