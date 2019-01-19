import {
  HttpStatusCode,
  JsonApiDocument,
  JsonApiErrorDocument,
  ResourceRelationship,
  ResourceTypeRelationships
} from "@ebryn/jsonapi-ts";
import axios from "axios";
import { readFileSync } from "fs";
import { Server } from "http";
import { Log, LogLevel } from "logepi";
import { resolve } from "path";

import mountApi from "../src/api";
import { getDatabase } from "../src/db";
import { createNodeSingleton, getNodeAddress } from "../src/node";
import { MatchedUser, MatchmakingRequest, User } from "../src/resources";
import { ErrorCode } from "../src/types";

import {
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

  describe("/api/apps", () => {
    it("gets a list of apps", done => {
      client.get("/apps").then(response => {
        const registry = JSON.parse(
          readFileSync(resolve(__dirname, "../registry.json")).toString()
        );
        expect(response.status).toEqual(HttpStatusCode.OK);
        expect(response.data).toEqual(registry);
        done();
      });
    });
  });

  describe("/api/users", () => {
    it("fails when signature is not passed to the request", done => {
      client
        .post("/users", POST_USERS_ALICE_NO_SIGNATURE)
        .catch(({ response }) => {
          expect(response.data).toEqual({
            errors: [
              {
                status: HttpStatusCode.BadRequest,
                code: ErrorCode.SignatureRequired
              }
            ]
          } as JsonApiErrorDocument<ErrorCode>);
          expect(response.status).toEqual(HttpStatusCode.BadRequest);
          done();
        });
    });

    it("fails when an invalid signature is passed to the request", done => {
      client
        .post("/users", POST_USERS_ALICE_INVALID_SIGNATURE, {
          headers: POST_USERS_ALICE_INVALID_SIGNATURE_HEADER
        })
        .catch(({ response }) => {
          expect(response.data).toEqual({
            errors: [
              {
                status: HttpStatusCode.BadRequest,
                code: ErrorCode.InvalidSignature
              }
            ]
          } as JsonApiErrorDocument<ErrorCode>);
          expect(response.status).toEqual(HttpStatusCode.BadRequest);
          done();
        });
    });

    it("creates an account for the first time and returns 201 + the multisig address", done => {
      client
        .post("/users", POST_USERS_ALICE, {
          headers: POST_USERS_ALICE_SIGNATURE_HEADER
        })
        .then(response => {
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
    });

    it("creates an account for the second time with the same address and returns HttpStatusCode.BadRequest", done => {
      client
        .post("/users", POST_USERS_ALICE, {
          headers: POST_USERS_ALICE_SIGNATURE_HEADER
        })
        .catch(({ response }) => {
          expect(response.data).toEqual({
            errors: [
              {
                status: HttpStatusCode.BadRequest,
                code: ErrorCode.AddressAlreadyRegistered
              }
            ]
          } as JsonApiErrorDocument<ErrorCode>);
          expect(response.status).toEqual(HttpStatusCode.BadRequest);
          done();
        });
    });

    it("creates an account for the second time with the same username and returns HttpStatusCode.BadRequest", done => {
      client
        .post("/users", POST_USERS_ALICE_DUPLICATE_USERNAME, {
          headers: POST_USERS_ALICE_DUPLICATE_USERNAME_SIGNATURE_HEADER
        })
        .catch(({ response }) => {
          expect(response.data).toEqual({
            errors: [
              {
                status: HttpStatusCode.BadRequest,
                code: ErrorCode.UsernameAlreadyExists
              }
            ]
          } as JsonApiErrorDocument<ErrorCode>);
          expect(response.status).toEqual(HttpStatusCode.BadRequest);
          done();
        });
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
                code: ErrorCode.SignatureRequired
              }
            ]
          } as JsonApiErrorDocument<ErrorCode>);
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
                code: ErrorCode.UserNotFound
              }
            ]
          });
          expect(response.status).toEqual(HttpStatusCode.BadRequest);
          done();
        });
    });

    it("returns user data with a token", async done => {
      client
        .post("/session-requests", POST_SESSION_ALICE, {
          headers: POST_SESSION_ALICE_SIGNATURE_HEADER
        })
        .then(response => {
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
  });

  describe("/api/users", () => {
    it("fails if no token is provided", done => {
      client.get("/users").catch(({ response }) => {
        expect(response.data).toEqual({
          errors: [
            {
              status: HttpStatusCode.Unauthorized,
              code: "access_denied"
            }
          ]
        });
        expect(response.status).toEqual(HttpStatusCode.Unauthorized);
        done();
      });
    });

    it("returns user data from a token", done => {
      client
        .get("/users", {
          headers: {
            Authorization: `Bearer ${TOKEN_BOB}`
          }
        })
        .then(response => {
          expect(response.status).toEqual(HttpStatusCode.OK);
          expect(response.data).toEqual({
            data: [
              {
                attributes: {
                  email: "bob@wonderland.com",
                  ethAddress: "0x0f693cc956df59dec24bb1c605ac94cadce6014d",
                  multisigAddress: "0xc5F6047a22A5582f62dBcD278f1A2275ab39001A",
                  nodeAddress: "0xFE0460D00c589F55Fa60be61050419B008d56e15",
                  username: "bob_account1"
                },
                id: "e5a48217-5d83-4fdd-bf1d-b9e35934f0f2",
                type: "users"
              }
            ]
          });
          done();
        });
    });
  });

  describe("/api/matchmaking-requests", () => {
    it("fails if no token is provided", done => {
      client
        .post("/matchmaking-requests", {
          data: {
            type: "matchmakingRequest"
          }
        })
        .catch(({ response }) => {
          expect(response.data).toEqual({
            errors: [
              {
                status: HttpStatusCode.BadRequest,
                code: ErrorCode.UserAddressRequired
              }
            ]
          });
          expect(response.status).toEqual(HttpStatusCode.BadRequest);
          done();
        });
    });

    it("fails when there are no users to match with", async done => {
      await db("users")
        .delete()
        .where({ username: USR_ALICE.username });

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
                code: ErrorCode.NoUsersAvailable
              }
            ]
          });
          expect(response.status).toEqual(HttpStatusCode.BadRequest);
          done();
        });
    });

    it("returns the only possible user as a match", async done => {
      await db("users").insert({
        username: USR_ALICE.username,
        email: USR_ALICE.email,
        eth_address: USR_ALICE.ethAddress,
        node_address: USR_ALICE.nodeAddress
      });

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
        .then(response => {
          const json = response.data as JsonApiDocument<MatchmakingRequest>;
          const data = json.data as MatchmakingRequest;
          const rels = data.relationships as ResourceTypeRelationships;
          const included = json.included as MatchedUser[];

          expect(data.type).toEqual("matchmakingRequest");
          expect(data.id).toBeDefined();
          expect(data.attributes).toEqual({
            intermediary: getNodeAddress()
          });
          expect((rels.user.data as ResourceRelationship).type).toEqual("user");
          expect((rels.matchedUser.data as ResourceRelationship).type).toEqual(
            "matchedUser"
          );
          expect(rels).toBeDefined();
          expect((rels.user.data as ResourceRelationship).id).toBeDefined();
          expect(
            (rels.matchedUser.data as ResourceRelationship).id
          ).toBeDefined();
          expect(included).toBeDefined();
          expect(included[0].type).toEqual("user");
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

    it("returns one of three possible users as a match", async done => {
      // Mock an extra user into the DB first.
      await db("users").insert({
        username: USR_CHARLIE.username,
        email: USR_CHARLIE.email,
        eth_address: USR_CHARLIE.ethAddress
      });

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
        .then(response => {
          const { username, ethAddress } = response.data.included[1].attributes;

          if (username === USR_CHARLIE.username) {
            expect(ethAddress).toEqual(USR_CHARLIE.ethAddress);
          } else if (username === USR_ALICE.username) {
            expect(ethAddress).toEqual(USR_ALICE.ethAddress);
          } else {
            fail("It should have matched either Alice or Charlie");
          }

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
