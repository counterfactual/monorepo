import { assert } from "chai";
import * as ethers from "ethers";

import { zeroAddress } from "../helpers/utils.js";

import { deployMultisig, getCFHelper } from "../helpers/cfhelpers.js";

const AssetDispatcher = artifacts.require("AssetDispatcher");
const ETHForwarder = artifacts.require("ETHForwarder");
const ConditionalTransfer = artifacts.require("ConditionalTransfer");
const Registry = artifacts.require("Registry");

const BytesApp = artifacts.require("BytesApp");

const MetachannelModule = artifacts.require("MetachannelModule");
const TwoPlayerGameModule = artifacts.require("TwoPlayerGameModule");

contract("Metachannel", accounts => {
  const web3 = (global as any).web3;

  let registry: ethers.Contract;
  let assetDispatcher: ethers.Contract;
  let conditionalTransfer: ethers.Contract;
  let signer: ethers.Wallet;

  const provider = new ethers.providers.Web3Provider(web3.currentProvider);

  beforeEach(async () => {
    registry = new ethers.Contract(
      (await Registry.deployed()).address,
      Registry.abi,
      await provider.getSigner(accounts[0]) // uses signer for registry.deploy
    );
    assetDispatcher = new ethers.Contract(
      (await AssetDispatcher.deployed()).address,
      AssetDispatcher.abi,
      provider
    );
    conditionalTransfer = new ethers.Contract(
      (await ConditionalTransfer.deployed()).address,
      ConditionalTransfer.abi,
      provider
    );
    signer = ethers.Wallet.createRandom({}).connect(provider);
  });

  it("allows A and C to route through B for payments", async () => {
    // Situation
    //     0.5          0.5   0.5           0.5
    // (A) --------------- (B) --------------- (C)
    //   \                 / \                 /
    //    \____ethbal_____/   \____ethbal_____/
    //            |                   |
    //             \_____multisig____/
    //                      |
    //               0.5 ethbal 0.5

    const [A, B, C] = [
      // 0xb37e49bFC97A948617bF3B63BC6942BB15285715
      new ethers.Wallet(
        "0x4ccac8b1e81fb18a98bbaf29b9bfe307885561f71b76bd4680d7aec9d0ddfcfd"
      ),
      // 0xaeF082d339D227646DB914f0cA9fF02c8544F30b
      new ethers.Wallet(
        "0x3570f77380e22f8dc2274d8fd33e7830cc2d29cf76804e8c21f4f7a6cc571d27"
      ),
      // 0xAdEC4a9DB6cBeF4F281c675928D0EeD18c456857
      new ethers.Wallet(
        "0xaf88f3efeb9aebe15de20e6f15d037317f122e9ff45352b1237e52fbc2c37b8a"
      )
    ];

    const moneybags = await provider.getSigner(accounts[0]);

    ///////////////////////////////////////////////////////////////////////////
    //
    // Setup the AB channel.
    //
    const multisigAB = await deployMultisig([signer.address]);
    const helperAB = await getCFHelper(multisigAB, registry, provider);

    await moneybags.sendTransaction({
      to: multisigAB.address,
      value: ethers.utils.parseEther("1")
    });

    ///////////////////////////////////////////////////////////////////////////
    //
    // Setup the BC channel.
    //
    const multisigBC = await deployMultisig([signer.address]);
    const helperBC = await getCFHelper(multisigBC, registry, provider);

    await moneybags.sendTransaction({
      to: multisigBC.address,
      value: ethers.utils.parseEther("1")
    });

    ///////////////////////////////////////////////////////////////////////////
    //
    // Setup the AC channel.
    //
    // Note, in this test the multisig gets deployed onchain. In reality, this
    // would be a counterfactual object.
    //
    // The key property for the test is that we set the balances to
    // A = 0.25, C = 0.75 despite the fact the actual multisig has 0 in it.
    //
    const multisigAC = await deployMultisig([signer.address]);
    const helperAC = await getCFHelper(multisigAC, registry, provider);

    const balanceAC = await helperAC.deployAppWithState(
      BytesApp,
      "tuple(tuple(address,bytes32),uint256)[]",
      [
        [
          [
            zeroAddress,
            ethers.utils.defaultAbiCoder.encode(["bytes32"], [A.address])
          ],
          ethers.utils.parseEther("0.25")
        ],
        [
          [
            zeroAddress,
            ethers.utils.defaultAbiCoder.encode(["bytes32"], [C.address])
          ],
          ethers.utils.parseEther("0.75")
        ],
        [
          [
            zeroAddress,
            ethers.utils.defaultAbiCoder.encode(
              ["bytes32"],
              [multisigAC.address]
            )
          ],
          ethers.utils.parseEther("0")
        ]
      ],
      signer
    );

    ///////////////////////////////////////////////////////////////////////////
    //
    // Setup the AB+BC shared forwarder.
    //
    const forwarder = await helperAC.deploy(ETHForwarder, [
      helperAC.cfaddressOf(multisigAC),
      helperAC.cfaddressOf(B)
    ]);

    ///////////////////////////////////////////////////////////////////////////
    //
    // Trigger the collapse of AB channel and the BC channel. Should result
    // in the AC channel being changed from meta to "real" and then exiting
    // that channel should lead to A = 0.25 and C = 0.75.
    //
    const metachannelAB = await helperAC.deploy(MetachannelModule, [
      A.address,
      B.address,
      ethers.utils.parseEther("1"),
      helperAC.cfaddressOf(multisigAC),
      helperAC.cfaddressOf(forwarder)
    ]);
    await helperAB.delegatecall(
      conditionalTransfer.address,
      signer,
      conditionalTransfer.interface.functions.makeConditionalTransfer.encode([
        [
          /* No conditions in this test, normally there would be a nonce here. */
        ],
        {
          dest: helperAB.cfaddressOf(balanceAC),
          selector:
            balanceAC.contract.interface.functions.getExternalState.sighash
        },
        [
          {
            dest: helperAB.cfaddressOf(metachannelAB),
            selector:
              metachannelAB.contract.interface.functions.interpretAsBytes
                .sighash
          }
        ],
        {
          dest: helperAB.cfaddressOf(assetDispatcher),
          selector: assetDispatcher.interface.functions.transferETH.sighash
        }
      ])
    );

    assert.equal(
      (await provider.getBalance(A.address)).toString(),
      ethers.utils.parseEther("0").toString()
    );

    assert.equal(
      (await provider.getBalance(B.address)).toString(),
      ethers.utils.parseEther("0.75").toString()
    );

    assert.equal(
      (await provider.getBalance(C.address)).toString(),
      ethers.utils.parseEther("0").toString()
    );

    assert.equal(
      (await provider.getBalance(multisigAB.address)).toString(),
      ethers.utils.parseEther("0").toString()
    );

    assert.equal(
      (await provider.getBalance(multisigBC.address)).toString(),
      ethers.utils.parseEther("1").toString()
    );

    assert.equal(
      (await provider.getBalance(multisigAC.address)).toString(),
      ethers.utils.parseEther("0.25").toString()
    );

    const metachannelBC = await helperAC.deploy(MetachannelModule, [
      C.address,
      B.address,
      ethers.utils.parseEther("1"),
      helperAC.cfaddressOf(multisigAC),
      helperAC.cfaddressOf(forwarder)
    ]);
    await helperBC.delegatecall(
      conditionalTransfer.address,
      signer,
      conditionalTransfer.interface.functions.makeConditionalTransfer.encode([
        [
          /* No conditions in this test, normally there would be a nonce here. */
        ],
        {
          dest: helperBC.cfaddressOf(balanceAC),
          selector:
            balanceAC.contract.interface.functions.getExternalState.sighash
        },
        [
          {
            dest: helperBC.cfaddressOf(metachannelBC),
            selector:
              metachannelBC.contract.interface.functions.interpretAsBytes
                .sighash
          }
        ],
        {
          dest: helperBC.cfaddressOf(assetDispatcher),
          selector: assetDispatcher.interface.functions.transferETH.sighash
        }
      ])
    );

    assert.equal(
      (await provider.getBalance(A.address)).toString(),
      ethers.utils.parseEther("0").toString()
    );

    assert.equal(
      (await provider.getBalance(B.address)).toString(),
      ethers.utils.parseEther("1").toString()
    );

    assert.equal(
      (await provider.getBalance(C.address)).toString(),
      ethers.utils.parseEther("0").toString()
    );

    assert.equal(
      (await provider.getBalance(multisigAB.address)).toString(),
      ethers.utils.parseEther("0").toString()
    );

    assert.equal(
      (await provider.getBalance(multisigBC.address)).toString(),
      ethers.utils.parseEther("0").toString()
    );

    assert.equal(
      (await provider.getBalance(multisigAC.address)).toString(),
      ethers.utils.parseEther("1").toString()
    );

    await helperAC.delegatecall(
      conditionalTransfer.address,
      signer,
      conditionalTransfer.interface.functions.makeConditionalTransfer.encode([
        [
          /* No conditions in this test, normally there would be a nonce here. */
        ],
        {
          dest: helperAC.cfaddressOf(balanceAC),
          selector:
            balanceAC.contract.interface.functions.getExternalState.sighash
        },
        [
          /* No interpreters for the metachannel ethbalance */
        ],
        {
          dest: helperAC.cfaddressOf(assetDispatcher),
          selector: assetDispatcher.interface.functions.transferETH.sighash
        }
      ])
    );

    assert.equal(
      (await provider.getBalance(A.address)).toString(),
      ethers.utils.parseEther("0.25").toString()
    );

    assert.equal(
      (await provider.getBalance(B.address)).toString(),
      ethers.utils.parseEther("1").toString()
    );

    assert.equal(
      (await provider.getBalance(C.address)).toString(),
      ethers.utils.parseEther("0.75").toString()
    );

    assert.equal(
      (await provider.getBalance(multisigAB.address)).toString(),
      ethers.utils.parseEther("0").toString()
    );

    assert.equal(
      (await provider.getBalance(multisigBC.address)).toString(),
      ethers.utils.parseEther("0").toString()
    );

    assert.equal(
      (await provider.getBalance(multisigAC.address)).toString(),
      ethers.utils.parseEther("0").toString()
    );
  });

  it("allows A and C to route through B for state", async () => {
    // Situation
    //     0.5          0.5   0.5           0.5
    // (A) --------------- (B) --------------- (C)
    //   \                 / \                 /
    //    \____ethbal_____/   \____ethbal_____/
    //            |                   |
    //             \_____multisig____/
    //                      |
    //           ethbal-----+-----tictactoe
    //                          (winner gets 1)

    const [A, B, C] = [
      // 0x0298E8d11e2aa5CD9aC29E96F8A21F4C87D629c5
      new ethers.Wallet(
        "0xe49707afef987c83f5ac9d90e3c447f2435f0dd61d4e2626e19a7e25a68cf876"
      ),
      // 0xEbe694d4272b56462cE6d563A4788f379b2F8b4C
      new ethers.Wallet(
        "0xbb617bd390a2a52fa96faa3bdf8432334821174a2b356adca6115b63fe4f5f8d"
      ),
      // 0xe276e2C8aD5655de33C5B9dB255F68236adb7239
      new ethers.Wallet(
        "0x2b7547a0ee3e2fadf28222a0f9a3013ee4c346624c76fef9295e70b737b77982"
      )
    ];

    const moneybags = await provider.getSigner(accounts[0]);

    ///////////////////////////////////////////////////////////////////////////
    //
    // Setup the AB channel.
    //
    const multisigAB = await deployMultisig([signer.address]);
    const helperAB = await getCFHelper(multisigAB, registry, provider);

    await moneybags.sendTransaction({
      to: multisigAB.address,
      value: ethers.utils.parseEther("1")
    });

    ///////////////////////////////////////////////////////////////////////////
    //
    // Setup the BC channel.
    //
    const multisigBC = await deployMultisig([signer.address]);
    const helperBC = await getCFHelper(multisigBC, registry, provider);

    await moneybags.sendTransaction({
      to: multisigBC.address,
      value: ethers.utils.parseEther("1")
    });

    ///////////////////////////////////////////////////////////////////////////
    //
    // Setup the AC channel.
    //
    // Note, in this test the multisig gets deployed onchain. In reality, this
    // would be a counterfactual object.
    //
    const multisigAC = await deployMultisig([signer.address]);
    const helperAC = await getCFHelper(multisigAC, registry, provider);

    const balanceAC = await helperAC.deployAppWithState(
      BytesApp,
      "tuple(tuple(address,bytes32),uint256)[]",
      [
        [
          [
            zeroAddress,
            ethers.utils.defaultAbiCoder.encode(["bytes32"], [A.address])
          ],
          ethers.utils.parseEther("0.1")
        ],
        [
          [
            zeroAddress,
            ethers.utils.defaultAbiCoder.encode(["bytes32"], [C.address])
          ],
          ethers.utils.parseEther("0.1")
        ],
        [
          [
            zeroAddress,
            ethers.utils.defaultAbiCoder.encode(
              ["bytes32"],
              [multisigAC.address]
            )
          ],
          ethers.utils.parseEther("0.8")
        ]
      ],

      signer
    );

    ///////////////////////////////////////////////////////////////////////////
    //
    // Setup the AB+BC shared forwarder.
    //
    const forwarder = await helperBC.deploy(ETHForwarder, [
      helperAC.cfaddressOf(multisigAC),
      helperAC.cfaddressOf(B)
    ]);

    ///////////////////////////////////////////////////////////////////////////
    //
    // Trigger the collapse of AB channel and the BC channel. Should result
    // in the AC channel being changed from meta to "real" and then exiting
    // that channel should lead to A = 0.25 and C = 0.75.
    //
    const metachannelAB = await helperAB.deploy(MetachannelModule, [
      A.address,
      B.address,
      ethers.utils.parseEther("1"),
      helperAB.cfaddressOf(multisigAC),
      helperAB.cfaddressOf(forwarder)
    ]);

    await helperAB.delegatecall(
      conditionalTransfer.address,
      signer,
      conditionalTransfer.interface.functions.makeConditionalTransfer.encode([
        [
          /* No conditions in this test, normally there would be a nonce here. */
        ],
        {
          dest: helperAB.cfaddressOf(balanceAC),
          selector:
            balanceAC.contract.interface.functions.getExternalState.sighash
        },
        [
          {
            dest: helperAB.cfaddressOf(metachannelAB),
            selector:
              metachannelAB.contract.interface.functions.interpretAsBytes
                .sighash
          }
        ],
        {
          dest: helperAB.cfaddressOf(assetDispatcher),
          selector: assetDispatcher.interface.functions.transferETH.sighash
        }
      ])
    );

    assert.equal(
      (await provider.getBalance(A.address)).toString(),
      ethers.utils.parseEther("0").toString()
    );

    assert.equal(
      (await provider.getBalance(B.address)).toString(),
      ethers.utils.parseEther("0.1").toString()
    );

    assert.equal(
      (await provider.getBalance(C.address)).toString(),
      ethers.utils.parseEther("0").toString()
    );

    assert.equal(
      (await provider.getBalance(multisigAB.address)).toString(),
      ethers.utils.parseEther("0").toString()
    );

    assert.equal(
      (await provider.getBalance(multisigBC.address)).toString(),
      ethers.utils.parseEther("1").toString()
    );

    assert.equal(
      (await provider.getBalance(multisigAC.address)).toString(),
      ethers.utils.parseEther("0.9").toString()
    );

    const metachannelBC = await helperBC.deploy(MetachannelModule, [
      C.address,
      B.address,
      ethers.utils.parseEther("1"),
      helperBC.cfaddressOf(multisigAC),
      helperBC.cfaddressOf(forwarder)
    ]);
    await helperBC.delegatecall(
      conditionalTransfer.address,
      signer,
      conditionalTransfer.interface.functions.makeConditionalTransfer.encode([
        [
          /* No conditions in this test, normally there would be a nonce here. */
        ],
        {
          dest: helperBC.cfaddressOf(balanceAC),
          selector:
            balanceAC.contract.interface.functions.getExternalState.sighash
        },
        [
          {
            dest: helperBC.cfaddressOf(metachannelBC),
            selector:
              metachannelBC.contract.interface.functions.interpretAsBytes
                .sighash
          }
        ],
        {
          dest: helperBC.cfaddressOf(assetDispatcher),
          selector: assetDispatcher.interface.functions.transferETH.sighash
        }
      ])
    );

    assert.equal(
      (await provider.getBalance(A.address)).toString(),
      ethers.utils.parseEther("0").toString()
    );

    assert.equal(
      (await provider.getBalance(B.address)).toString(),
      ethers.utils.parseEther("1").toString()
    );

    assert.equal(
      (await provider.getBalance(C.address)).toString(),
      ethers.utils.parseEther("0").toString()
    );

    assert.equal(
      (await provider.getBalance(multisigAB.address)).toString(),
      ethers.utils.parseEther("0").toString()
    );

    assert.equal(
      (await provider.getBalance(multisigBC.address)).toString(),
      ethers.utils.parseEther("0").toString()
    );

    assert.equal(
      (await provider.getBalance(multisigAC.address)).toString(),
      ethers.utils.parseEther("1").toString()
    );

    await helperAC.delegatecall(
      conditionalTransfer.address,
      signer,
      conditionalTransfer.interface.functions.makeConditionalTransfer.encode([
        [
          /* No conditions in this test, normally there would be a nonce here. */
        ],
        {
          dest: helperAC.cfaddressOf(balanceAC),
          selector:
            balanceAC.contract.interface.functions.getExternalState.sighash
        },
        [
          /* No s for the metachannel ethbalance */
        ],
        {
          dest: helperAC.cfaddressOf(assetDispatcher),
          selector: assetDispatcher.interface.functions.transferETH.sighash
        }
      ])
    );

    assert.equal(
      (await provider.getBalance(A.address)).toString(),
      ethers.utils.parseEther("0.1").toString()
    );

    assert.equal(
      (await provider.getBalance(B.address)).toString(),
      ethers.utils.parseEther("1").toString()
    );

    assert.equal(
      (await provider.getBalance(C.address)).toString(),
      ethers.utils.parseEther("0.1").toString()
    );

    assert.equal(
      (await provider.getBalance(multisigAB.address)).toString(),
      ethers.utils.parseEther("0").toString()
    );

    assert.equal(
      (await provider.getBalance(multisigBC.address)).toString(),
      ethers.utils.parseEther("0").toString()
    );

    assert.equal(
      (await provider.getBalance(multisigAC.address)).toString(),
      ethers.utils.parseEther("0.8").toString()
    );

    const P1_WON = 0;

    const tictactoe = await helperAC.deployAppWithState(
      BytesApp,
      "tuple(uint256)",
      [P1_WON],
      signer
    );

    const tictactoeAC = await helperAC.deploy(TwoPlayerGameModule, [
      ethers.utils.parseEther("0.8"),
      [A.address, C.address]
    ]);

    await helperAC.delegatecall(
      conditionalTransfer.address,
      signer,
      conditionalTransfer.interface.functions.makeConditionalTransfer.encode([
        [],
        {
          dest: helperAC.cfaddressOf(tictactoe),
          selector:
            tictactoe.contract.interface.functions.getExternalState.sighash
        },
        [
          {
            dest: helperAC.cfaddressOf(tictactoeAC),
            selector: tictactoeAC.contract.interface.functions.interpret.sighash
          }
        ],
        {
          dest: helperAC.cfaddressOf(assetDispatcher),
          selector: assetDispatcher.interface.functions.transferETH.sighash
        }
      ])
    );

    assert.equal(
      (await provider.getBalance(A.address)).toString(),
      ethers.utils.parseEther("0.9").toString()
    );

    assert.equal(
      (await provider.getBalance(B.address)).toString(),
      ethers.utils.parseEther("1").toString()
    );

    assert.equal(
      (await provider.getBalance(C.address)).toString(),
      ethers.utils.parseEther("0.1").toString()
    );

    assert.equal(
      (await provider.getBalance(multisigAB.address)).toString(),
      ethers.utils.parseEther("0").toString()
    );

    assert.equal(
      (await provider.getBalance(multisigBC.address)).toString(),
      ethers.utils.parseEther("0").toString()
    );

    assert.equal(
      (await provider.getBalance(multisigAC.address)).toString(),
      ethers.utils.parseEther("0").toString()
    );
  });
});
