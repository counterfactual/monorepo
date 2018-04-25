const ethers = require('ethers')

const {
    zeroAddress,
    zeroBytes32,
    getParamFromTxEvent,
    signMessage,
} = require('./utils.js')

const GnosisSafe   = artifacts.require("GnosisSafe")
const ProxyFactory = artifacts.require("ProxyFactory")

async function deployMultisig(owners) {
    const proxyFactory = await ProxyFactory.deployed()
    return getParamFromTxEvent(
        await proxyFactory.createProxy(
            GnosisSafe.address,
            new ethers
                .Interface(GnosisSafe.abi)
                .deployFunction('0x', owners, 1, zeroAddress, zeroBytes32)
                .bytecode
        ),
        'ProxyCreation',
        'proxy',
        proxyFactory.address,
        GnosisSafe,
    )
}

async function deployCFObject(multisig, registry, signer, contract) {
    const bytecode = ethers.Contract.getDeployTransaction(
        contract.binary,
        contract.abi,
        {
            owner: multisig.address,
            registry: registry.address,
            id: 0,
            deltaTimeout: 10,
            finalizesAt: 0,
            latestNonce: 0,
            wasDeclaredFinal: false,
            dependancy: {
                addr: '0x0',
                nonce: 0,
            }
        },
    ).data
    const data = new ethers
        .Interface(registry.abi)
        .functions
        .deployAsOwner(bytecode)
        .data

    const txArgs = [registry.address, 0, data, 0]
    const tx = await multisig.executeTransaction(
        ...txArgs,
        ...signMessage(
            await multisig.getTransactionHash(...txArgs),
            signer
        ).map(x => [x]),
        [signer.address],
        []
    )
    const cfaddress = ethers.utils.solidityKeccak256(
        ['bytes', 'address[]'],
        [bytecode, [multisig.address]]
    )
    return {
        cfaddress,
        contract: new ethers.Contract(
            await registry.resolve(cfaddress),
            contract.abi,
            signer,
        )
    }
}

module.exports = {
    deployCFObject,
    deployMultisig
}