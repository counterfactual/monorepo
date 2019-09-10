import IdentityApp from "@counterfactual/cf-funding-protocol-contracts/expected-build-artifacts/IdentityApp.json";
import { OutcomeType } from "@counterfactual/types";
import { Contract, ContractFactory } from "ethers";
import { One, Two, Zero } from "ethers/constants";
import { JsonRpcProvider } from "ethers/providers";
import { BigNumber } from "ethers/utils";

import { CONVENTION_FOR_ETH_TOKEN_ADDRESS } from "../../../../src/constants";
import { Protocol, xkeyKthAddress } from "../../../../src/machine";
import { sortAddresses } from "../../../../src/machine/xkeys";
import { getCreate2MultisigAddress } from "../../../../src/utils";
import { toBeEq } from "../bignumber-jest-matcher";
import { connectToGanache } from "../connect-ganache";
import { MessageRouter } from "../message-router";
import { MiniNode } from "../mininode";

expect.extend({ toBeEq });

export enum Participant {
  A,
  B,
  C
}

export class TestRunner {
  static readonly TEST_TOKEN_ADDRESS =
    "0x88a5C2d9919e46F883EB62F7b8Dd9d0CC45bc290";

  private identityApp!: Contract;
  public mininodeA!: MiniNode;
  public mininodeB!: MiniNode;
  public mininodeC!: MiniNode;
  public multisigAB!: string;
  public multisigAC!: string;
  public multisigBC!: string;
  public provider!: JsonRpcProvider;
  private mr!: MessageRouter;

  async connectToGanache() {
    const [provider, wallet, {}] = await connectToGanache();
    this.provider = provider;
    const network = global["networkContext"];

    this.identityApp = await new ContractFactory(
      IdentityApp.abi,
      IdentityApp.evm.bytecode,
      wallet
    ).deploy();

    this.mininodeA = new MiniNode(network, provider);
    this.mininodeB = new MiniNode(network, provider);
    this.mininodeC = new MiniNode(network, provider);

    this.multisigAB = getCreate2MultisigAddress(
      [this.mininodeA.xpub, this.mininodeB.xpub],
      network.ProxyFactory,
      network.MinimumViableMultisig
    );

    this.multisigAC = getCreate2MultisigAddress(
      [this.mininodeA.xpub, this.mininodeC.xpub],
      network.ProxyFactory,
      network.MinimumViableMultisig
    );

    this.multisigBC = getCreate2MultisigAddress(
      [this.mininodeB.xpub, this.mininodeC.xpub],
      network.ProxyFactory,
      network.MinimumViableMultisig
    );

    this.mr = new MessageRouter([
      this.mininodeA,
      this.mininodeB,
      this.mininodeC
    ]);
  }

  /*
  Run the setup protocol to create the AB and BC channels, and update the
  state channel maps accordingly
  */
  async setup() {
    this.mininodeA.scm.set(
      this.multisigAB,
      (await this.mininodeA.protocolRunner.runSetupProtocol({
        initiatorXpub: this.mininodeA.xpub,
        responderXpub: this.mininodeB.xpub,
        multisigAddress: this.multisigAB
      })).get(this.multisigAB)!
    );

    await this.mr.waitForAllPendingPromises();

    this.mininodeB.scm.set(
      this.multisigBC,
      (await this.mininodeB.protocolRunner.runSetupProtocol({
        initiatorXpub: this.mininodeB.xpub,
        responderXpub: this.mininodeC.xpub,
        multisigAddress: this.multisigBC
      })).get(this.multisigBC)!
    );

    await this.mr.waitForAllPendingPromises();
  }

  /*
  Adds one ETH and one TEST_TOKEN to the free balance of everyone. Note this
  does not actually transfer any tokens.
  */
  async unsafeFund() {
    for (const mininode of [this.mininodeA, this.mininodeB]) {
      const sc = mininode.scm.get(this.multisigAB)!;
      mininode.scm.set(
        this.multisigAB,
        sc.incrementFreeBalance({
          [CONVENTION_FOR_ETH_TOKEN_ADDRESS]: {
            [sc.getFreeBalanceAddrOf(this.mininodeA.xpub)]: One,
            [sc.getFreeBalanceAddrOf(this.mininodeB.xpub)]: One
          },
          [TestRunner.TEST_TOKEN_ADDRESS]: {
            [sc.getFreeBalanceAddrOf(this.mininodeA.xpub)]: One,
            [sc.getFreeBalanceAddrOf(this.mininodeB.xpub)]: One
          }
        })
      );
    }

    for (const mininode of [this.mininodeB, this.mininodeC]) {
      const sc = mininode.scm.get(this.multisigBC)!;
      mininode.scm.set(
        this.multisigBC,
        sc.incrementFreeBalance({
          [CONVENTION_FOR_ETH_TOKEN_ADDRESS]: {
            [sc.getFreeBalanceAddrOf(this.mininodeB.xpub)]: One,
            [sc.getFreeBalanceAddrOf(this.mininodeC.xpub)]: One
          },
          [TestRunner.TEST_TOKEN_ADDRESS]: {
            [sc.getFreeBalanceAddrOf(this.mininodeB.xpub)]: One,
            [sc.getFreeBalanceAddrOf(this.mininodeC.xpub)]: One
          }
        })
      );
    }
  }

