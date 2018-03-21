const fs = require('fs')

const PRECISION = 80
const Decimal = require('decimal.js').clone({ precision: PRECISION })

const ONE = Decimal(2).pow(64)

function isClose(a, b, relTol=1e9, absTol=1e18) {
    return Decimal(a.valueOf()).sub(b).abs().lte(
        Decimal.max(
            Decimal.max(
                Decimal.abs(a.valueOf()),
                Decimal.abs(b.valueOf())
            ).mul(relTol),
            absTol))
}

// random int in [a, b)
function randrange(a, b) {
    return Decimal.random(PRECISION).mul(Decimal(b.valueOf()).sub(a)).add(a).floor()
}

function getParamFromTxEvent(transaction, eventName, paramName, contract, contractFactory) {
    assert.isObject(transaction)
    let logs = transaction.logs
    if(eventName != null) {
        logs = logs.filter((l) => l.event === eventName && l.address === contract)
    }
    assert.equal(logs.length, 1, 'too many logs found!')
    let param = logs[0].args[paramName]
    if(contractFactory != null) {
        let contract = contractFactory.at(param)
        assert.isObject(contract, `getting ${paramName} failed for ${param}`)
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

function setupProxiesForGasStats(instance, gasStats) {
    new Set(instance.abi
        .filter(({ type }) => type === 'function')
    ).forEach(({ name: fnName, outputs: fnOutputs }) => {
        const wrapFn = (originalFn, estimateGas) => async function () {
            const result = await originalFn.apply(this, arguments)

            const datum = {
                args: Array.from(arguments).slice(0, fnOutputs.length),
                gasUsed: _.has(result, 'receipt') ?
                    result.receipt.gasUsed :
                    await estimateGas.apply(this, arguments),
            }

            let fnGasStats = gasStats[fnName]

            if(fnGasStats == null) {
                fnGasStats = {
                    data: [],
                }
                gasStats[fnName] = fnGasStats
            }

            fnGasStats.data.push(datum)

            return result
        }
        const original = instance[fnName]
        instance[fnName] = wrapFn(original, original.estimateGas)
        instance[fnName].call = wrapFn(original.call, original.estimateGas)
    })
}


function createGasStatCollectorBeforeHook(contracts) {
    return () => {
        if(process.env.COLLECT_GAS_STATS) {
            contracts.forEach((contract) => {
                contract.gasStats = {}

                const originalDeployed = contract.deployed
                contract.deployed = async function () {
                    const instance = await originalDeployed.apply(this, arguments)
                    setupProxiesForGasStats(instance, contract.gasStats)
                    return instance
                }

                const originalAt = contract.at
                contract.at = function () {
                    const instance = originalAt.apply(this, arguments)
                    setupProxiesForGasStats(instance, contract.gasStats)
                    return instance
                }
            })
        }
    }
}

const gasStatsFile = 'build/gas-stats.json'

function createGasStatCollectorAfterHook(contracts) {
    return () => {
        if(process.env.COLLECT_GAS_STATS) {
            const collectedData = _.fromPairs(contracts.map((contract) => [
                contract.contract_name,
                contract.gasStats,
            ]))

            let existingData
            try {
                existingData = JSON.parse(fs.readFileSync(gasStatsFile))
            } catch (e) {
                fs.writeFileSync(gasStatsFile, JSON.stringify(collectedData, null, 2))
                return
            }

            _.forEach(collectedData, (contractData, contractName) => {
                const existingContractData = existingData[contractName]
                if(existingContractData != null) {
                    _.forEach(contractData, (fnData, fnName) => {
                        const existingFnData = existingContractData[fnName]
                        if(existingFnData != null) {
                            Array.prototype.push.apply(existingFnData.data, fnData.data)
                        } else {
                            existingContractData[fnName] = fnData
                        }
                    })
                } else {
                    existingData[contractName] = contractData
                }
            })

            fs.writeFileSync(gasStatsFile, JSON.stringify(existingData, null, 2))
        }
    }
}

Object.assign(exports, {
    Decimal,
    ONE,
    isClose,
    randrange,
    getParamFromTxEvent,
    assertRejects,
    evm_mine,
    createGasStatCollectorBeforeHook,
    createGasStatCollectorAfterHook,
})
