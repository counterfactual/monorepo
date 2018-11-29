import { ethers } from "ethers";

export enum AssetType {
  ETH,
  ERC20,
  ANY
}

type AppIdentityInterface = {
  owner: string;
  signingKeys: string[];
  appInterfaceHash: string;
  termsHash: string;
  defaultTimeout: number;
};

export class AppIdentity {
  static readonly ABI_ENCODER_V2_ENCODING =
    "tuple(address owner, address[] signingKeys, bytes32 appInterfaceHash, bytes32 termsHash, uint256 defaultTimeout)";

  get id(): string {
    return this.hashOfEncoding();
  }

  constructor(
    readonly owner: string,
    readonly signingKeys: string[],
    readonly appInterfaceHash: string,
    readonly termsHash: string,
    readonly defaultTimeout: number
  ) {}

  public toJson(): AppIdentityInterface {
    return {
      owner: this.owner,
      signingKeys: this.signingKeys,
      appInterfaceHash: this.appInterfaceHash,
      termsHash: this.termsHash,
      defaultTimeout: this.defaultTimeout
    };
  }

  public hashOfEncoding(): string {
    return ethers.utils.keccak256(
      ethers.utils.defaultAbiCoder.encode(
        [AppIdentity.ABI_ENCODER_V2_ENCODING],
        [this.toJson()]
      )
    );
  }
}

export class AppInterface {
  private readonly ABI_ENCODER_V2_ENCODING =
    "tuple(address addr, bytes4 getTurnTaker, bytes4 applyAction, bytes4 resolve, bytes4 isStateTerminal)";

  constructor(
    readonly addr: string,
    readonly getTurnTaker: string,
    readonly applyAction: string,
    readonly resolve: string,
    readonly isStateTerminal: string
  ) {}

  public hashOfPackedEncoding(): string {
    return ethers.utils.keccak256(
      ethers.utils.defaultAbiCoder.encode(
        [this.ABI_ENCODER_V2_ENCODING],
        [
          {
            addr: this.addr,
            getTurnTaker: this.getTurnTaker,
            applyAction: this.applyAction,
            resolve: this.resolve,
            isStateTerminal: this.isStateTerminal
          }
        ]
      )
    );
  }
}

export class Terms {
  private readonly ABI_ENCODER_V2_ENCODING =
    "tuple(uint8 assetType, uint256 limit, address token)";

  constructor(
    readonly assetType: AssetType,
    readonly limit: number,
    readonly token: string
  ) {}

  public hashOfPackedEncoding(): string {
    return ethers.utils.keccak256(
      ethers.utils.defaultAbiCoder.encode(
        [this.ABI_ENCODER_V2_ENCODING],
        [
          {
            assetType: this.assetType,
            limit: this.limit,
            token: this.token
          }
        ]
      )
    );
  }
}

// TS version of MAppRegistryCore::computeStateHash
// export const;

// TS version of MAppRegistryCore::computeStateHash
export const computeStateHash = (
  id: string,
  appStateHash: string,
  nonce: number,
  timeout: number
) =>
  ethers.utils.keccak256(
    ethers.utils.solidityPack(
      ["bytes1", "bytes32", "uint256", "uint256", "bytes32"],
      ["0x19", id, nonce, timeout, appStateHash]
    )
  );

// TS version of MAppRegistryCore::computeActionHash
export const computeActionHash = (
  turnTaker: string,
  previousState: string,
  action: string,
  setStateNonce: number,
  disputeNonce: number
) =>
  ethers.utils.keccak256(
    ethers.utils.solidityPack(
      ["bytes1", "address", "bytes", "bytes", "uint256", "uint256"],
      ["0x19", turnTaker, previousState, action, setStateNonce, disputeNonce]
    )
  );

export class AppInstance {
  get id(): string {
    return this.hashOfEncoding();
  }

  get appIdentity(): AppIdentity {
    return new AppIdentity(
      this.owner,
      this.signingKeys,
      this.appInterface.hashOfPackedEncoding(),
      this.terms.hashOfPackedEncoding(),
      this.defaultTimeout
    );
  }

  constructor(
    readonly owner: string,
    readonly signingKeys: string[],
    readonly appInterface: AppInterface,
    readonly terms: Terms,
    readonly defaultTimeout: number
  ) {}

  public hashOfEncoding(): string {
    return this.appIdentity.hashOfEncoding();
  }
}

// export class OffChainState {
//   public signatures: Map<string, ethers.utils.Signature[]>;
//   constructor(
//     readonly state: object,
//     readonly nonce: number,
//     readonly timeout: number
//   ) {}
//   public signWith(wallet: ethers.utils.SigningKey) {
//     this.signatures[wallet.address] = wallet.signDigest()
//   }
// }

// export class AppRegistry {
//   constructor(readonly contract: ethers.Contract) {}
//   setState(app: App, state: StateUpdate) {}
// }
