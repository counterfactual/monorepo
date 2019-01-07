import { Address } from "@counterfactual/types";
import knex from "knex";
import { v4 as generateUuid } from "uuid";

import { ErrorCode, PlaygroundUser, PlaygroundUserData } from "./types";

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