  async installVirtualEqualDeposits(
    outcomeType: OutcomeType,
    tokenAddress: string
  ) {
    const stateEncoding = {
      [OutcomeType.TWO_PARTY_FIXED_OUTCOME]: "uint8",
      [OutcomeType.SINGLE_ASSET_TWO_PARTY_COIN_TRANSFER]:
        "tuple(address to, uint256 amount)[2]",
      [OutcomeType.MULTI_ASSET_MULTI_PARTY_COIN_TRANSFER]:
        "tuple(address to, uint256 amount)[][]"
    }[outcomeType];

    const initialState = {
      [OutcomeType.TWO_PARTY_FIXED_OUTCOME]: 0,
      [OutcomeType.SINGLE_ASSET_TWO_PARTY_COIN_TRANSFER]: [
        {
          to: xkeyKthAddress(this.mininodeA.xpub, 0),
          amount: Two
        },
        {
          to: xkeyKthAddress(this.mininodeC.xpub, 0),
          amount: Zero
        }
      ],
      [OutcomeType.MULTI_ASSET_MULTI_PARTY_COIN_TRANSFER]: [
        [
          {
            to: xkeyKthAddress(this.mininodeA.xpub, 0),
            amount: Two
          },
          {
            to: xkeyKthAddress(this.mininodeC.xpub, 0),
            amount: Zero
          }
        ]
      ]
    }[outcomeType];

    await this.mininodeA.protocolRunner.initiateProtocol(
      Protocol.InstallVirtualApp,
      this.mininodeA.scm,
      {
        outcomeType,
        tokenAddress,
        initialState,
        initiatorXpub: this.mininodeA.xpub,
        intermediaryXpub: this.mininodeB.xpub,
        responderXpub: this.mininodeC.xpub,
        initiatorBalanceDecrement: One,
        responderBalanceDecrement: One,
        appSeqNo: 1,
        appInterface: {
          stateEncoding,
          addr: this.identityApp.address,
          actionEncoding: undefined
        },
        defaultTimeout: 40
      }
    );
  }

  async installEqualDeposits(outcomeType: OutcomeType, tokenAddress: string) {
    const stateEncoding = {
      [OutcomeType.TWO_PARTY_FIXED_OUTCOME]: "uint8",
      [OutcomeType.SINGLE_ASSET_TWO_PARTY_COIN_TRANSFER]:
        "tuple(address to, uint256 amount)[2]",
      [OutcomeType.MULTI_ASSET_MULTI_PARTY_COIN_TRANSFER]:
        "tuple(address to, uint256 amount)[][]"
    }[outcomeType];

    const initialState = {
      [OutcomeType.TWO_PARTY_FIXED_OUTCOME]: 0,
      [OutcomeType.SINGLE_ASSET_TWO_PARTY_COIN_TRANSFER]: [
        {
          to: xkeyKthAddress(this.mininodeA.xpub, 0),
          amount: Two
        },
        {
          to: xkeyKthAddress(this.mininodeB.xpub, 0),
          amount: Zero
        }
      ],
      [OutcomeType.MULTI_ASSET_MULTI_PARTY_COIN_TRANSFER]: [
        [
          {
            to: xkeyKthAddress(this.mininodeA.xpub, 0),
            amount: Two
          },
          {
            to: xkeyKthAddress(this.mininodeB.xpub, 0),
            amount: Zero
          }
        ]
      ]
    }[outcomeType];

    const participants = sortAddresses([
      xkeyKthAddress(this.mininodeA.xpub, 1),
      xkeyKthAddress(this.mininodeB.xpub, 1)
    ]);

    await this.mininodeA.protocolRunner.initiateProtocol(
      Protocol.Install,
      this.mininodeA.scm,
      {
        participants,
        outcomeType,
        initialState,
        initiatorXpub: this.mininodeA.xpub,
        responderXpub: this.mininodeB.xpub,
        multisigAddress: this.multisigAB,
        initiatorBalanceDecrement: One,
        responderBalanceDecrement: One,
        appInterface: {
          stateEncoding,
          addr: this.identityApp.address,
          actionEncoding: undefined
        },
        appSeqNo: 1,
        defaultTimeout: 40,
        initiatorDepositTokenAddress: tokenAddress,
        responderDepositTokenAddress: tokenAddress,
        disableLimit: false
      }
    );
  }

