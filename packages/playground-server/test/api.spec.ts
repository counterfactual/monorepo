import axios from "axios";
import { Server } from "http";

import mountApi from "../src/api";
import { ErrorCode } from "../src/types";

const api = mountApi();
let server: Server;

const client = axios.create({
  baseURL: "http://localhost:9001/api",
  headers: {
    "content-type": "application/json"
  }
});

describe("playground-server", () => {
  beforeEach(done => {
    server = api.listen(9001, done);
  });

  afterEach(done => {
    server.close(done);
  });

  describe("/api/create-account", () => {
    it("fails when username is not passed to the request", () => {
      client.post("/create-account").catch(({ response }) => {
        expect(response.status).toEqual(400);
        expect(response.data).toEqual({
          ok: false,
          error: {
            status: 400,
            errorCode: ErrorCode.UsernameRequired
          }
        });
      });
    });

    it("fails when email is not passed to the request", () => {
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
        });
    });

    it("fails when address is not passed to the request", async () => {
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
        });
    });

    it("fails when signature is not passed to the request", async () => {
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
        });
    });

    it("fails when an invalid signature is passed to the request", async () => {
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
        });
    });

    it("creates an account and returns 201 + the multisig address", async () => {
      const response = await client.post("/create-account", {
        username: "alice",
        email: "alice@wonder.land",
        address: "0x0f693cc956df59dec24bb1c605ac94cadce6014d",
        signature:
          "0xd089c5d7e71bb8a4ae0952fbbf6fdc0846f2e9593c04a76fef428d27e4ca9f8523b80bcc4a831d3c813e9051ff2c9c4ee75fdd4b0d419005523fb06b71c802751c"
      });
      expect(response.status).toEqual(201);
      expect(response.data.ok).toBe(true);
      expect(response.data.data.multisigAddress).toBeDefined();
    });
  });
});
