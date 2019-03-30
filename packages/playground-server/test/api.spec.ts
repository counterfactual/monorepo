import { Node } from "@counterfactual/node";
import { Node as NodeTypes } from "@counterfactual/types";
import {
  HttpStatusCode,
  JsonApiDocument,
  JsonApiErrors,
  JsonApiErrorsDocument
} from "@ebryn/jsonapi-ts";
import axios from "axios";
import { JsonRpcProvider } from "ethers/providers";
import { readFileSync } from "fs";
import { Server } from "http";
import { Log, LogLevel } from "logepi";
import { resolve } from "path";
import { v4 as generateUUID } from "uuid";

import mountApi from "../src/api";
import { getDatabase } from "../src/db";
import Errors from "../src/errors";
import { NodeWrapper, serviceFactoryPromise } from "../src/node";
import MatchmakingRequest from "../src/resources/matchmaking-request/resource";
import User from "../src/resources/user/resource";

import {
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
  USR_ALICE_KNEX,
  USR_BOB,
  USR_BOB_ID,
  USR_BOB_KNEX,
  USR_CHARLIE,
  USR_CHARLIE_KNEX
} from "./mock-data";

jest.setTimeout(10000);

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

const GANACHE_URL = global["ganacheURL"];
const NETWORK_CONTEXT = global["networkContext"];

