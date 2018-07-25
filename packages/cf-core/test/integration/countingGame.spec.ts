import * as ethers from "ethers";

import * as Utils from "@counterfactual/cf-utils";

const CountingApp = artifacts.require("CountingApp");

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
  ethers.utils.solidityKeccak256(
    ["bytes1", "address[]", "uint256", "uint256", "bytes32"],
    ["0x19", [A.address, B.address], nonce, timeout, stateHash]
  );

const computeActionHash = (turn: string, prevState: string, action: string) =>
  ethers.utils.solidityKeccak256(
    ["bytes1", "address", "bytes32", "bytes"],
    ["0x19", turn, prevState, action]
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

  const decode = (encoding: string, state: any) =>
    ethers.utils.defaultAbiCoder.decode([encoding], state);

  const latestNonce = async () => stateChannel.functions.latestNonce();

  // TODO: Wait for this to work:
  // ethers.utils.formatParamType(iface.functions.resolver.inputs[0])
  // github.com/ethers-io/ethers.js/blob/typescript/src.ts/utils/abi-coder.ts#L301
  const gameEncoding =
    "tuple(address player1, address player2, uint256 count, uint256 turnNum)";

  const appEncoding =
    "tuple(address addr, bytes4 reducer, bytes4 resolver, bytes4 turnTaker)";

  const termsEncoding = "tuple(uint8 assetType, uint256 limit, address token)";

  const detailsEncoding =
    "tuple(uint8 assetType, address token, address[] to, uint256[] amount)";

  const keccak256 = (bytes: string) =>
    ethers.utils.solidityKeccak256(["bytes"], [bytes]);

  const sendUpdateToChainWithNonce = (nonce: number, appState?: string) =>
    stateChannel.functions.setState(
      appState || Utils.zeroBytes32,
      nonce,
      10,
      "0x",
      Utils.highGasLimit
    );

  const sendSignedUpdateToChainWithNonce = (nonce: number, appState?: string) =>
    stateChannel.functions.setState(
      appState || Utils.zeroBytes32,
      nonce,
      10,
      Utils.signMessageBytes(
        computeStateHash(appState || Utils.zeroBytes32, nonce, 10),
        [unlockedAccount]
      ),
      Utils.highGasLimit
    );

  const sendSignedFinalizationToChain = async (stateHash: string) =>
    stateChannel.functions.setState(
      stateHash,
      await latestNonce(),
      0,
      Utils.signMessageBytes(
        computeStateHash(
          stateHash || Utils.zeroBytes32,
          await latestNonce(),
          0
        ),
        [unlockedAccount]
      ),
      Utils.highGasLimit
    );

  let app;
  let terms;
  beforeEach(async () => {
    const StateChannel = artifacts.require("StateChannel");
    const StaticCall = artifacts.require("StaticCall");
    const Signatures = artifacts.require("Signatures");
    const Transfer = artifacts.require("Transfer");

    CountingApp.link("StaticCall", StaticCall.address);

    game = await Utils.deployContract(CountingApp, unlockedAccount);

    StateChannel.link("Signatures", Signatures.address);
    StateChannel.link("StaticCall", StaticCall.address);
    StateChannel.link("Transfer", Transfer.address);

    app = {
      addr: game.address,
      resolver: game.interface.functions.resolver.sighash,
      reducer: game.interface.functions.reducer.sighash,
      turnTaker: game.interface.functions.turn.sighash
    };

    terms = {
      assetType: AssetType.ETH,
      limit: Utils.UNIT_ETH.mul(2),
      token: Utils.zeroAddress
    };

    const contract = new ethers.Contract("", StateChannel.abi, unlockedAccount);

    stateChannel = await contract.deploy(
      StateChannel.binary,
      accounts[0],
      [A.address, B.address],
      keccak256(encode(appEncoding, app)),
      keccak256(encode(termsEncoding, terms)),
      10
    );
  });

  it("should resolve to some balance", async () => {
    const ret = await game.functions.resolver(exampleState, terms);
    ret.assetType.should.be.equal(AssetType.ETH);
    ret.token.should.be.equalIgnoreCase(Utils.zeroAddress);
    ret.to[0].should.be.equalIgnoreCase(A.address);
    ret.to[1].should.be.equalIgnoreCase(B.address);
    ret.amount[0].should.be.bignumber.eq(Utils.UNIT_ETH.mul(2));
    ret.amount[1].should.be.bignumber.eq(0);
  });

  describe("setting a resolution", async () => {
    it("should fail before state is settled", async () => {
      const finalState = encode(gameEncoding, exampleState);
      await Utils.assertRejects(
        stateChannel.functions.setResolution(
          app,
          finalState,
          encode(termsEncoding, terms),
          Utils.highGasLimit
        )
      );
    });
    it("should succeed after state is settled", async () => {
      const finalState = encode(gameEncoding, exampleState);
      await sendSignedFinalizationToChain(keccak256(finalState));
      await stateChannel.functions.setResolution(
        app,
        finalState,
        encode(termsEncoding, terms),
        Utils.highGasLimit
      );
      const ret = await stateChannel.functions.getResolution();
      ret.assetType.should.be.equal(AssetType.ETH);
      ret.token.should.be.equalIgnoreCase(Utils.zeroAddress);
      ret.to[0].should.be.equalIgnoreCase(A.address);
      ret.to[1].should.be.equalIgnoreCase(B.address);
      ret.amount[0].should.be.bignumber.eq(Utils.UNIT_ETH.mul(2));
      ret.amount[1].should.be.bignumber.eq(0);
    });
  });

  describe("handling a dispute", async () => {
    it("should update state based on reducer", async () => {
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

      const action = {
        actionType: 0,
        byHowMuch: 1
      };

      const h1 = computeStateHash(keccak256(state), 1, 10);
      const h2 = computeActionHash(
        A.address,
        keccak256(state),
        encode(actionEncoding, action)
      );

      await stateChannel.functions.createDispute(
        app,
        state,
        1,
        10,
        encode(actionEncoding, action),
        Utils.signMessageBytes(h1, [A, B]),
        Utils.signMessageBytes(h2, [A]),
        Utils.highGasLimit
      );

      const onchain = await stateChannel.functions.state();

      const expectedState = { ...exampleState, count: 1, turnNum: 1 };
      const expectedProof = keccak256(encode(gameEncoding, expectedState));
      const expectedFinalizeBlock = (await provider.getBlockNumber()) + 10;

      onchain.status.should.be.bignumber.eq(Status.DISPUTE);
      onchain.proof.should.be.equalIgnoreCase(expectedProof);
      onchain.latestSubmitter.should.be.equalIgnoreCase(accounts[0]);
      onchain.nonce.should.be.bignumber.eq(1);
      onchain.disputeNonce.should.be.bignumber.eq(0);
      onchain.disputeCounter.should.be.bignumber.eq(1);
      onchain.finalizesAt.should.be.bignumber.eq(expectedFinalizeBlock);
    });
  });
});
