// const ethers = require('ethers')

// const {
//     signMessage,
//     unusedAddr,
//     zeroAddress,
//     zeroBytes32,
// } = require('../helpers/utils.js')

// const {
//     deployCFObject,
//     deployMultisig,
// } = require('./helpers/cfhelpers.js')

// const CountingGame  = artifacts.require("CountingGame")
// const ETHBalance    = artifacts.require("ETHBalance")
// const ETHController = artifacts.require("ETHController")
// const GnosisSafe    = artifacts.require("GnosisSafe")
// const ProxyFactory  = artifacts.require("ProxyFactory")
// const Registry      = artifacts.require("Registry")


// contract('Forced Move Game', (accounts) => {

//     let registry, gnosisSafe, countingGame

//     const provider = new ethers.providers.Web3Provider(web3.currentProvider)
//     const signer = new ethers.Wallet.createRandom()

//     beforeEach(async () => {
//         registry = await Registry.deployed()

//         gnosisSafe = await deployMultisig([signer.address])

//         countingGame = new ethers.Contract(
//             (await CountingGame.new()).address,
//             CountingGame.abi,
//             signer
//         )

//     })

//     it("should be able to set up a forced move game", async () => {
       
//         // 1. CF Make a CounterGame LGTM


//         1. CF Make forced move game
//             args=
//                 cfaddr of the counter game

//         2. Sign some state

//     })

// })