"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const ethers = require("ethers");
const Utils = require("@counterfactual/test-utils");
const PaymentApp = artifacts.require("PaymentApp");
const web3 = global.web3;
const { provider, unlockedAccount } = Utils.setupTestEnv(web3);
const [A, B] = [
    new ethers.Wallet("0x4ccac8b1e81fb18a98bbaf29b9bfe307885561f71b76bd4680d7aec9d0ddfcfd"),
    new ethers.Wallet("0x3570f77380e22f8dc2274d8fd33e7830cc2d29cf76804e8c21f4f7a6cc571d27")
];
const getUpdateHash = (stateHash, nonce, timeout) => ethers.utils.solidityKeccak256(["bytes1", "address[]", "uint256", "uint256", "bytes32"], ["0x19", [A.address, B.address], nonce, timeout, stateHash]);
contract("PaymentApp", (accounts) => {
    let pc;
    let stateChannel;
    let AssetType;
    (function (AssetType) {
        AssetType[AssetType["ETH"] = 0] = "ETH";
        AssetType[AssetType["ERC20"] = 1] = "ERC20";
        AssetType[AssetType["ANY"] = 2] = "ANY";
    })(AssetType || (AssetType = {}));
    const exampleState = {
        alice: A.address,
        bob: B.address,
        aliceBalance: Utils.UNIT_ETH,
        bobBalance: Utils.UNIT_ETH
    };
    const encode = (encoding, state) => ethers.utils.defaultAbiCoder.encode([encoding], [state]);
    const decode = (encoding, state) => ethers.utils.defaultAbiCoder.decode([encoding], state);
    const latestNonce = async () => stateChannel.functions.latestNonce();
    const pcEncoding = "tuple(address alice, address bob, uint256 aliceBalance, uint256 bobBalance)";
    const appEncoding = "tuple(address addr, bytes4 applyAction, bytes4 resolve, bytes4 getTurnTaker, bytes4 isStateTerminal)";
    const termsEncoding = "tuple(uint8 assetType, uint256 limit, address token)";
    const detailsEncoding = "tuple(uint8 assetType, address token, address[] to, uint256[] amount, bytes data)";
    const keccak256 = (bytes) => ethers.utils.solidityKeccak256(["bytes"], [bytes]);
    const sendUpdateToChainWithNonce = (nonce, appState) => stateChannel.functions.setState(appState || Utils.ZERO_BYTES32, nonce, 10, "0x");
    const sendSignedUpdateToChainWithNonce = (nonce, appState) => stateChannel.functions.setState(appState || Utils.ZERO_BYTES32, nonce, 10, Utils.signMessage(getUpdateHash(appState || Utils.ZERO_BYTES32, nonce, 10), unlockedAccount));
    const sendSignedFinalizationToChain = async (stateHash) => stateChannel.functions.setState(stateHash, await latestNonce(), 0, Utils.signMessage(getUpdateHash(stateHash || Utils.ZERO_BYTES32, await latestNonce(), 0), unlockedAccount));
    let app;
    let terms;
    beforeEach(async () => {
        pc = await Utils.deployContract(PaymentApp, unlockedAccount);
        const StateChannel = artifacts.require("StateChannel");
        const StaticCall = artifacts.require("StaticCall");
        const Signatures = artifacts.require("Signatures");
        const Transfer = artifacts.require("Transfer");
        StateChannel.link("Signatures", Signatures.address);
        StateChannel.link("StaticCall", StaticCall.address);
        StateChannel.link("Transfer", Transfer.address);
        app = {
            addr: pc.address,
            resolve: pc.interface.functions.resolve.sighash,
            applyAction: "0x00000000",
            getTurnTaker: "0x00000000",
            isStateTerminal: "0x00000000"
        };
        terms = {
            assetType: AssetType.ETH,
            limit: Utils.UNIT_ETH.mul(2),
            token: Utils.ZERO_ADDRESS
        };
        const contract = new ethers.Contract("", StateChannel.abi, unlockedAccount);
        stateChannel = await contract.deploy(StateChannel.binary, accounts[0], [A.address, B.address], keccak256(encode(appEncoding, app)), keccak256(encode(termsEncoding, terms)), 10);
    });
    it("should resolve to payments", async () => {
        const ret = await pc.functions.resolve(exampleState, terms);
        ret.assetType.should.be.equal(AssetType.ETH);
        ret.token.should.be.equalIgnoreCase(Utils.ZERO_ADDRESS);
        ret.to[0].should.be.equalIgnoreCase(A.address);
        ret.to[1].should.be.equalIgnoreCase(B.address);
        ret.amount[0].should.be.bignumber.eq(Utils.UNIT_ETH);
        ret.amount[1].should.be.bignumber.eq(Utils.UNIT_ETH);
    });
    describe("setting a resolution", async () => {
        it("should fail before state is settled", async () => {
            const finalState = encode(pcEncoding, exampleState);
            await Utils.assertRejects(stateChannel.functions.setResolution(app, finalState, encode(termsEncoding, terms)));
        });
        it("should succeed after state is settled", async () => {
            const finalState = encode(pcEncoding, exampleState);
            await sendSignedFinalizationToChain(keccak256(finalState));
            await stateChannel.functions.setResolution(app, finalState, encode(termsEncoding, terms));
            const ret = await stateChannel.functions.getResolution();
            ret.assetType.should.be.equal(AssetType.ETH);
            ret.token.should.be.equalIgnoreCase(Utils.ZERO_ADDRESS);
            ret.to[0].should.be.equalIgnoreCase(A.address);
            ret.to[1].should.be.equalIgnoreCase(B.address);
            ret.amount[0].should.be.bignumber.eq(Utils.UNIT_ETH);
            ret.amount[1].should.be.bignumber.eq(Utils.UNIT_ETH);
        });
    });
});
//# sourceMappingURL=twoPartyPayments.spec.js.map