  async installSplitDeposits(
    outcomeType: OutcomeType,
    tokenAddressA: string,
    tokenAddressB: string
  ) {
    const stateEncoding = {
      [OutcomeType.TWO_PARTY_FIXED_OUTCOME]: "uint8",
      [OutcomeType.SINGLE_ASSET_TWO_PARTY_COIN_TRANSFER]:
        "tuple(address to, uint256 amount)[2]",
      [OutcomeType.MULTI_ASSET_MULTI_PARTY_COIN_TRANSFER]:
        "tuple(address to, uint256 amount)[][]"
    }[outcomeType];

    const initialState = {
      [OutcomeType.TWO_PARTY_FIXED_OUTCOME]: 0,
      [OutcomeType.SINGLE_ASSET_TWO_PARTY_COIN_TRANSFER]: [
        {
          to: xkeyKthAddress(this.mininodeA.xpub, 0),
          amount: Two
        },
        {
          to: xkeyKthAddress(this.mininodeB.xpub, 0),
          amount: Zero
        }
      ],
      [OutcomeType.MULTI_ASSET_MULTI_PARTY_COIN_TRANSFER]: [
        [
          {
            to: xkeyKthAddress(this.mininodeA.xpub, 0),
            amount: Two
          },
          {
            to: xkeyKthAddress(this.mininodeB.xpub, 0),
            amount: Zero
          }
        ]
      ]
    }[outcomeType];

    const participants = sortAddresses([
      xkeyKthAddress(this.mininodeA.xpub, 1),
      xkeyKthAddress(this.mininodeB.xpub, 1)
    ]);

    await this.mininodeA.protocolRunner.initiateProtocol(
      Protocol.Install,
      this.mininodeA.scm,
      {
        participants,
        outcomeType,
        initialState,
        initiatorXpub: this.mininodeA.xpub,
        responderXpub: this.mininodeB.xpub,
        multisigAddress: this.multisigAB,
        initiatorBalanceDecrement: One,
        responderBalanceDecrement: One,
        appInterface: {
          stateEncoding,
          addr: this.identityApp.address,
          actionEncoding: undefined
        },
        appSeqNo: 1,
        defaultTimeout: 40,
        initiatorDepositTokenAddress: tokenAddressA,
        responderDepositTokenAddress: tokenAddressB,
        disableLimit: false
      }
    );
  }

  async uninstallVirtual() {
    const [virtualAppInstance] = [
      ...this.mininodeA.scm.get(this.multisigAC)!.appInstances.values()
    ];

    await this.mininodeA.protocolRunner.initiateProtocol(
      Protocol.UninstallVirtualApp,
      this.mininodeA.scm,
      {
        // todo(xuanji): this should be computed by the protocol
        targetOutcome: await virtualAppInstance.computeOutcome(
          virtualAppInstance.latestState,
          this.provider
        ),
        initiatorXpub: this.mininodeA.xpub,
        intermediaryXpub: this.mininodeB.xpub,
        responderXpub: this.mininodeC.xpub,
        targetAppIdentityHash: virtualAppInstance.identityHash
      }
    );

    await this.mr.waitForAllPendingPromises();
  }

  async uninstall() {
    const appInstances = this.mininodeA.scm.get(this.multisigAB)!.appInstances;

    const [key] = [...appInstances.keys()].filter(key => {
      return (
        key !==
        this.mininodeA.scm.get(this.multisigAB)!.freeBalance.identityHash
      );
    });

    await this.mininodeA.protocolRunner.initiateProtocol(
      Protocol.Uninstall,
      this.mininodeA.scm,
      {
        appIdentityHash: key,
        initiatorXpub: this.mininodeA.xpub,
        responderXpub: this.mininodeB.xpub,
        multisigAddress: this.multisigAB
      }
    );

    await this.mr.waitForAllPendingPromises();
  }

  assertFB(
    participant: Participant,
    tokenAddress: string,
    expected: BigNumber
  ) {
    const mininode = {
      [Participant.A]: this.mininodeA,
      [Participant.B]: this.mininodeB,
      [Participant.C]: this.mininodeC
    }[participant];
    for (const multisig in [
      this.multisigAB,
      this.multisigBC,
      this.multisigAC
    ]) {
      if (mininode.scm.has(multisig)) {
        expect(
          mininode.scm
            .get(multisig)!
            .getFreeBalanceClass()
            .getBalance(tokenAddress, xkeyKthAddress(mininode.xpub, 0))
        ).toBeEq(expected);
      }
    }
  }
}
