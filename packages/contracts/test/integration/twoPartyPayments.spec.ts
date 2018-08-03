import * as ethers from "ethers";

import * as Utils from "@counterfactual/test-utils";

const PaymentApp = artifacts.require("PaymentApp");

const web3 = (global as any).web3;
const { provider, unlockedAccount } = Utils.setupTestEnv(web3);

const [A, B] = [
  // 0xb37e49bFC97A948617bF3B63BC6942BB15285715
  new ethers.Wallet(
    "0x4ccac8b1e81fb18a98bbaf29b9bfe307885561f71b76bd4680d7aec9d0ddfcfd"
  ),
  // 0xaeF082d339D227646DB914f0cA9fF02c8544F30b
  new ethers.Wallet(
    "0x3570f77380e22f8dc2274d8fd33e7830cc2d29cf76804e8c21f4f7a6cc571d27"
  )
];

const getUpdateHash = (stateHash: string, nonce: number, timeout: number) =>
  ethers.utils.solidityKeccak256(
    ["bytes1", "address[]", "uint256", "uint256", "bytes32"],
    ["0x19", [A.address, B.address], nonce, timeout, stateHash]
  );

contract("PaymentApp", (accounts: string[]) => {
  let pc: ethers.Contract;
  let stateChannel: ethers.Contract;

  enum AssetType {
    ETH,
    ERC20,
    ANY
  }

  const exampleState = {
    alice: A.address,
    bob: B.address,
    aliceBalance: Utils.UNIT_ETH,
    bobBalance: Utils.UNIT_ETH
  };

  const encode = (encoding: string, state: any) =>
    ethers.utils.defaultAbiCoder.encode([encoding], [state]);

  const decode = (encoding: string, state: any) =>
    ethers.utils.defaultAbiCoder.decode([encoding], state);

  const latestNonce = async () => stateChannel.functions.latestNonce();

  // TODO: Wait for this to work:
  // ethers.utils.formatParamType(iface.functions.resolver.inputs[0])
  // github.com/ethers-io/ethers.js/blob/typescript/src.ts/utils/abi-coder.ts#L301
  const pcEncoding =
    "tuple(address alice, address bob, uint256 aliceBalance, uint256 bobBalance)";

  const appEncoding =
    "tuple(address addr, bytes4 reduce, bytes4 resolver, bytes4 turnTaker, bytes4 isStateFinal)";

  const termsEncoding = "tuple(uint8 assetType, uint256 limit, address token)";

  const detailsEncoding =
    "tuple(uint8 assetType, address token, address[] to, uint256[] amount, bytes data)";

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
        getUpdateHash(appState || Utils.zeroBytes32, nonce, 10),
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
        getUpdateHash(stateHash || Utils.zeroBytes32, await latestNonce(), 0),
        [unlockedAccount]
      ),
      Utils.highGasLimit
    );

  let app;
  let terms;
  beforeEach(async () => {
    pc = await Utils.deployContract(PaymentApp, unlockedAccount);

    // Specifically for the StateChannel
    const StateChannel = artifacts.require("StateChannel");
    const StaticCall = artifacts.require("StaticCall");
    const Signatures = artifacts.require("Signatures");
    const Transfer = artifacts.require("Transfer");
    StateChannel.link("Signatures", Signatures.address);
    StateChannel.link("StaticCall", StaticCall.address);
    StateChannel.link("Transfer", Transfer.address);

    app = {
      addr: pc.address,
      resolver: pc.interface.functions.resolver.sighash,
      reduce: "0x00000000",
      turnTaker: "0x00000000",
      isStateFinal: "0x00000000"
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

  it("should resolve to payments", async () => {
    const ret = await pc.functions.resolver(exampleState, terms);
    ret.assetType.should.be.equal(AssetType.ETH);
    ret.token.should.be.equalIgnoreCase(Utils.zeroAddress);
    ret.to[0].should.be.equalIgnoreCase(A.address);
    ret.to[1].should.be.equalIgnoreCase(B.address);
    ret.amount[0].should.be.bignumber.eq(Utils.UNIT_ETH);
    ret.amount[1].should.be.bignumber.eq(Utils.UNIT_ETH);
  });

  describe("setting a resolution", async () => {
    it("should fail before state is settled", async () => {
      const finalState = encode(pcEncoding, exampleState);
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
      const finalState = encode(pcEncoding, exampleState);
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
      ret.amount[0].should.be.bignumber.eq(Utils.UNIT_ETH);
      ret.amount[1].should.be.bignumber.eq(Utils.UNIT_ETH);
    });
  });
});
