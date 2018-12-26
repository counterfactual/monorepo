import axios from "axios";
import { Server } from "http";

import { app as api } from "../src/api";

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
  it("exposes /api/hello", async () => {
    const response = await client.get("/hello", {
      params: {
        name: "Alice"
      }
    });
    expect(response.data.hello).toEqual("Alice");
  });
  afterEach(() => {
    server.close();
  });
});
