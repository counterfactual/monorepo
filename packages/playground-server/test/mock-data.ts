import { hashMessage, joinSignature, SigningKey } from "ethers/utils";
import { fromMnemonic } from "ethers/utils/hdnode";
import { sign } from "jsonwebtoken";

function syncSignMessage(key: SigningKey, message: string) {
  return joinSignature(key.signDigest(hashMessage(message)));
}

function getNodeAddress(mnemonic: string) {
  return fromMnemonic(mnemonic)
    .derivePath("m/44'/60'/0'/25446")
    .neuter().extendedKey;
}

export const PK_ALICE =
  "0xe74ad40ac33d783e5775666ebbd28d0b395dbb4287bee0e88e1803df6eaa7ab4";

export const PK_ALICE_DUPE =
  "0x114ed1e994780a9d6decfc0915f43668f61b97fe8c37611152fc8b5e942b2dd5";

export const PK_BOB =
  "0x114ed1e994780a9d6decfc0915f43668f61b97fe8c37611152fc8b5e942b2dd5";

export const PK_CHARLIE =
  "0x4a138819ac516411432e76db794333eecd66e88926a528e621e31a97f5280c33";

export const MNEMONIC_PG_SERVER =
  "road arrange episode feel street mom person series guard view eyebrow clinic";

export const MNEMONIC_ALICE =
  "silk nephew betray double salt lottery inmate dragon invite cheap fog raccoon";

export const MNEMONIC_ALICE_DUPE =
  "unlock aspect color dentist dress forward title animal exact cupboard orphan weasel";

export const MNEMONIC_BOB = MNEMONIC_ALICE_DUPE;

export const MNEMONIC_CHARLIE =
  "daring share together slight midnight squirrel fitness course weather decide rent pottery";

export const USR_BOB_ID = "e5a48217-5d83-4fdd-bf1d-b9e35934f0f2";

export const USR_ALICE = {
  username: "alice_account3",
  email: "alice@wonderland.com",
  ethAddress: new SigningKey(PK_ALICE).address,
  nodeAddress: getNodeAddress(MNEMONIC_ALICE)
};

export const USR_ALICE_KNEX = {
  username: "alice_account3",
  email: "alice@wonderland.com",
  eth_address: new SigningKey(PK_ALICE).address,
  node_address: getNodeAddress(MNEMONIC_ALICE)
};

export const USR_ALICE_DUPLICATE_USERNAME = {
  username: USR_ALICE.username,
  email: USR_ALICE.email,
  ethAddress: new SigningKey(PK_BOB).address,
  nodeAddress: getNodeAddress(MNEMONIC_BOB)
};

export const USR_BOB = {
  username: "bob_account1",
  email: "bob@wonderland.com",
  ethAddress: new SigningKey(PK_BOB).address,
  multisigAddress: "0xc5F6047a22A5582f62dBcD278f1A2275ab39001A",
  nodeAddress: getNodeAddress(MNEMONIC_BOB)
};

export const USR_BOB_KNEX = {
  id: USR_BOB_ID,
  email: "bob@wonderland.com",
  eth_address: new SigningKey(PK_BOB).address,
  multisig_address: "0xc5F6047a22A5582f62dBcD278f1A2275ab39001A",
  node_address: getNodeAddress(MNEMONIC_BOB),
  username: "bob_account1"
};

export const USR_CHARLIE = {
  username: "charlie_account2",
  email: "charlie@wonderland.com",
  ethAddress: new SigningKey(PK_CHARLIE).address,
  nodeAddress: getNodeAddress(MNEMONIC_CHARLIE)
};

export const USR_CHARLIE_KNEX = {
  username: "charlie_account2",
  email: "charlie@wonderland.com",
  eth_address: new SigningKey(PK_CHARLIE).address,
  node_address: getNodeAddress(MNEMONIC_CHARLIE)
};

export const POST_USERS_ALICE = {
  data: {
    type: "user",
    attributes: { ...USR_ALICE }
  }
};

export const POST_USERS_ALICE_SIGNATURE_HEADER = {
  authorization: `Signature ${syncSignMessage(
    new SigningKey(PK_ALICE),
    [
      "PLAYGROUND ACCOUNT REGISTRATION",
      `Username: ${USR_ALICE.username}`,
      `E-mail: ${USR_ALICE.email}`,
      `Ethereum address: ${USR_ALICE.ethAddress}`,
      `Node address: ${USR_ALICE.nodeAddress}`
    ].join("\n")
  )}`
};

