import * as ethers from "ethers";

import { AssetType } from "../enums";
import * as Utils from "../helpers/utils";

const StaticCall = artifacts.require("StaticCall");
const Adjudicator = artifacts.require("Adjudicator");
const Signatures = artifacts.require("Signatures");
const Disputable = artifacts.require("Disputable");
const Rules = artifacts.require("Rules");
const CountingGame = artifacts.require("CountingGame");

const web3 = (global as any).web3;
const { provider, unlockedAccount } = Utils.setupTestEnv(web3);

enum Status {
  OK,
  DISPUTE,
  SETTLED
}

enum StateType {
  Game,
  Conclude
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

Adjudicator.link("Signatures", Signatures.address);
Adjudicator.link("StaticCall", StaticCall.address);
Adjudicator.link("Disputable", Disputable.address);
Adjudicator.link("Rules", Rules.address);

CountingGame.link("StaticCall", StaticCall.address);

contract("Adjudicator", (accounts: string[]) => {
  let app: ethers.Contract;
  let rules: ethers.Contract;

  let signState;

  const latestNonce = async () => app.functions.latestNonce();

  before(async () => {
    const gasPrice = await provider.getGasPrice();
  });

  beforeEach(async () => {
    const contract = new ethers.Contract("", Adjudicator.abi, unlockedAccount);
    app = await contract.deploy(
      Adjudicator.binary,
      ethers.utils.solidityKeccak256(["bytes"], ["0x"]),
      TIMEOUT,
      [A.address, B.address]
    );
    rules = await Utils.deployContract(CountingGame, unlockedAccount);
  });

  it("constructor sets state of adjudicator state channel app", async () => {
    const proof = ethers.utils.solidityKeccak256(["bytes"], ["0x"]);
    const state = await app.functions.state();
    const owner = await app.functions.getOwner();
    const signingKeys = await app.functions.getSigningKeys();
    state.proof.should.be.equalIgnoreCase(proof);
    state.meta.timeoutPeriod.should.be.bignumber.eq(TIMEOUT);
    owner.should.be.equalIgnoreCase(accounts[0]);
    signingKeys[0].should.be.equalIgnoreCase(A.address);
    signingKeys[1].should.be.equalIgnoreCase(B.address);
  });

  it("should start without a dispute if adjudicator is deployed", async () => {
    const state = await app.functions.state();
    state.meta.status.should.be.equal(Status.OK);
  });

  it("should do force move app stuff", async () => {
    // signState = (gameState: string, stateType: StateType, turnNum: number) =>
    //   Utils.signMessageVRS(
    //       {
    //       gameAddress: rules.address,
    //       gameState,
    //       getTurnTaker: "0x",
    //       stateType,
    //       turnNum
    //     },
    //     [unlockedAccount]
    //   );
    // const signedState1 = signState(
    //   ethers.utils.defaultAbiCoder.encode(
    //     ["tuple(uint8 counter)"],
    //     [{ counter: 0 }]
    //   ),
    //   StateType.Game,
    //   0
    // );
  });
});
