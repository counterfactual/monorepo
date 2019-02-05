import axios from "axios";
import { readFileSync } from "fs";
import { Server } from "http";
import { Log, LogLevel } from "logepi";
import { resolve } from "path";

import mountApi from "../src/api";
import { getDatabase } from "../src/db";
import { createNode, createNodeSingleton, getNodeAddress } from "../src/node";
import {
  APIResource,
  APIResourceCollection,
  APIResourceRelationships,
  APIResponse,
  AppAttributes,
  ErrorCode,
  HttpStatusCode,
  UserAttributes
} from "../src/types";

import {
  PK_ALICE,
  PK_BOB,
  PK_CHARLIE,
  POST_SESSION_ALICE,
  POST_SESSION_ALICE_SIGNATURE_HEADER,
  POST_SESSION_CHARLIE,
  POST_SESSION_CHARLIE_SIGNATURE_HEADER,
  POST_USERS_ALICE,
  POST_USERS_ALICE_DUPLICATE_USERNAME,
  POST_USERS_ALICE_DUPLICATE_USERNAME_SIGNATURE_HEADER,
  POST_USERS_ALICE_INVALID_SIGNATURE,
  POST_USERS_ALICE_INVALID_SIGNATURE_HEADER,
  POST_USERS_ALICE_NO_SIGNATURE,
  POST_USERS_ALICE_SIGNATURE_HEADER,
  TOKEN_BOB,
  USR_ALICE,
  USR_BOB,
  USR_CHARLIE
} from "./mock-data";

const api = mountApi();
let server: Server;

const client = axios.create({
  baseURL: "http://localhost:9001/api",
  headers: {
    "content-type": "application/json"
  }
});

const db = getDatabase();

Log.setOutputLevel(LogLevel.ERROR);

describe("playground-server", () => {
  beforeAll(async () => {
    await createNodeSingleton();

    await createNode(PK_ALICE);
    await createNode(PK_BOB);
    await createNode(PK_CHARLIE);

    await db.schema.dropTableIfExists("users");
    await db.schema.createTable("users", table => {
      table.uuid("id");
      table.string("username");
      table.string("email");
      table.string("eth_address");
      table.string("multisig_address");
      table.string("node_address");
      table.unique(["username"], "uk_users__username");
    });
  });

  beforeEach(done => {
    server = api.listen(9001, done);
  });

  afterEach(done => {
    server.close(done);
  });

  afterAll(async () => {
    await db("users").delete();
  });

  describe("/api/matchmaking", () => {

    it("returns the only possible user as a match", async done => {
      await db("users").insert({
        username: USR_ALICE.username,
        email: USR_ALICE.email,
        eth_address: USR_ALICE.ethAddress,
        node_address: USR_ALICE.nodeAddress
      });

      client
        .post(
          "/matchmaking",
          {},
          {
            headers: {
              Authorization: `Bearer ${TOKEN_BOB}`
            }
          }
        )
        .then(response => {
          const json = response.data as APIResponse;
          const data = json.data as APIResource;
          const rels = data.relationships as APIResourceRelationships;
          const included = json.included as APIResourceCollection;

          expect(data.type).toEqual("matchmaking");
          expect(data.id).toBeDefined();
          expect(data.attributes).toEqual({
            intermediary: getNodeAddress()
          });
          expect((rels.users!.data as APIResource).type).toEqual("users");
          expect((rels.matchedUser!.data as APIResource).type).toEqual(
            "matchedUser"
          );
          expect(rels).toBeDefined();
          expect((rels.users!.data as APIResource).id).toBeDefined();
          expect((rels.matchedUser!.data as APIResource).id).toBeDefined();
          expect(included).toBeDefined();
          expect(included[0].type).toEqual("users");
          expect(included[0].attributes.username).toEqual(USR_BOB.username);
          expect(included[0].attributes.ethAddress).toEqual(USR_BOB.ethAddress);
          expect(included[0].attributes.nodeAddress).toEqual(
            USR_BOB.nodeAddress
          );
          expect(included[1].type).toEqual("matchedUser");
          expect(included[1].attributes.username).toEqual(USR_ALICE.username);
          expect(included[1].attributes.ethAddress).toEqual(
            USR_ALICE.ethAddress
          );
          expect(included[1].attributes.nodeAddress).toEqual(
            USR_ALICE.nodeAddress
          );

          expect(response.status).toEqual(HttpStatusCode.Created);
          done();
        })
        .catch(error => {
          console.error(error);
          fail("Something went wrong");
          done();
        });
    });
  });
});