export const POST_USERS_ALICE_NO_SIGNATURE = {
  data: {
    type: "user",
    attributes: { ...USR_ALICE }
  }
};

export const POST_USERS_ALICE_INVALID_SIGNATURE = {
  ...POST_USERS_ALICE
};

export const POST_USERS_ALICE_INVALID_SIGNATURE_HEADER = {
  authorization:
    "Signature 0xc157208c17b60bf325500914d0b4ddf57ee4c9c2ff1509e318c3d138a4ccb08b3258f9ac4e72d824fef67a40c3959e2f6480cdf6fbbf2590ea4a8bb17e7d5c980d"
};

export const POST_USERS_ALICE_DUPLICATE_USERNAME = {
  data: {
    type: "user",
    attributes: { ...USR_ALICE_DUPLICATE_USERNAME }
  }
};

export const POST_USERS_ALICE_DUPLICATE_USERNAME_SIGNATURE_HEADER = {
  authorization: `Signature ${syncSignMessage(
    new SigningKey(PK_ALICE_DUPE),
    [
      "PLAYGROUND ACCOUNT REGISTRATION",
      `Username: ${USR_ALICE_DUPLICATE_USERNAME.username}`,
      `E-mail: ${USR_ALICE_DUPLICATE_USERNAME.email}`,
      `Ethereum address: ${USR_ALICE_DUPLICATE_USERNAME.ethAddress}`,
      `Node address: ${USR_ALICE_DUPLICATE_USERNAME.nodeAddress}`
    ].join("\n")
  )}`
};

export const POST_USERS_CHARLIE = {
  data: {
    type: "user",
    attributes: { ...USR_CHARLIE }
  }
};

export const POST_USERS_CHARLIE_SIGNATURE_HEADER = {
  authorization: `Signature ${syncSignMessage(
    new SigningKey(PK_CHARLIE),
    [
      "PLAYGROUND ACCOUNT REGISTRATION",
      `Username: ${USR_CHARLIE.username}`,
      `E-mail: ${USR_CHARLIE.email}`,
      `Ethereum address: ${USR_CHARLIE.ethAddress}`,
      `Node address: ${USR_CHARLIE.nodeAddress}`
    ].join("\n")
  )}`
};

export const POST_SESSION_CHARLIE = {
  data: {
    type: "sessionRequest",
    attributes: { ethAddress: USR_CHARLIE.ethAddress }
  }
};

export const POST_SESSION_CHARLIE_SIGNATURE_HEADER = {
  authorization: `Signature ${syncSignMessage(
    new SigningKey(PK_CHARLIE),
    [
      "PLAYGROUND ACCOUNT LOGIN",
      `Ethereum address: ${USR_CHARLIE.ethAddress}`
    ].join("\n")
  )}`
};

export const POST_SESSION_BOB = {
  data: {
    type: "sessionRequest",
    attributes: { ethAddress: USR_BOB.ethAddress }
  }
};

export const POST_SESSION_BOB_SIGNATURE_HEADER = {
  authorization: `Signature ${syncSignMessage(
    new SigningKey(PK_BOB),
    [
      "PLAYGROUND ACCOUNT LOGIN",
      `Ethereum address: ${USR_BOB.ethAddress}`
    ].join("\n")
  )}`
};

export const POST_SESSION_ALICE = {
  data: {
    type: "sessionRequest",
    attributes: { ethAddress: USR_ALICE.ethAddress }
  }
};

export const POST_SESSION_ALICE_SIGNATURE_HEADER = {
  authorization: `Signature ${syncSignMessage(
    new SigningKey(PK_ALICE),
    [
      "PLAYGROUND ACCOUNT LOGIN",
      `Ethereum address: ${USR_ALICE.ethAddress}`
    ].join("\n")
  )}`
};

export const TOKEN_BOB = sign(
  {
    attributes: USR_BOB,
    id: USR_BOB_ID
  },
  "0x0123456789012345678901234567890123456789012345678901234567890123",
  { expiresIn: "1Y" }
);
