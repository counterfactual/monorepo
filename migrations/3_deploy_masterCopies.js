const ethers = require('ethers')

const Registry = artifacts.require('./Registry.sol')
const Nonce = artifacts.require('./Nonce.sol')

const notOwnedAddress = '0x0000000000000000000000000000000000000001'

module.exports = async (deployer) => {

	// TODO in future version deploy master copies for use in proxying

    // const provider = new ethers.providers.Web3Provider(deployer.provider)
    // const signer = provider.getSigner()

	// deployer.then(async () => {
	//     const deployTx = (await signer.sendTransaction({
    //         gasLimit: 4712388,
    //         gasPrice: await provider.getGasPrice(),
    //         ...ethers.Contract.getDeployTransaction(
	// 	        Nonce.binary,
	// 	        Nonce.abi,
	// 	        {
	// 	            nonce: 0
	// 	        },
	// 	        {
	// 	            owner: await signer.getAddress(),
	// 	            registry: Registry.address,
	// 	            id: 0,
	// 	            deltaTimeout: 0,
	// 	            // Apparently you cannot ignore args and have them default
	// 	            finalizesAt: 0,
	// 	            latestNonce: 0,
	// 	            wasDeclaredFinal: false,
	// 	            dependancy: {
	// 		            addr: '0x',
	// 		            nonce: 0,
	// 	            }
	// 	        },
	// 	    )
    //     }))
	// })

}
