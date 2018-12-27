import axios from "axios";
import { Server } from "http";
import jwt from "jsonwebtoken";

import { app as api } from "../src/api";
import { FirebaseConfigurationResponse, TokenResponse } from "../src/types";

let server: Server;
const client = axios.create({
  baseURL: "http://localhost:9001/api",
  headers: {
    "content-type": "application/json"
  }
});

describe("playground-server", () => {
  beforeEach(async () => {
    server = await api.listen(9001);
  });
  describe("Public API", () => {
    it("exposes /token", async done => {
      const response = await client.get<TokenResponse>("/token", {
        params: {
          name: "Alice"
        }
      });
      jwt.verify(response.data.token, "foo", (err, token) => {
        if (!err) {
          done();
        }
      });
    });
  });
  describe("Private API", () => {
    let token;
    beforeEach(async () => {
      token = (await client.get<TokenResponse>("/token", {
        params: {
          name: "Alice"
        }
      })).data.token;
    });
    it("returns 205 when requesting without a token", async () => {
      const response = await client.get<FirebaseConfigurationResponse>(
        "/firebase"
      );
      expect(response.status).toEqual(205);
    });
    it("exposes /firebase", async () => {
      const response = await client.get<FirebaseConfigurationResponse>(
        "/firebase",
        {
          headers: {
            authorization: `Bearer ${token}`
          }
        }
      );
      expect(response.data.apiKey).toEqual("a");
      expect(response.data.authDomain).toEqual("b");
      expect(response.data.databaseURL).toEqual("c");
      expect(response.data.projectId).toEqual("d");
      expect(response.data.storageBucket).toEqual("e");
      expect(response.data.messagingSenderId).toEqual("f");
    });
  });
  afterEach(() => {
    server.close();
  });
});
