import * as ethers from "ethers";

import { AssetType } from "../enums";
import * as Utils from "../helpers/utils";

const StaticCall = artifacts.require("StaticCall");
const TwoPartyPayments = artifacts.require("TwoPartyPayments");
const Signatures = artifacts.require("Signatures");
const Disputable = artifacts.require("Disputable");
const Transfer = artifacts.require("Transfer");

const web3 = (global as any).web3;
const { provider, unlockedAccount } = Utils.setupTestEnv(web3);

enum Status {
  OK,
  DISPUTE,
  SETTLED
}

const TIMEOUT = 30;

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

const getUpdateHash = (encodedAppState: string, nonce: number) =>
  ethers.utils.solidityKeccak256(
    ["bytes1", "address[]", "uint256", "bytes32"],
    ["0x19", [A.address, B.address], nonce, encodedAppState]
  );

const getFinalizeHash = (nonce: number) =>
  ethers.utils.solidityKeccak256(
    ["bytes1", "address[]", "uint256", "bytes4"],
    ["0x19", [A.address, B.address], nonce, "0xa63f2db0"]
  );

contract("TwoPartyPayments", (accounts: string[]) => {
  let paymentChannel: ethers.Contract;

  const exampleState = {
    alice: A.address,
    bob: B.address,
    aliceBalance: Utils.UNIT_ETH,
    bobBalance: Utils.UNIT_ETH
  };

  const encode = (state: object) =>
    ethers.utils.defaultAbiCoder.encode([encoding], [state]);

  const hashAndEncode = (state: object) =>
    ethers.utils.solidityKeccak256(["bytes"], [encode(state)]);

  let sendUpdateToChainWithNonce: (
    nonce: number,
    appState?: string
  ) => Promise<void>;

  let sendSignedUpdateToChainWithNonce: (
    nonce: number,
    appState?: string
  ) => Promise<void>;

  let sendSignedFinalizationToChain: () => Promise<any>;

  const latestNonce = async () => paymentChannel.functions.latestNonce();

  // TODO: Wait for this to work:
  // ethers.utils.formatParamType(iface.functions.resolver.inputs[0])
  // github.com/ethers-io/ethers.js/blob/typescript/src.ts/utils/abi-coder.ts#L301
  const encoding =
    "tuple(address alice, address bob, uint256 aliceBalance, uint256 bobBalance)";

  const termsEncoding = "tuple(uint8 assetType, uint256 limit, address token)";

  before(async () => {
    const gasPrice = await provider.getGasPrice();

    sendUpdateToChainWithNonce = (nonce: number, appState?: string) =>
      paymentChannel.functions.setState(
        appState || Utils.zeroBytes32,
        nonce,
        TIMEOUT,
        "0x",
        { gasLimit: 6e9, gasPrice }
      );

    sendSignedUpdateToChainWithNonce = (nonce: number, appState?: string) =>
      paymentChannel.functions.setState(
        appState || Utils.zeroBytes32,
        nonce,
        TIMEOUT,
        Utils.signMessageBytes(
          getUpdateHash(appState || Utils.zeroBytes32, nonce),
          [unlockedAccount]
        ),
        { gasLimit: 6e9, gasPrice }
      );

    sendSignedFinalizationToChain = async () =>
      paymentChannel.functions.setState(
        "0x",
        await latestNonce(),
        0,
        Utils.signMessageBytes(getFinalizeHash(await latestNonce()), [
          unlockedAccount
        ]),
        { gasLimit: 6e9, gasPrice }
      );
  });

  beforeEach(async () => {
    const contract = new ethers.Contract(
      "",
      TwoPartyPayments.abi,
      unlockedAccount
    );

    TwoPartyPayments.link("Signatures", Signatures.address);
    TwoPartyPayments.link("StaticCall", StaticCall.address);
    TwoPartyPayments.link("Disputable", Disputable.address);
    TwoPartyPayments.link("Transfer", Transfer.address);

    paymentChannel = await contract.deploy(
      TwoPartyPayments.binary,
      [A.address, B.address],
      ethers.utils.solidityKeccak256(
        ["bytes4", "bytes"],
        [
          contract.interface.functions.resolver.sighash,
          ethers.utils.defaultAbiCoder.encode(
            [termsEncoding],
            [
              {
                assetType: AssetType.ETH,
                limit: Utils.UNIT_ETH.mul(2),
                token: Utils.zeroAddress
              }
            ]
          )
        ]
      )
    );

    await sendSignedUpdateToChainWithNonce(1, hashAndEncode(exampleState));
  });

  it("should resolve to the payments", async () => {
    const terms = {
      assetType: AssetType.ETH,
      limit: Utils.UNIT_ETH.mul(2),
      token: Utils.zeroAddress
    };
    const ret = await paymentChannel.functions.resolver(exampleState, terms);
    ret.assetType.should.be.equal(AssetType.ETH);
    ret.token.should.be.equalIgnoreCase(Utils.zeroAddress);
    ret.to[0].should.be.equalIgnoreCase(A.address);
    ret.to[1].should.be.equalIgnoreCase(B.address);
    ret.amount[0].should.be.bignumber.eq(Utils.UNIT_ETH);
    ret.amount[1].should.be.bignumber.eq(Utils.UNIT_ETH);
  });

  describe("setting a resolution", async () => {
    it("should fail before state is settled", async () => {
      await Utils.assertRejects(
        paymentChannel.functions.setResolution(
          encode(exampleState),
          ethers.utils.defaultAbiCoder.encode(
            [termsEncoding],
            [
              {
                assetType: AssetType.ETH,
                limit: Utils.UNIT_ETH.mul(2),
                token: Utils.zeroAddress
              }
            ]
          ),
          paymentChannel.interface.functions.resolver.sighash
        )
      );
    });
    it("should succeed after state is settled", async () => {
      await sendSignedFinalizationToChain();
      await paymentChannel.functions.setResolution(
        encode(exampleState),
        ethers.utils.defaultAbiCoder.encode(
          [termsEncoding],
          [
            {
              assetType: AssetType.ETH,
              limit: Utils.UNIT_ETH.mul(2),
              token: Utils.zeroAddress
            }
          ]
        ),
        paymentChannel.interface.functions.resolver.sighash
      );
      const ret = await paymentChannel.functions.getResolution();
      ret.assetType.should.be.equal(AssetType.ETH);
      ret.token.should.be.equalIgnoreCase(Utils.zeroAddress);
      ret.to[0].should.be.equalIgnoreCase(A.address);
      ret.to[1].should.be.equalIgnoreCase(B.address);
      ret.amount[0].should.be.bignumber.eq(Utils.UNIT_ETH);
      ret.amount[1].should.be.bignumber.eq(Utils.UNIT_ETH);
    });
  });
});
