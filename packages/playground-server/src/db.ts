import { Address } from "@counterfactual/types";
import { KnexRecord } from "@ebryn/jsonapi-ts";
import knex from "knex";
import { Log } from "logepi";
import { v4 as generateUuid } from "uuid";

import Errors from "./errors";
import User, { MatchedUser } from "./resources/user/resource";

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

export async function usernameAlreadyRegistered(
  username: string
): Promise<boolean> {
  const db = getDatabase();

  const query = db("users")
    .select("id")
    .where("username", username);

  const userId: { id: string }[] = await query;

  Log.debug("Executed usernameAlreadyRegistered query", {
    tags: { query: query.toSQL().sql }
  });

  await db.destroy();

  return userId.length > 0;
}

export async function matchmakeUser(userToMatch: User): Promise<MatchedUser> {
  const db = getDatabase();

  if (!userToMatch) {
    throw Errors.UserAddressRequired();
  }

  const query = db("users")
    .columns({
      id: "id",
      username: "username",
      ethAddress: "eth_address",
      nodeAddress: "node_address"
    })
    .select()
    .where("eth_address", "!=", userToMatch.attributes.ethAddress);

  const matchmakeResults: {
    id: string;
    username: string;
    ethAddress: string;
    nodeAddress: string;
  }[] = await query;

  Log.debug("Executed matchmakeUser query", {
    tags: { query: query.toSQL().sql }
  });

  await db.destroy();

  if (matchmakeResults.length === 1) {
    // If there is only one user, just select that one.
    Log.info("Matchmade completed with only user available", {
      tags: {
        nodes: [
          userToMatch.attributes.nodeAddress,
          matchmakeResults[0].nodeAddress
        ]
      }
    });
    const [user] = matchmakeResults;

    return new MatchedUser({
      id: user.id,
      attributes: {
        username: user.username,
        ethAddress: user.ethAddress,
        nodeAddress: user.nodeAddress
      }
    });
  }

  if (matchmakeResults.length === 0) {
    // If there are no users, throw an error.
    Log.warn("Cannot matchmake, no users available", {
      tags: { node: userToMatch.attributes.nodeAddress }
    });
    throw Errors.NoUsersAvailable();
  }

  // We do the random selection of the user outside of the DB
  // to avoid engine coupling; could've been solved using `.orderBy("RANDOM()")`.
  const randomIndex = Math.floor(Math.random() * matchmakeResults.length);

  const matchedUser = matchmakeResults[randomIndex];

  Log.info("Matchmade completed via random index selection", {
    tags: {
      users: [userToMatch.attributes.nodeAddress, matchedUser.nodeAddress]
    }
  });

  return new MatchedUser({
    id: matchedUser.id,
    attributes: {
      username: matchedUser.username,
      ethAddress: matchedUser.ethAddress,
      nodeAddress: matchedUser.nodeAddress
    }
  });
}

export async function getUsers(
  filters: {},
  fields: string[] = []
): Promise<User[]> {
  const db = getDatabase();
  let returnFields = fields;

  if (!returnFields.length) {
    returnFields = [
      "username",
      "email",
      "ethAddress",
      "multisigAddress",
      "nodeAddress"
    ];
  }

  const users: KnexRecord[] = await db("users")
    .columns({
      id: "id",
      username: "username",
      email: "email",
      ethAddress: "eth_address",
      multisigAddress: "multisig_address",
      nodeAddress: "node_address"
    })
    .where(compactObject(filters))
    .select();

  await db.destroy();

  return users.map(
    (user: KnexRecord) =>
      new User({
        id: user.id,
        attributes: returnFields
          .map(field => ({ [field]: user[field] }))
          .reduce((fieldA, fieldB) => ({ ...fieldA, ...fieldB }), {})
      })
  );
}

export async function getUser(userToFind: User): Promise<User> {
  const db = getDatabase();

  const query = db("users")
    .columns({
      id: "id",
      username: "username",
      email: "email",
      ethAddress: "eth_address",
      multisigAddress: "multisig_address",
      nodeAddress: "node_address"
    })
    .select()
    .where("eth_address", "=", userToFind.attributes.ethAddress);

  const users: ({
    id: string;
    username: string;
    email: string;
    ethAddress: string;
    multisigAddress: string;
    nodeAddress: string;
  })[] = await query;

  Log.debug("Executed getUser query", {
    tags: { query: query.toSQL().sql }
  });

  await db.destroy();

  if (users.length === 0) {
    Log.info("No user found with provided address", {
      tags: { user: userToFind.attributes.ethAddress }
    });
    throw Errors.UserNotFound();
  }

  const [user] = users;

  return new User({
    id: user.id,
    attributes: {
      username: user.username,
      email: user.email,
      ethAddress: user.ethAddress,
      multisigAddress: user.multisigAddress,
      nodeAddress: user.nodeAddress
    }
  });
}

export async function userExists(user: User): Promise<boolean> {
  const db = getDatabase();

  const query = db("users")
    .select()
    .where({
      username: user.attributes.username,
      email: user.attributes.email,
      eth_address: user.attributes.ethAddress,
      multisig_address: user.attributes.multisigAddress,
      node_address: user.attributes.nodeAddress
    })
    .limit(1);

  const users = await query;

  Log.debug("Executed userExists query", {
    tags: { query: query.toSQL().sql }
  });

  await db.destroy();

  return users.length === 1;
}

export async function createUser(user: User): Promise<User> {
  const db = getDatabase();

  const id = generateUuid();

  const query = db("users").insert({
    id,
    username: user.attributes.username,
    email: user.attributes.email,
    eth_address: user.attributes.ethAddress,
    multisig_address: user.attributes.multisigAddress,
    node_address: user.attributes.nodeAddress
  });

  try {
    await query;

    Log.debug("Executed createUser query", {
      tags: { query: query.toSQL().sql }
    });

    await db.destroy();

    return new User({
      id,
      attributes: user.attributes
    });
  } catch (e) {
    const error = e as Error;

    if (error.message.match(/unique constraint/i)) {
      throw Errors.UsernameAlreadyExists();
    } else {
      throw e;
    }
  }
}

export async function bindMultisigToUser(
  user: User,
  multisigAddress: string
): Promise<boolean> {
  const db = getDatabase();

  const query = db("users")
    .where({ id: user.id })
    .update("multisig_address", multisigAddress);

  try {
    await query;

    Log.debug("Executed createUser query", {
      tags: { query: query.toSQL().sql }
    });

    return true;
  } catch (e) {
    throw e;
  } finally {
    await db.destroy();
  }
}

function compactObject(filters: {}): {} {
  Object.keys(filters).forEach(
    key => filters[key] === undefined && delete filters[key]
  );

  return filters;
}
