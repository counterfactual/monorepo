import {
  HttpStatusCode,
  JsonApiDocument,
  JsonApiErrors,
  JsonApiErrorsDocument
} from "@ebryn/jsonapi-ts";
import axios from "axios";
import { readFileSync } from "fs";
import { Server } from "http";
import { Log, LogLevel } from "logepi";
import { resolve } from "path";

import mountApi from "../src/api";
import { getDatabase } from "../src/db";
import Errors from "../src/errors";
import { createNodeSingleton, getNodeAddress } from "../src/node";
import MatchmakingRequest from "../src/resources/matchmaking-request/resource";
import User from "../src/resources/user/resource";

import {
  // PK_ALICE,
  // PK_BOB,
  // PK_CHARLIE,
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
  // USR_BOB,
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

describe("playground-server", () => {
  beforeAll(async () => {
    await createNodeSingleton();

    // await createNode(PK_ALICE);
    // await createNode(PK_BOB);
    // await createNode(PK_CHARLIE);

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
        .post("/users", POST_USERS_ALICE_NO_SIGNATURE)
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
        .post("/users", POST_USERS_ALICE_INVALID_SIGNATURE, {
          headers: POST_USERS_ALICE_INVALID_SIGNATURE_HEADER
        })
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

    it.skip("creates an account for the first time and returns 201 + the multisig address", async done => {
      const response = await client
        .post("/users", POST_USERS_ALICE, {
          headers: POST_USERS_ALICE_SIGNATURE_HEADER
        })
        .catch(error => {
          console.error(error.message, error.response.data);
          throw error;
        });

      const data = response.data.data as User;

      expect(data.id).toBeDefined();
      expect(data.attributes.username).toEqual(USR_ALICE.username);
      expect(data.attributes.email).toEqual(USR_ALICE.email);
      expect(data.attributes.ethAddress).toEqual(USR_ALICE.ethAddress);
      expect(data.attributes.nodeAddress).toEqual(USR_ALICE.nodeAddress);
      expect(data.attributes.multisigAddress).toBeDefined();
      expect(data.attributes.token).toBeDefined();
      expect(response.status).toEqual(HttpStatusCode.Created);
      done();
    });

    it.skip("creates an account for the second time with the same address and returns HttpStatusCode.BadRequest", async done => {
      await client
        .post("/users", POST_USERS_ALICE, {
          headers: POST_USERS_ALICE_SIGNATURE_HEADER
        })
        .catch(({ response }) => {
          expect(response.data).toEqual({
            errors: [
              {
                status: HttpStatusCode.BadRequest,
                code: Errors.AddressAlreadyRegistered().code
              }
            ]
          } as JsonApiErrorsDocument);
          expect(response.status).toEqual(HttpStatusCode.BadRequest);
        });

      done();
    });

    it.skip("creates an account for the second time with the same username and returns HttpStatusCode.BadRequest", async done => {
      await client
        .post("/users", POST_USERS_ALICE_DUPLICATE_USERNAME, {
          headers: POST_USERS_ALICE_DUPLICATE_USERNAME_SIGNATURE_HEADER
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
        .post("/session-requests", POST_SESSION_CHARLIE, {
          headers: POST_SESSION_CHARLIE_SIGNATURE_HEADER
        })
        .catch(({ response }) => {
          expect(response.data).toEqual({
            errors: [
              {
                status: HttpStatusCode.BadRequest,
                code: Errors.InvalidSignature().code
              }
            ]
          });
          expect(response.status).toEqual(HttpStatusCode.BadRequest);
          done();
        });
    });

    it.skip("returns user data with a token", async done => {
      await db("users").insert(USR_CHARLIE_KNEX);

      const response = await client
        .post("/session-requests", POST_SESSION_CHARLIE, {
          headers: POST_SESSION_CHARLIE_SIGNATURE_HEADER
        })
        .catch(error => {
          console.error(error.message, error.response.data);
          throw error;
        });

      const data = response.data.data;

      expect(data.attributes.email).toEqual(USR_ALICE.email);
      expect(data.attributes.ethAddress).toEqual(USR_ALICE.ethAddress);
      expect(data.attributes.multisigAddress).toBeDefined();
      expect(data.attributes.nodeAddress).toEqual(USR_ALICE.nodeAddress);
      expect(data.attributes.username).toEqual(USR_ALICE.username);
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
      await db("users").insert(USR_BOB_KNEX);

      const response = await client
        .get("/users", {
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
            attributes: {
              email: "bob@wonderland.com",
              ethAddress: "0x0f693CC956DF59deC24BB1C605ac94CadCe6014d",
              multisigAddress: "0xc5F6047a22A5582f62dBcD278f1A2275ab39001A",
              nodeAddress: "0x0f693CC956DF59deC24BB1C605ac94CadCe6014d",
              username: "bob_account1"
            },
            relationships: {},
            id: "e5a48217-5d83-4fdd-bf1d-b9e35934f0f2",
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
      await db("users").insert(USR_BOB_KNEX);

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
      await db("users").insert([USR_BOB_KNEX, USR_ALICE_KNEX]);

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

      expect(data.type).toEqual("matchmakingRequest");
      expect(data.id).toBeDefined();
      expect(data.attributes).toEqual({
        intermediary: getNodeAddress(),
        username: USR_ALICE.username,
        ethAddress: USR_ALICE.ethAddress,
        nodeAddress: USR_ALICE.nodeAddress
      });

      expect(response.status).toEqual(HttpStatusCode.Created);
      done();
    });

    it("returns one of three possible users as a match", async done => {
      // Mock an extra user into the DB first.
      await db("users").insert([USR_BOB_KNEX, USR_CHARLIE_KNEX]);

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

      if (username === USR_CHARLIE.username) {
        expect(ethAddress).toEqual(USR_CHARLIE.ethAddress);
      } else if (username === USR_ALICE.username) {
        expect(ethAddress).toEqual(USR_ALICE.ethAddress);
      } else {
        fail("It should have matched either Alice or Charlie");
      }

      expect(response.status).toEqual(HttpStatusCode.Created);

      done();
    });
  });
});
