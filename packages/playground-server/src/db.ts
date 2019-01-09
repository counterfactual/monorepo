import { Address } from "@counterfactual/types";
import knex from "knex";
import { v4 as generateUuid } from "uuid";

import {
  ErrorCode,
  MatchmakeUserData,
  PlaygroundUser,
  PlaygroundUserData
} from "./types";

const DATABASE_CONFIGURATION: knex.Config = {
  client: process.env.DB_ENGINE as string,
  connection: (process.env.DB_CONNECTION_STRING as string) || {
    filename: process.env.DB_FILE as string
  },
  searchPath: process.env.DB_CONNECTION_STRING
    ? ["playground_db", "public"]
    : [],
  useNullAsDefault: process.env.DB_FILE ? true : false
};

export function getDatabase() {
  return knex(DATABASE_CONFIGURATION);
}

export async function ethAddressAlreadyRegistered(
  address: Address
): Promise<boolean> {
  const db = getDatabase();

  const userId: { id: string }[] = await db("users")
    .select("id")
    .where("eth_address", address);

  await db.destroy();

  return userId.length > 0;
}

export async function matchmakeUser(
  userAddress: Address
): Promise<MatchmakeUserData> {
  const db = getDatabase();

  const matchmakeResults: {
    username: string;
    address: string;
  }[] = await db("users")
    .columns({ username: "username", address: "eth_address" })
    .select()
    .where("eth_address", "!=", userAddress);

  await db.destroy();

  if (matchmakeResults.length === 1) {
    // If there is only one user, just select that one.
    return matchmakeResults[0];
  }

  if (matchmakeResults.length === 0) {
    // If there are no users, throw an error.
    throw ErrorCode.NoUsersAvailable;
  }

  // We do the random selection of the user outside of the DB
  // to avoid engine coupling; could've been solved using `.orderBy("RANDOM()")`.
  const randomIndex = Math.floor(Math.random() * matchmakeResults.length);

  return matchmakeResults[randomIndex];
}

export async function getUser(userAddress: Address): Promise<PlaygroundUser> {
  const db = getDatabase();

  const users: PlaygroundUser[] = await db("users")
    .columns({
      id: "id",
      username: "username",
      email: "email",
      address: "eth_address",
      multisigAddress: "multisig_address"
    })
    .select()
    .where("eth_address", "=", userAddress);

  await db.destroy();

  if (users.length === 0) {
    throw ErrorCode.UserNotFound;
  }

  return users[0];
}

export async function userExists(user: PlaygroundUser): Promise<boolean> {
  const db = getDatabase();

  const users: PlaygroundUser[] = await db("users")
    .select()
    .where({
      id: user.id,
      username: user.username,
      email: user.email,
      address: user.address,
      multisigAddress: user.multisigAddress
    })
    .limit(1);

  await db.destroy();

  return users.length === 1;
}

export async function createUser(
  data: PlaygroundUserData & { multisigAddress: Address }
): Promise<PlaygroundUser> {
  if (await ethAddressAlreadyRegistered(data.address)) {
    throw ErrorCode.AddressAlreadyRegistered;
  }

  const db = getDatabase();

  const id = generateUuid();

  await db("users").insert({
    id,
    username: data.username,
    email: data.email,
    eth_address: data.address,
    multisig_address: data.multisigAddress
  });

  await db.destroy();

  return {
    id,
    ...data
  };
}
