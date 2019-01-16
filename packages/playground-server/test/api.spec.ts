import axios from "axios";
import { readFileSync } from "fs";
import { Server } from "http";
import { Log, LogLevel } from "logepi";
import { resolve } from "path";

import mountApi from "../src/api";
import { getDatabase } from "../src/db";
import {
  APIRequest,
  APIResource,
  APIResponse,
  AppAttributes,
  ErrorCode,
  HttpStatusCode,
  UserAttributes
} from "../src/types";

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

    await db("users").insert({
      id: "2b83cb14-c7aa-4208-8da8-269aeb1a3f24",
      username: "joe",
      email: "joe@joe.com",
      eth_address: "0x0f693cc956df59dec24bb1c605ac94cadce6014d",
      multisig_address: "0x3b1c5dFE09187aC3F015139AD79ff7E9a77828Cf"
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
        expect(response.data).toEqual({
          data: registry.apps.map((app: AppAttributes & { id: string }) => ({
            type: "apps",
            id: app.id,
            attributes: {
              name: app.name,
              url: app.url,
              slug: app.slug,
              icon: app.icon
            }
          }))
        });
        done();
      });
    });
  });

  describe("/api/users", () => {
    it("fails when signature is not passed to the request", done => {
      client
        .post("/users", {
          data: {
            type: "users",
            attributes: {
              username: "alice",
              email: "alice@wonder.land",
              ethAddress: "0x0f693cc956df59dec24bb1c605ac94cadce6014d"
            }
          }
        } as APIRequest)
        .catch(({ response }) => {
          expect(response.data).toEqual({
            errors: [
              {
                status: HttpStatusCode.BadRequest,
                code: ErrorCode.SignatureRequired
              }
            ]
          } as APIResponse);
          expect(response.status).toEqual(HttpStatusCode.BadRequest);
          done();
        });
    });

    it("fails when an invalid signature is passed to the request", done => {
      client
        .post("/users", {
          data: {
            type: "users",
            attributes: {
              username: "alice",
              email: "alice@wonder.land",
              ethAddress: "0x0f693cc956df59dec24bb1c605ac94cadce6014d"
            }
          },
          meta: {
            signature: {
              signedMessage:
                "0xc157208c17b60bf325500914d0b4ddf57ee4c9c2ff1509e318c3d138a4ccb08b3258f9ac4e72d824fef67a40c3959e2f6480cdf6fbbf2590ea4a8bb17e7d5c980d"
            }
          }
        } as APIRequest)
        .catch(({ response }) => {
          expect(response.data).toEqual({
            errors: [
              {
                status: HttpStatusCode.Forbidden,
                code: ErrorCode.InvalidSignature
              }
            ]
          } as APIResponse);
          expect(response.status).toEqual(HttpStatusCode.Forbidden);
          done();
        });
    });

    it("creates an account for the first time and returns 201 + the multisig address", done => {
      client
        .post("/users", {
          data: {
            type: "users",
            attributes: {
              username: "delilah",
              email: "delilah@wonder.land",
              ethAddress: "0xdab500c650725c2f1af0b09df327d2d3ef3cefca"
            }
          },
          meta: {
            signature: {
              signedMessage:
                "0x7e39d3d9a111c685fb8bc265ddc793c2a60070c84030bba63d53e206e9ac6de82b4511aa5ac907e97004342b4e803dc05db538aca89edfecad034a09a4cbf3251c"
            }
          }
        })
        .then(response => {
          const data = response.data.data as APIResource<UserAttributes>;

          expect(data.id).toBeDefined();
          expect(data.attributes.username).toEqual("delilah");
          expect(data.attributes.email).toEqual("delilah@wonder.land");
          expect(data.attributes.ethAddress).toEqual(
            "0xdab500c650725c2f1af0b09df327d2d3ef3cefca"
          );
          expect(data.attributes.multisigAddress).toBeDefined();
          expect(data.attributes.token).toBeDefined();
          expect(response.status).toEqual(HttpStatusCode.Created);
          done();
        });
    });

    it("creates an account for the second time with the same address and returns HttpStatusCode.BadRequest", done => {
      client
        .post("/users", {
          data: {
            type: "users",
            attributes: {
              username: "delilah",
              email: "delilah@wonder.land",
              ethAddress: "0xdab500c650725c2f1af0b09df327d2d3ef3cefca"
            }
          },
          meta: {
            signature: {
              signedMessage:
                "0x7e39d3d9a111c685fb8bc265ddc793c2a60070c84030bba63d53e206e9ac6de82b4511aa5ac907e97004342b4e803dc05db538aca89edfecad034a09a4cbf3251c"
            }
          }
        })
        .catch(({ response }) => {
          expect(response.data).toEqual({
            errors: [
              {
                status: HttpStatusCode.BadRequest,
                code: ErrorCode.AddressAlreadyRegistered
              }
            ]
          } as APIResponse);
          expect(response.status).toEqual(HttpStatusCode.BadRequest);
          done();
        });
    });

    it("creates an account for the second time with the same username and returns HttpStatusCode.BadRequest", done => {
      client
        .post("/users", {
          data: {
            type: "users",
            attributes: {
              username: "joe",
              email: "joe@joe.com",
              ethAddress: "0x5faddca4889ddc5791cf65446371151f29653285"
            }
          },
          meta: {
            signature: {
              signedMessage:
                "0x586b68a3362c026cdf39c63569fffb8f9106e624ef316e0f0441ea4caef4b73b0d4626f717ec23166bf061ce6728d58bcba01cd63ef8014f696dffb07d0bd3871b"
            }
          }
        })
        .catch(({ response }) => {
          expect(response.data).toEqual({
            errors: [
              {
                status: HttpStatusCode.BadRequest,
                code: ErrorCode.UsernameAlreadyExists
              }
            ]
          } as APIResponse);
          expect(response.status).toEqual(HttpStatusCode.BadRequest);
          done();
        });
    });
  });

  describe("/api/session", () => {
    it("fails if no signature is provided", done => {
      client.post("/session").catch(({ response }) => {
        expect(response.status).toEqual(HttpStatusCode.BadRequest);
        expect(response.data).toEqual({
          errors: [
            {
              status: HttpStatusCode.BadRequest,
              code: ErrorCode.SignatureRequired
            }
          ]
        } as APIResponse);
        done();
      });
    });

    it("returns user data + session token", done => {
      client
        .post("/session", {
          data: {
            type: "session",
            attributes: {
              ethAddress: "0x0f693cc956df59dec24bb1c605ac94cadce6014d"
            }
          },
          meta: {
            signature: {
              signedMessage:
                "0x0d89ad46772a1ae1e3ae7202da31a32de00d8c8993fa448cc2e6265608c8bd1e493a75ab3e3bc67aa28cce29691a0b013c9c96c06fdf35834b82ad27e46e9d2b1c"
            }
          }
        })
        .then(response => {
          const data = response.data.data as APIResource<UserAttributes>;

          expect(data.id).toEqual("2b83cb14-c7aa-4208-8da8-269aeb1a3f24");
          expect(data.attributes.username).toEqual("joe");
          expect(data.attributes.email).toEqual("joe@joe.com");
          expect(data.attributes.ethAddress).toEqual(
            "0x0f693cc956df59dec24bb1c605ac94cadce6014d"
          );
          expect(data.attributes.multisigAddress).toEqual(
            "0x3b1c5dFE09187aC3F015139AD79ff7E9a77828Cf"
          );
          expect(data.attributes.token).toBeDefined();

          expect(response.status).toEqual(HttpStatusCode.Created);
          done();
        });
    });
  });

  describe.skip("/api/user", () => {
    const API_TOKEN =
      "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjJiODNjYjE0LWM3YWEtNDIwOC04ZGE4LTI2OWFlYjFhM2YyNCIsInVzZXJuYW1lIjoiam9lIiwiZW1haWwiOiJqb2VAam9lLmNvbSIsImFkZHJlc3MiOiIweDBmNjkzY2M5NTZkZjU5ZGVjMjRiYjFjNjA1YWM5NGNhZGNlNjAxNGQiLCJtdWx0aXNpZ0FkZHJlc3MiOiIweDNiMWM1ZEZFMDkxODdhQzNGMDE1MTM5QUQ3OWZmN0U5YTc3ODI4Q2YiLCJpYXQiOjE1NDcwNzE0OTcsImV4cCI6MTU3ODYyOTA5N30.NfNBCMVxliiaVyXixM7vNpCdn7xHd34ZCA3NL-LZEW0";

    it("fails if no token is provided", done => {
      client.get("/matchmake").catch(({ response }) => {
        expect(response.status).toEqual(HttpStatusCode.Unauthorized);
        expect(response.data).toEqual({
          ok: false,
          error: {
            status: HttpStatusCode.Unauthorized,
            errorCode: ErrorCode.TokenRequired
          }
        });
        done();
      });
    });
    it("returns user data from a token", done => {
      client
        .get("/user", {
          headers: {
            Authorization: `Bearer ${API_TOKEN}`
          }
        })
        .then(response => {
          expect(response.status).toEqual(HttpStatusCode.OK);
          expect(response.data.data.user).toEqual({
            id: "2b83cb14-c7aa-4208-8da8-269aeb1a3f24",
            username: "joe",
            email: "joe@joe.com",
            address: "0x0f693cc956df59dec24bb1c605ac94cadce6014d",
            multisigAddress: "0x3b1c5dFE09187aC3F015139AD79ff7E9a77828Cf"
          });
          done();
        });
    });
  });

  describe.skip("/api/matchmake", () => {
    const API_TOKEN =
      "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjJiODNjYjE0LWM3YWEtNDIwOC04ZGE4LTI2OWFlYjFhM2YyNCIsInVzZXJuYW1lIjoiam9lIiwiZW1haWwiOiJqb2VAam9lLmNvbSIsImFkZHJlc3MiOiIweDBmNjkzY2M5NTZkZjU5ZGVjMjRiYjFjNjA1YWM5NGNhZGNlNjAxNGQiLCJtdWx0aXNpZ0FkZHJlc3MiOiIweDNiMWM1ZEZFMDkxODdhQzNGMDE1MTM5QUQ3OWZmN0U5YTc3ODI4Q2YiLCJpYXQiOjE1NDcwNjk5NDQsImV4cCI6MTU3ODYyNzU0NH0.4mGpRY_96-11l8ydUqkOl6hyb9_MtBzdScwp8riTwe4";

    it("fails if no token is provided", done => {
      client.post("/matchmake").catch(({ response }) => {
        expect(response.status).toEqual(HttpStatusCode.Unauthorized);
        expect(response.data).toEqual({
          ok: false,
          error: {
            status: HttpStatusCode.Unauthorized,
            errorCode: ErrorCode.TokenRequired
          }
        });
        done();
      });
    });

    it("fails when there are no users to match with", async done => {
      // Remove Delilah.
      await db("users")
        .delete()
        .where({ username: "delilah" });

      client
        .post(
          "/matchmake",
          {},
          {
            headers: {
              Authorization: `Bearer ${API_TOKEN}`
            }
          }
        )
        .catch(({ response }) => {
          expect(response.status).toEqual(HttpStatusCode.BadRequest);
          expect(response.data).toEqual({
            ok: false,
            error: {
              status: HttpStatusCode.BadRequest,
              errorCode: ErrorCode.NoUsersAvailable
            }
          });
          done();
        });
    });

    it("returns the only possible user as a match", async done => {
      // Bring Delilah back!
      await db("users").insert({
        username: "delilah",
        email: "delilah@wonder.land",
        eth_address: "0xdab500c650725c2f1af0b09df327d2d3ef3cefca"
      });

      client
        .post(
          "/matchmake",
          {},
          {
            headers: {
              Authorization: `Bearer ${API_TOKEN}`
            }
          }
        )
        .then(response => {
          expect(response.status).toEqual(HttpStatusCode.OK);
          expect(response.data.ok).toBe(true);
          expect(response.data.data).toEqual({
            user: {
              username: "joe",
              address: "0x0f693cc956df59dec24bb1c605ac94cadce6014d"
            },
            opponent: {
              username: "delilah",
              address: "0xdab500c650725c2f1af0b09df327d2d3ef3cefca"
            },
            intermediary: "0x3b1c5dFE09187aC3F015139AD79ff7E9a77828Cf"
          });
          done();
        });
    });

    it("returns one of three possible users as a match", async done => {
      // Mock an extra user into the DB first.
      await db("users").insert({
        username: "charlie",
        email: "charlie@wonder.land",
        eth_address: "0x5faddca4889ddc5791cf65446371151f29653285"
      });

      client
        .post(
          "/matchmake",
          {},
          {
            headers: {
              Authorization: `Bearer ${API_TOKEN}`
            }
          }
        )
        .then(response => {
          expect(response.status).toEqual(HttpStatusCode.OK);
          expect(response.data.ok).toBe(true);

          const { username, address } = response.data.data.opponent;
          const charlieAddress = "0x5faddca4889ddc5791cf65446371151f29653285";
          const delilahAddress = "0xdab500c650725c2f1af0b09df327d2d3ef3cefca";

          if (username === "charlie") {
            expect(address).toEqual(charlieAddress);
          } else if (username === "delilah") {
            expect(address).toEqual(delilahAddress);
          } else {
            fail("It should have matched either Charlie or Delilah");
          }

          done();
        });
    });
  });
});
