const ethers = require('ethers')
const assert = require('assert')

const unusedAddr = '0x0000000000000000000000000000000000000001'
const zeroAddress = '0x0000000000000000000000000000000000000000'
const zeroBytes32 = '0x0000000000000000000000000000000000000000000000000000000000000000'

function signMessage (message, wallet) {
    const signingKey = new ethers.SigningKey(wallet.privateKey)
    const sig = signingKey.signDigest(message)
    return [sig.recoveryParam + 27, sig.r, sig.s]
}

function getParamFromTxEvent(transaction, eventName, paramName, contract, contractFactory) {
    let logs = transaction.logs
    if(eventName != null) {
        logs = logs.filter((l) => l.event === eventName && l.address === contract)
    }
    assert.equal(logs.length, 1, 'too many logs found!')
    let param = logs[0].args[paramName]
    if(contractFactory != null) {
        let contract = contractFactory.at(param)
        return contract
    } else {
        return param
    }
}

async function assertRejects(q, msg) {
    let res, catchFlag = false
    try {
        res = await q
    } catch(e) {
        catchFlag = true
    } finally {
        if(!catchFlag)
            assert.fail(res, null, msg)
    }
}

const evm_mine_one = function () {
    return new Promise((resolve, reject) => {
      web3.currentProvider.sendAsync({
        jsonrpc: "2.0",
        method: "evm_mine",
        id: new Date().getTime()
      }, (err, result) => {
        if(err){ return reject(err) }
        return resolve(result)
      });
    })
  }
  
  const evm_mine = async (blocks) => {
      for (var i=0; i<blocks; i++) await evm_mine_one();
  }

module.exports = {
    signMessage,
    unusedAddr,
    zeroAddress,
    zeroBytes32,
    getParamFromTxEvent,
    assertRejects,
    evm_mine,
}