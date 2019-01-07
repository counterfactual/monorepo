import axios from "axios";
import { readFileSync } from "fs";
import { Server } from "http";
import { resolve } from "path";

import mountApi from "../src/api";
import { getDatabase } from "../src/db";
import { ErrorCode } from "../src/types";

const api = mountApi();
let server: Server;

const client = axios.create({
  baseURL: "http://localhost:9001/api",
  headers: {
    "content-type": "application/json"
  }
});

const db = getDatabase();

describe("playground-server", () => {
  beforeAll(async () => {
    await db("users").delete();
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

  describe("/api/create-account", () => {
    it("fails when username is not passed to the request", done => {
      client.post("/create-account").catch(({ response }) => {
        expect(response.status).toEqual(400);
        expect(response.data).toEqual({
          ok: false,
          error: {
            status: 400,
            errorCode: ErrorCode.UsernameRequired
          }
        });
        done();
      });
    });

    it("fails when email is not passed to the request", done => {
      client
        .post("/create-account", {
          username: "alice"
        })
        .catch(({ response }) => {
          expect(response.status).toEqual(400);
          expect(response.data).toEqual({
            ok: false,
            error: {
              status: 400,
              errorCode: ErrorCode.EmailRequired
            }
          });
          done();
        });
    });

    it("fails when address is not passed to the request", done => {
      client
        .post("/create-account", {
          username: "alice",
          email: "alice@wonder.land"
        })
        .catch(({ response }) => {
          expect(response.status).toEqual(400);
          expect(response.data).toEqual({
            ok: false,
            error: {
              status: 400,
              errorCode: ErrorCode.AddressRequired
            }
          });
          done();
        });
    });

    it("fails when signature is not passed to the request", done => {
      client
        .post("/create-account", {
          username: "alice",
          email: "alice@wonder.land",
          address: "0x0f693cc956df59dec24bb1c605ac94cadce6014d"
        })
        .catch(({ response }) => {
          expect(response.status).toEqual(400);
          expect(response.data).toEqual({
            ok: false,
            error: {
              status: 400,
              errorCode: ErrorCode.SignatureRequired
            }
          });
          done();
        });
    });

    it("fails when an invalid signature is passed to the request", done => {
      client
        .post("/create-account", {
          username: "alice",
          email: "alice@wonder.land",
          address: "0x0f693cc956df59dec24bb1c605ac94cadce6014d",
          signature:
            "0xc157208c17b60bf325500914d0b4ddf57ee4c9c2ff1509e318c3d138a4ccb08b3258f9ac4e72d824fef67a40c3959e2f6480cdf6fbbf2590ea4a8bb17e7d5c980d"
        })
        .catch(({ response }) => {
          expect(response.status).toEqual(403);
          expect(response.data).toEqual({
            ok: false,
            error: {
              status: 403,
              errorCode: ErrorCode.InvalidSignature
            }
          });
          done();
        });
    });

    it("creates an account for the first time and returns 201 + the multisig address", done => {
      client
        .post("/create-account", {
          username: "alice",
          email: "alice@wonder.land",
          address: "0x0f693cc956df59dec24bb1c605ac94cadce6014d",
          signature:
            "0xd089c5d7e71bb8a4ae0952fbbf6fdc0846f2e9593c04a76fef428d27e4ca9f8523b80bcc4a831d3c813e9051ff2c9c4ee75fdd4b0d419005523fb06b71c802751c"
        })
        .then(response => {
          expect(response.status).toEqual(201);
          expect(response.data.ok).toBe(true);
          expect(response.data.data.multisigAddress).toBeDefined();
          done();
        })
        .catch(({ response }) => {
          fail("It should return HTTP 201");
          done();
        });
    });

    it("creates an account for the second time with the same address and returns 400", done => {
      client
        .post("/create-account", {
          username: "alice",
          email: "alice@wonder.land",
          address: "0x0f693cc956df59dec24bb1c605ac94cadce6014d",
          signature:
            "0xd089c5d7e71bb8a4ae0952fbbf6fdc0846f2e9593c04a76fef428d27e4ca9f8523b80bcc4a831d3c813e9051ff2c9c4ee75fdd4b0d419005523fb06b71c802751c"
        })
        .catch(({ response }) => {
          expect(response.status).toEqual(400);
          expect(response.data).toEqual({
            ok: false,
            error: {
              status: 400,
              errorCode: ErrorCode.AddressAlreadyRegistered
            }
          });
          done();
        });
    });
  });

  describe("/api/apps", () => {
    it("gets a list of apps", done => {
      client.get("/apps").then(response => {
        expect(response.status).toEqual(200);
        expect(response.data).toEqual({
          ok: true,
          data: JSON.parse(
            readFileSync(resolve(__dirname, "../registry.json")).toString()
          )
        });
        done();
      });
    });
  });
});
