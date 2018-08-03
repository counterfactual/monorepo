import * as ethers from "ethers";

import {
  App,
  assertRejects,
  computeActionHash,
  computeStateHash,
  deployContract,
  HIGH_GAS_LIMIT,
  setupTestEnv,
  signMessageBytes,
  SolidityStruct,
  SolidityStructType,
  TransferTerms,
  ZERO_ADDRESS,
  ZERO_BYTES32
} from "@counterfactual/test-utils";

const CountingApp = artifacts.require("CountingApp");

const web3 = (global as any).web3;
const { provider, unlockedAccount } = setupTestEnv(web3);

const [A, B] = [
  // 0xaeF082d339D227646DB914f0cA9fF02c8544F30b
  new ethers.Wallet(
    "0x3570f77380e22f8dc2274d8fd33e7830cc2d29cf76804e8c21f4f7a6cc571d27"
  ),
  // 0xb37e49bFC97A948617bF3B63BC6942BB15285715
  new ethers.Wallet(
    "0x4ccac8b1e81fb18a98bbaf29b9bfe307885561f71b76bd4680d7aec9d0ddfcfd"
  )
];

contract("CountingApp", (accounts: string[]) => {
  let appContract: ethers.Contract;
  let stateChannel: ethers.Contract;

  enum AssetType {
    ETH,
    ERC20,
    ANY
  }

  async function latestNonce(): Promise<number> {
    return parseInt(await stateChannel.functions.latestNonce(), 10);
  }

  // TODO: Wait for this to work:
  // ethers.utils.formatParamType(iface.functions.resolve.inputs[0])
  // github.com/ethers-io/ethers.js/blob/typescript/src.ts/utils/abi-coder.ts#L301

  const sendSignedFinalizationToChain = async (state: SolidityStruct) => {
    const nonce = await latestNonce();
    const stateHash = computeStateHash([A.address, B.address], state, nonce, 0);
    return stateChannel.functions.setState(
      state.keccak256(),
      nonce,
      0,
      signMessageBytes(stateHash, [unlockedAccount]),
      HIGH_GAS_LIMIT
    );
  };

  const Action = new SolidityStructType(`
    uint256 actionType;
    uint256 byHowMuch;
  `);

  const AppState = new SolidityStructType(`
    address player1;
    address player2;
    uint256 count;
    uint256 turnNum;
  `);

  const exampleState = AppState.new({
    player1: A.address,
    player2: B.address,
    count: 0,
    turnNum: 0
  });

  let app;
  let terms;
  beforeEach(async () => {
    const StateChannel = artifacts.require("StateChannel");
    const StaticCall = artifacts.require("StaticCall");
    const Signatures = artifacts.require("Signatures");
    const Transfer = artifacts.require("Transfer");

    CountingApp.link("StaticCall", StaticCall.address);

    appContract = await deployContract(CountingApp, unlockedAccount);

    StateChannel.link("Signatures", Signatures.address);
    StateChannel.link("StaticCall", StaticCall.address);
    StateChannel.link("Transfer", Transfer.address);

    app = App.new({
      addr: appContract.address,
      resolve: appContract.interface.functions.resolve.sighash,
      applyAction: appContract.interface.functions.applyAction.sighash,
      turnTaker: appContract.interface.functions.turn.sighash,
      isStateFinal: appContract.interface.functions.isStateFinal.sighash
    });

    terms = TransferTerms.new({
      assetType: AssetType.ETH,
      limit: ethers.utils.parseEther("2"),
      token: ZERO_ADDRESS
    });

    const contract = new ethers.Contract("", StateChannel.abi, unlockedAccount);

    stateChannel = await contract.deploy(
      StateChannel.binary,
      accounts[0],
      [A.address, B.address],
      app.keccak256(),
      terms.keccak256(),
      10
    );
  });

  it("should resolve to some balance", async () => {
    const ret = await appContract.functions.resolve(
      exampleState.asObject(),
      terms.asObject()
    );
    ret.assetType.should.be.equal(AssetType.ETH);
    ret.token.should.be.equalIgnoreCase(ZERO_ADDRESS);
    ret.to[0].should.be.equalIgnoreCase(A.address);
    ret.to[1].should.be.equalIgnoreCase(B.address);
    ret.amount[0].should.be.bignumber.eq(ethers.utils.parseEther("2"));
    ret.amount[1].should.be.bignumber.eq(0);
  });

  describe("setting a resolution", async () => {
    it("should fail before state is settled", async () => {
      await assertRejects(
        stateChannel.functions.setResolution(
          app.asObject(),
          exampleState.encodeBytes(),
          terms.encodeBytes(),
          HIGH_GAS_LIMIT
        )
      );
    });
    it("should succeed after state is settled", async () => {
      await sendSignedFinalizationToChain(exampleState);
      await stateChannel.functions.setResolution(
        app.asObject(),
        exampleState.encodeBytes(),
        terms.encodeBytes(),
        HIGH_GAS_LIMIT
      );
      const ret = await stateChannel.functions.getResolution();
      ret.assetType.should.be.equal(AssetType.ETH);
      ret.token.should.be.equalIgnoreCase(ZERO_ADDRESS);
      ret.to[0].should.be.equalIgnoreCase(A.address);
      ret.to[1].should.be.equalIgnoreCase(B.address);
      ret.amount[0].should.be.bignumber.eq(ethers.utils.parseEther("2"));
      ret.amount[1].should.be.bignumber.eq(0);
    });
  });

  describe("handling a dispute", async () => {
    enum ActionTypes {
      INCREMENT,
      DECREMENT
    }

    enum Status {
      ON,
      DISPUTE,
      OFF
    }

    it("should update state based on applyAction", async () => {
      const action = Action.new({
        actionType: ActionTypes.INCREMENT,
        byHowMuch: 1
      });

      const stateHash = computeStateHash(
        [A.address, B.address],
        exampleState,
        1,
        10
      );
      const actionHash = computeActionHash(
        A.address,
        exampleState,
        action,
        1,
        0
      );

      await stateChannel.functions.createDispute(
        app.asObject(),
        exampleState.encodeBytes(),
        1,
        10,
        action.encodeBytes(),
        signMessageBytes(stateHash, [A, B]),
        signMessageBytes(actionHash, [A]),
        false,
        HIGH_GAS_LIMIT
      );

      const onchain = await stateChannel.functions.state();

      const expectedState = exampleState.clone({
        count: 1,
        turnNum: 1
      });
      const expectedStateHash = expectedState.keccak256();
      const expectedFinalizeBlock = (await provider.getBlockNumber()) + 10;

      onchain.status.should.be.bignumber.eq(Status.DISPUTE);
      onchain.appStateHash.should.be.equalIgnoreCase(expectedStateHash);
      onchain.latestSubmitter.should.be.equalIgnoreCase(accounts[0]);
      onchain.nonce.should.be.bignumber.eq(1);
      onchain.disputeNonce.should.be.bignumber.eq(0);
      onchain.disputeCounter.should.be.bignumber.eq(1);
      onchain.finalizesAt.should.be.bignumber.eq(expectedFinalizeBlock);
    });

    it("should update and finalize state based on applyAction", async () => {
      const action = Action.new({
        actionType: ActionTypes.INCREMENT,
        byHowMuch: 2.0
      });

      const h1 = computeStateHash([A.address, B.address], exampleState, 1, 10);
      const h2 = computeActionHash(A.address, exampleState, action, 1, 0);

      await stateChannel.functions.createDispute(
        app.asObject(),
        exampleState.encodeBytes(),
        1,
        10,
        action.encodeBytes(),
        signMessageBytes(h1, [A, B]),
        signMessageBytes(h2, [A]),
        true,
        HIGH_GAS_LIMIT
      );

      const channelState = await stateChannel.functions.state();

      const expectedState = exampleState.clone({ count: 2, turnNum: 1 });
      const expectedStateHash = expectedState.keccak256();
      const expectedFinalizeBlock = await provider.getBlockNumber();

      channelState.status.should.be.bignumber.eq(Status.OFF);
      channelState.appStateHash.should.be.equalIgnoreCase(expectedStateHash);
      channelState.latestSubmitter.should.be.equalIgnoreCase(accounts[0]);
      channelState.nonce.should.be.bignumber.eq(1);
      channelState.disputeNonce.should.be.bignumber.eq(0);
      channelState.disputeCounter.should.be.bignumber.eq(1);
      channelState.finalizesAt.should.be.bignumber.eq(expectedFinalizeBlock);
    });

    it("should fail when trying to finalize a non-final state", async () => {
      const action = Action.new({
        actionType: ActionTypes.INCREMENT,
        byHowMuch: 1.0
      });

      const h1 = computeStateHash([A.address, B.address], exampleState, 1, 10);
      const h2 = computeActionHash(A.address, exampleState, action, 1, 0);

      await assertRejects(
        stateChannel.functions.createDispute(
          app.asObject(),
          exampleState.encodeBytes(),
          1,
          10,
          action.encodeBytes(),
          signMessageBytes(h1, [A, B]),
          signMessageBytes(h2, [A]),
          true,
          HIGH_GAS_LIMIT
        )
      );
    });
  });
});