describe("playground-server", () => {
  let playgroundNode: Node;
  let nodeAlice: Node;
  let nodeBob: Node;
  let nodeCharlie: Node;

  beforeAll(async () => {
    const provider = new JsonRpcProvider(GANACHE_URL);
    const serviceFactory = await serviceFactoryPromise;

    playgroundNode = await NodeWrapper.createNodeSingleton(
      NETWORK_CONTEXT,
      global["pgMnemonic"],
      provider,
      serviceFactory.createStoreService(generateUUID())
    );

    nodeAlice = await NodeWrapper.createNode(
      NETWORK_CONTEXT,
      provider,
      global["nodeAMnemonic"]
    );

    nodeBob = await NodeWrapper.createNode(
      NETWORK_CONTEXT,
      provider,
      global["nodeBMnemonic"]
    );

    nodeCharlie = await NodeWrapper.createNode(
      NETWORK_CONTEXT,
      provider,
      global["nodeCMnemonic"]
    );

    expect(nodeAlice).not.toEqual(nodeBob);
    expect(nodeAlice).not.toEqual(nodeCharlie);

    await db.schema.dropTableIfExists("users");
    await db.schema.createTable("users", table => {
      table.uuid("id");
      table.string("username");
      table.string("email");
      table.string("eth_address");
      table.string("multisig_address");
      table.string("node_address");
      table.string("transaction_hash");
      table.unique(["username"], "uk_users__username");
    });

    NodeWrapper.createStateChannelFor = jest.fn(async (userAddress: string) => {
      return Promise.resolve({
        transactionHash:
          "0xf517872f3c466c2e1520e35ad943d833fdca5a6739cfea9e686c4c1b3ab1022e"
      } as NodeTypes.CreateChannelTransactionResult);
    });
  });

  beforeAll(done => {
    server = api.listen(9001, done);
  });

  afterEach(async done => {
    await db("users").delete();
    done();
  });

  afterAll(done => {
    server.close(done);
  });

  describe("/api/apps", () => {
    it("gets a list of apps", async done => {
      const response = await client.get("/apps").catch(error => {
        console.error(error.message, error.response.data);
        throw error;
      });

      const registry = JSON.parse(
        readFileSync(resolve(__dirname, "../registry.json")).toString()
      );
      expect(response.status).toEqual(HttpStatusCode.OK);
      expect(response.data).toEqual(registry);
      done();
    });
  });

  describe("/api/users", () => {
    it("fails when signature is not passed to the request", async done => {
      await client
        .post("/users", POST_USERS_ALICE_NO_SIGNATURE(global["nodeAMnemonic"]))
        .catch(({ response }) => {
          expect(response.data).toEqual({
            errors: [
              {
                status: HttpStatusCode.BadRequest,
                code: Errors.SignatureRequired().code
              }
            ]
          } as JsonApiErrorsDocument);
          expect(response.status).toEqual(HttpStatusCode.BadRequest);
        });

      done();
    });

    it("fails when an invalid signature is passed to the request", async done => {
      await client
        .post(
          "/users",
          POST_USERS_ALICE_INVALID_SIGNATURE(global["nodeAMnemonic"]),
          {
            headers: POST_USERS_ALICE_INVALID_SIGNATURE_HEADER
          }
        )
        .catch(({ response }) => {
          expect(response.data).toEqual({
            errors: [
              {
                status: HttpStatusCode.BadRequest,
                code: Errors.InvalidSignature().code
              }
            ]
          } as JsonApiErrorsDocument);
          expect(response.status).toEqual(HttpStatusCode.BadRequest);
        });

      done();
    });

    it("creates an account for the first time and returns 201, without the multisig address", async done => {
      jest.setTimeout(10000);
      const response = await client
        .post("/users", POST_USERS_ALICE(global["nodeAMnemonic"]), {
          headers: POST_USERS_ALICE_SIGNATURE_HEADER(global["nodeAMnemonic"])
        })
        .catch(error => {
          console.error(error.message, error.response.data);
          throw error;
        });

      const data = response.data.data as User;

      const aliceUser = USR_ALICE(global["nodeAMnemonic"]);
      expect(data.id).toBeDefined();
      expect(data.attributes.username).toEqual(aliceUser.username);
      expect(data.attributes.email).toEqual(aliceUser.email);
      expect(data.attributes.ethAddress).toEqual(aliceUser.ethAddress);
      expect(data.attributes.nodeAddress).toEqual(aliceUser.nodeAddress);
      expect(data.attributes.multisigAddress).not.toBeDefined();
      expect(data.attributes.token).toBeDefined();
      expect(response.status).toEqual(HttpStatusCode.Created);
      done();
    });

    it("creates an account for the second time, fails for duplicate data and returns HttpStatusCode.BadRequest", async done => {
      await client
        .post("/users", POST_USERS_ALICE(global["nodeAMnemonic"]), {
          headers: POST_USERS_ALICE_SIGNATURE_HEADER(global["nodeAMnemonic"])
        })
        .catch(({ response }) => {
          expect(response.data).toEqual({
            errors: [
              {
                status: HttpStatusCode.BadRequest,
                code: Errors.UsernameAlreadyExists().code
              }
            ]
          } as JsonApiErrorsDocument);
          expect(response.status).toEqual(HttpStatusCode.BadRequest);
        });

      done();
    });

    it("creates an account for the second time with the same username and returns HttpStatusCode.BadRequest", async done => {
      await client
        .post(
          "/users",
          POST_USERS_ALICE_DUPLICATE_USERNAME(global["nodeAMnemonic"]),
          {
            headers: POST_USERS_ALICE_DUPLICATE_USERNAME_SIGNATURE_HEADER(
              global["nodeAMnemonic"]
            )
          }
        )
        .catch(({ response }) => {
          expect(response.data).toEqual({
            errors: [
              {
                status: HttpStatusCode.BadRequest,
                code: Errors.UsernameAlreadyExists().code
              }
            ]
          } as JsonApiErrorsDocument);
          expect(response.status).toEqual(HttpStatusCode.BadRequest);
        });

      done();
    });
  });

  describe("/api/session-requests", () => {
    it("fails if no signature is provided", done => {
      client
        .post("/session-requests", {
          data: {
            type: "sessionRequest"
          }
        })
        .catch(({ response }) => {
          expect(response.data).toEqual({
            errors: [
              {
                status: HttpStatusCode.BadRequest,
                code: Errors.SignatureRequired().code
              }
            ]
          } as JsonApiErrorsDocument);
          expect(response.status).toEqual(HttpStatusCode.BadRequest);
          done();
        });
    });

    it("fails for a non-registered address", done => {
      client
        .post(
          "/session-requests",
          POST_SESSION_CHARLIE(global["nodeCMnemonic"]),
          {
            headers: POST_SESSION_CHARLIE_SIGNATURE_HEADER(
              global["nodeCMnemonic"]
            )
          }
        )
        .catch(({ response }) => {
          expect(response.data).toEqual({
            errors: [
              {
                status: HttpStatusCode.BadRequest,
                code: Errors.UserNotFound().code
              }
            ]
          });
          expect(response.status).toEqual(HttpStatusCode.BadRequest);
          done();
        });
    });

    it("returns user data with a token", async done => {
      await db("users").insert(USR_CHARLIE_KNEX(global["nodeCMnemonic"]));

      const response = await client
        .post(
          "/session-requests",
          POST_SESSION_CHARLIE(global["nodeCMnemonic"]),
          {
            headers: POST_SESSION_CHARLIE_SIGNATURE_HEADER(
              global["nodeCMnemonic"]
            )
          }
        )
        .catch(error => {
          console.error(error.message, error.response.data);
          throw error;
        });

      const data = response.data.data;

      const charlieUser = USR_CHARLIE(global["nodeCMnemonic"]);
      expect(data.attributes.email).toEqual(charlieUser.email);
      expect(data.attributes.ethAddress).toEqual(charlieUser.ethAddress);
      expect(data.attributes.multisigAddress).toBeDefined();
      expect(data.attributes.nodeAddress).toEqual(charlieUser.nodeAddress);
      expect(data.attributes.username).toEqual(charlieUser.username);
      expect(data.attributes.token).toBeDefined();

      expect(response.status).toEqual(HttpStatusCode.Created);
      done();
    });
  });

  describe("/api/users", () => {
    it("fails if no token is provided", async done => {
      await client.get("/users").catch(({ response }) => {
        expect(response.data).toEqual({
          errors: [
            {
              status: HttpStatusCode.Unauthorized,
              code: "access_denied"
            }
          ]
        });
        expect(response.status).toEqual(HttpStatusCode.Unauthorized);
      });

      done();
    });

    it("returns user data from a token", async done => {
      await db("users").insert(USR_BOB_KNEX(global["nodeBMnemonic"]));

      const response = await client
        .get("/users/me", {
          headers: {
            Authorization: `Bearer ${TOKEN_BOB}`
          }
        })
        .catch(error => {
          console.error(error.message, error.response.data);
          throw error;
        });

      expect(response.status).toEqual(HttpStatusCode.OK);
      expect(response.data).toEqual({
        data: [
          {
            attributes: USR_BOB(global["nodeBMnemonic"]),
            id: USR_BOB_ID,
            relationships: {},
            type: "user"
          }
        ]
      });

      done();
    });
  });

  describe("/api/matchmaking-requests", () => {
    it("fails if no token is provided", async done => {
      await client
        .post("/matchmaking-requests", {
          data: {
            type: "matchmakingRequest"
          }
        })
        .catch(({ response }) => {
          expect(response.data).toEqual({
            errors: [
              {
                status: HttpStatusCode.Unauthorized,
                code: JsonApiErrors.Unauthorized().code
              }
            ]
          });
          expect(response.status).toEqual(HttpStatusCode.Unauthorized);
        });

      done();
    });

    it("fails when there are no users to match with", async done => {
      await db("users").insert(USR_BOB_KNEX(global["nodeBMnemonic"]));

      client
        .post(
          "/matchmaking-requests",
          {
            data: {
              type: "matchmakingRequest"
            }
          },
          {
            headers: {
              Authorization: `Bearer ${TOKEN_BOB}`
            }
          }
        )
        .catch(({ response }) => {
          expect(response.data).toEqual({
            errors: [
              {
                status: HttpStatusCode.BadRequest,
                code: Errors.NoUsersAvailable().code
              }
            ]
          });
          expect(response.status).toEqual(HttpStatusCode.BadRequest);
          done();
        });
    });

    it("returns the only possible user as a match", async done => {
      await db("users").insert([
        USR_BOB_KNEX(global["nodeBMnemonic"]),
        USR_ALICE_KNEX(global["nodeAMnemonic"])
      ]);

      const response = await client
        .post(
          "/matchmaking-requests",
          {
            data: {
              type: "matchmakingRequest"
            }
          },
          {
            headers: {
              Authorization: `Bearer ${TOKEN_BOB}`
            }
          }
        )
        .catch(error => {
          console.error(error.message, error.response.data);
          throw error;
        });

      const json = response.data as JsonApiDocument<MatchmakingRequest>;
      const data = json.data as MatchmakingRequest;

      const aliceUser = USR_ALICE(global["nodeAMnemonic"]);
      expect(data.type).toEqual("matchmakingRequest");
      expect(data.id).toBeDefined();
      expect(data.attributes).toEqual({
        intermediary: NodeWrapper.getNodeAddress(),
        username: aliceUser.username,
        ethAddress: aliceUser.ethAddress,
        nodeAddress: aliceUser.nodeAddress
      });

      expect(response.status).toEqual(HttpStatusCode.Created);
      done();
    });

    it("returns the requested user as a match", async done => {
      await db("users").insert([
        USR_BOB_KNEX(global["nodeBMnemonic"]),
        USR_ALICE_KNEX(global["nodeAMnemonic"]),
        USR_CHARLIE_KNEX(global["nodeCMnemonic"])
      ]);

      const charlieUser = USR_CHARLIE(global["nodeCMnemonic"]);
      const response = await client
        .post(
          "/matchmaking-requests",
          {
            data: {
              type: "matchmakingRequest",
              attributes: {
                matchmakeWith: charlieUser.username
              }
            }
          },
          {
            headers: {
              Authorization: `Bearer ${TOKEN_BOB}`
            }
          }
        )
        .catch(error => {
          console.error(error.message, error.response.data);
          throw error;
        });

      const json = response.data as JsonApiDocument<MatchmakingRequest>;
      const data = json.data as MatchmakingRequest;

      expect(data.type).toEqual("matchmakingRequest");
      expect(data.id).toBeDefined();
      expect(data.attributes).toEqual({
        intermediary: playgroundNode.publicIdentifier,
        username: charlieUser.username,
        ethAddress: charlieUser.ethAddress,
        nodeAddress: charlieUser.nodeAddress
      });

      expect(response.status).toEqual(HttpStatusCode.Created);
      done();
    });

    it("returns one of three possible users as a match", async done => {
      // Mock an extra user into the DB first.
      await db("users").insert([
        USR_BOB_KNEX(global["nodeBMnemonic"]),
        USR_CHARLIE_KNEX(global["nodeAMnemonic"])
      ]);

      const response = await client
        .post(
          "/matchmaking-requests",
          {
            data: {
              type: "matchmakingRequest"
            }
          },
          {
            headers: {
              Authorization: `Bearer ${TOKEN_BOB}`
            }
          }
        )
        .catch(error => {
          console.error(error.message, error.response.data);
          throw error;
        });

      const { username, ethAddress } = response.data.data.attributes;

      const aliceUser = USR_ALICE(global["nodeAMnemonic"]);
      const charlieUser = USR_CHARLIE(global["nodeCMnemonic"]);
      if (username === charlieUser.username) {
        expect(ethAddress).toEqual(charlieUser.ethAddress);
      } else if (username === aliceUser.username) {
        expect(ethAddress).toEqual(aliceUser.ethAddress);
      } else {
        fail("It should have matched either Alice or Charlie");
      }

      expect(response.status).toEqual(HttpStatusCode.Created);

      done();
    });
  });
});
