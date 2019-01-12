import { Address } from "@counterfactual/types";
import knex from "knex";
import { Log } from "logepi";
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
  Log.debug("Connected to database", {});
  return knex(DATABASE_CONFIGURATION);
}

export async function ethAddressAlreadyRegistered(
  address: Address
): Promise<boolean> {
  const db = getDatabase();

  const query = db("users")
    .select("id")
    .where("eth_address", address);

  const userId: { id: string }[] = await query;

  Log.debug("Executed ethAddressAlreadyRegistered query", {
    tags: { query: query.toSQL().sql }
  });

  await db.destroy();

  return userId.length > 0;
}

export async function matchmakeUser(
  userAddress: Address
): Promise<MatchmakeUserData> {
  const db = getDatabase();

  const query = db("users")
    .columns({ username: "username", address: "eth_address" })
    .select()
    .where("eth_address", "!=", userAddress);

  const matchmakeResults: {
    username: string;
    address: string;
  }[] = await query;

  Log.debug("Executed matchmakeUser query", {
    tags: { query: query.toSQL().sql }
  });

  await db.destroy();

  if (matchmakeResults.length === 1) {
    // If there is only one user, just select that one.
    Log.info("Matchmade completed with only user available", {
      tags: { users: [userAddress, matchmakeResults[0]] }
    });
    return matchmakeResults[0];
  }

  if (matchmakeResults.length === 0) {
    // If there are no users, throw an error.
    Log.warn("Cannot matchmake, no users available", {
      tags: { user: userAddress }
    });
    throw ErrorCode.NoUsersAvailable;
  }

  // We do the random selection of the user outside of the DB
  // to avoid engine coupling; could've been solved using `.orderBy("RANDOM()")`.
  const randomIndex = Math.floor(Math.random() * matchmakeResults.length);

  Log.info("Matchmade completed via random index selection", {
    tags: { users: [userAddress, matchmakeResults[randomIndex]] }
  });

  return matchmakeResults[randomIndex];
}

export async function getUser(userAddress: Address): Promise<PlaygroundUser> {
  const db = getDatabase();

  const query = db("users")
    .columns({
      id: "id",
      username: "username",
      email: "email",
      address: "eth_address",
      multisigAddress: "multisig_address"
    })
    .select()
    .where("eth_address", "=", userAddress);

  const users: PlaygroundUser[] = await query;

  Log.debug("Executed getUser query", {
    tags: { query: query.toSQL().sql }
  });

  await db.destroy();

  if (users.length === 0) {
    Log.info("No user found with provided address", {
      tags: { user: userAddress }
    });
    throw ErrorCode.UserNotFound;
  }

  return users[0];
}

export async function userExists(user: PlaygroundUser): Promise<boolean> {
  const db = getDatabase();

  const query = db("users")
    .select()
    .where({
      id: user.id,
      username: user.username,
      email: user.email,
      eth_address: user.address,
      multisig_address: user.multisigAddress
    })
    .limit(1);

  const users: PlaygroundUser[] = await query;

  Log.debug("Executed userExists query", {
    tags: { query: query.toSQL().sql }
  });

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

  const query = db("users").insert({
    id,
    username: data.username,
    email: data.email,
    eth_address: data.address,
    multisig_address: data.multisigAddress
  });

  await query;

  Log.debug("Executed createUser query", {
    tags: { query: query.toSQL().sql }
  });

  await db.destroy();

  return {
    id,
    ...data
  };
}
