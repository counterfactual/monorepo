import { ethers } from "ethers";

import { AbstractContract, buildArtifacts, expect } from "../../utils";
import * as Utils from "../../utils/misc";

const web3 = (global as any).web3;
const { provider, unlockedAccount } = Utils.setupTestEnv(web3);

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

const computeStateHash = (stateHash: string, nonce: number, timeout: number) =>
  ethers.utils.keccak256(
    ethers.utils.solidityPack(
      ["bytes1", "address[]", "uint256", "uint256", "bytes32"],
      ["0x19", [A.address, B.address], nonce, timeout, stateHash]
    )
  );

const computeActionHash = (
  turn: string,
  prevState: string,
  action: string,
  setStateNonce: number,
  disputeNonce: number
) =>
  ethers.utils.keccak256(
    ethers.utils.solidityPack(
      ["bytes1", "address", "bytes32", "bytes", "uint256", "uint256"],
      ["0x19", turn, prevState, action, setStateNonce, disputeNonce]
    )
  );

contract("CountingApp", (accounts: string[]) => {
  let game: ethers.Contract;
  let stateChannel: ethers.Contract;

  const exampleState = {
    player1: A.address,
    player2: B.address,
    count: 0,
    turnNum: 0
  };

  enum AssetType {
    ETH,
    ERC20,
    ANY
  }

  const encode = (encoding: string, state: any) =>
    ethers.utils.defaultAbiCoder.encode([encoding], [state]);

  const latestNonce = async () => stateChannel.functions.latestNonce();

  // TODO: Wait for this to work:
  // ethers.utils.formatParamType(iface.functions.resolve.inputs[0])
  // github.com/ethers-io/ethers.js/blob/typescript/src.ts/utils/abi-coder.ts#L301
  const gameEncoding =
    "tuple(address player1, address player2, uint256 count, uint256 turnNum)";

  const appEncoding =
    "tuple(address addr, bytes4 applyAction, bytes4 resolve, bytes4 getTurnTaker, bytes4 isStateTerminal)";

  const termsEncoding = "tuple(uint8 assetType, uint256 limit, address token)";

  const { keccak256 } = ethers.utils;

  const sendSignedFinalizationToChain = async (stateHash: string) =>
    stateChannel.functions.setState(
      stateHash,
      await latestNonce(),
      0,
      Utils.signMessage(
        computeStateHash(
          stateHash || ethers.constants.HashZero,
          await latestNonce(),
          0
        ),
        unlockedAccount
      )
    );

  let app;
  let terms;
  beforeEach(async () => {
    const networkID = await AbstractContract.getNetworkID(unlockedAccount);
    const staticCall = AbstractContract.fromArtifactName("StaticCall");
    const appInstance = await buildArtifacts.AppInstance;
    const countingApp = await AbstractContract.fromArtifactName("CountingApp", {
      StaticCall: staticCall
    });

    game = await countingApp.deploy(unlockedAccount);

    app = {
      addr: game.address,
      resolve: game.interface.functions.resolve.sighash,
      applyAction: game.interface.functions.applyAction.sighash,
      getTurnTaker: game.interface.functions.getTurnTaker.sighash,
      isStateTerminal: game.interface.functions.isStateTerminal.sighash
    };

    terms = {
      assetType: AssetType.ETH,
      limit: Utils.UNIT_ETH.mul(2),
      token: ethers.constants.AddressZero
    };

    const contractFactory = new ethers.ContractFactory(
      appInstance.abi,
      await appInstance.generateLinkedBytecode(networkID),
      unlockedAccount
    );

    stateChannel = await contractFactory.deploy(
      accounts[0],
      [A.address, B.address],
      keccak256(encode(appEncoding, app)),
      keccak256(encode(termsEncoding, terms)),
      10
    );
  });

  it("should resolve to some balance", async () => {
    const ret = await game.functions.resolve(exampleState, terms);
    expect(ret.assetType).to.eql(AssetType.ETH);
    expect(ret.token).to.be.equalIgnoreCase(ethers.constants.AddressZero);
    expect(ret.to[0]).to.be.equalIgnoreCase(A.address);
    expect(ret.to[1]).to.be.equalIgnoreCase(B.address);
    expect(ret.value[0].toString()).to.be.eql(Utils.UNIT_ETH.mul(2).toString());
    expect(ret.value[1]).to.eq(0);
  });

  describe("setting a resolution", async () => {
    it("should fail before state is settled", async () => {
      const finalState = encode(gameEncoding, exampleState);
      await Utils.assertRejects(
        stateChannel.functions.setResolution(
          app,
          finalState,
          encode(termsEncoding, terms)
        )
      );
    });
    it("should succeed after state is settled", async () => {
      const finalState = encode(gameEncoding, exampleState);
      await sendSignedFinalizationToChain(keccak256(finalState));
      await stateChannel.functions.setResolution(
        app,
        finalState,
        encode(termsEncoding, terms)
      );
      const ret = await stateChannel.functions.getResolution();
      expect(ret.assetType).to.be.eql(AssetType.ETH);
      expect(ret.token).to.be.equalIgnoreCase(ethers.constants.AddressZero);
      expect(ret.to[0]).to.be.equalIgnoreCase(A.address);
      expect(ret.to[1]).to.be.equalIgnoreCase(B.address);
      expect(ret.value[0].toString()).to.be.eql(
        Utils.UNIT_ETH.mul(2).toString()
      );
      expect(ret.value[1]).to.eq(0);
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

    const actionEncoding = "tuple(uint8 actionType, uint256 byHowMuch)";

    const state = encode(gameEncoding, exampleState);

    it("should update state based on applyAction", async () => {
      const action = {
        actionType: ActionTypes.INCREMENT,
        byHowMuch: 1
      };

      const h1 = computeStateHash(keccak256(state), 1, 10);
      const h2 = computeActionHash(
        A.address,
        keccak256(state),
        encode(actionEncoding, action),
        1,
        0
      );

      await stateChannel.functions.createDispute(
        app,
        state,
        1,
        10,
        encode(actionEncoding, action),
        Utils.signMessage(h1, A, B),
        Utils.signMessage(h2, A),
        false
      );

      const onchain = await stateChannel.functions.state();

      const expectedState = { ...exampleState, count: 1, turnNum: 1 };
      const expectedStateHash = keccak256(encode(gameEncoding, expectedState));
      const expectedFinalizeBlock = (await provider.getBlockNumber()) + 10;

      expect(onchain.status).to.be.eql(Status.DISPUTE);
      expect(onchain.appStateHash).to.be.equalIgnoreCase(expectedStateHash);
      expect(onchain.latestSubmitter).to.be.equalIgnoreCase(accounts[0]);
      expect(onchain.nonce).to.eq(1);
      expect(onchain.disputeNonce).to.eq(0);
      expect(onchain.disputeCounter).to.eq(1);
      expect(onchain.finalizesAt).to.be.eql(
        new ethers.utils.BigNumber(expectedFinalizeBlock)
      );
    });

    it("should update and finalize state based on applyAction", async () => {
      const action = {
        actionType: ActionTypes.INCREMENT,
        byHowMuch: 2.0
      };

      const h1 = computeStateHash(keccak256(state), 1, 10);
      const h2 = computeActionHash(
        A.address,
        keccak256(state),
        encode(actionEncoding, action),
        1,
        0
      );

      await stateChannel.functions.createDispute(
        app,
        state,
        1,
        10,
        encode(actionEncoding, action),
        Utils.signMessage(h1, A, B),
        Utils.signMessage(h2, A),
        true
      );

      const channelState = await stateChannel.functions.state();

      const expectedState = { ...exampleState, count: 2, turnNum: 1 };
      const expectedStateHash = keccak256(encode(gameEncoding, expectedState));
      const expectedFinalizeBlock = await provider.getBlockNumber();

      expect(channelState.status).to.be.eql(Status.OFF);
      expect(channelState.appStateHash).to.be.equalIgnoreCase(
        expectedStateHash
      );
      expect(channelState.latestSubmitter).to.be.equalIgnoreCase(accounts[0]);
      expect(channelState.nonce).to.eq(1);
      expect(channelState.disputeNonce).to.be.eql(
        new ethers.utils.BigNumber(0)
      );
      expect(channelState.disputeCounter).to.be.eql(
        new ethers.utils.BigNumber(1)
      );
      expect(channelState.finalizesAt).to.be.eql(
        new ethers.utils.BigNumber(expectedFinalizeBlock)
      );
    });

    it("should fail when trying to finalize a non-final state", async () => {
      const action = {
        actionType: ActionTypes.INCREMENT,
        byHowMuch: 1.0
      };

      const h1 = computeStateHash(keccak256(state), 1, 10);
      const h2 = computeActionHash(
        A.address,
        keccak256(state),
        encode(actionEncoding, action),
        1,
        0
      );

      await Utils.assertRejects(
        stateChannel.functions.createDispute(
          app,
          state,
          1,
          10,
          encode(actionEncoding, action),
          Utils.signMessage(h1, A, B),
          Utils.signMessage(h2, A),
          true
        )
      );
    });
  });
});
