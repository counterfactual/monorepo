import axios from "axios";
import { Server } from "http";

import mountApi from "../src/api";
import node from "../src/node";
import { ErrorCode } from "../src/types";

const api = mountApi(node);
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
    it("creates an account and returns 201 + the multisig address", async () => {
      const response = await client.post("/create-account", {
        username: "alice",
        email: "alice@wonder.land",
        address: "0xC257274276a4E539741Ca11b590B9447B26A8051"
      });
      expect(response.status).toEqual(201);
      expect(response.data.ok).toBe(true);
      expect(response.data.data.multisigAddress).toBeDefined();
    });
  });
});
