import { Node } from "@counterfactual/types";

import { PostgresServiceFactory } from "../src";

describe("Postgres store service implementation behavior adheres to interface", () => {
  let postgresService: Node.IStoreService;

  beforeAll(async () => {
    const postgresServiceFactory = new PostgresServiceFactory({
      type: "postgres",
      username: process.env.POSTGRES_USER!,
      database: process.env.POSTGRES_DATABASE!,
      host: process.env.POSTGRES_HOST!,
      password: process.env.POSTGRES_PASSWORD!,
      port: Number(process.env.POSTGRES_PORT!),
      synchronize: true
    });

    await postgresServiceFactory.connectDb();
    postgresService = postgresServiceFactory.createStoreService(
      process.env.POSTGRES_STORE_KEY!
    );
  });

  afterAll(async () => {
    if (postgresService.reset !== undefined) {
      await postgresService.reset();
    } else {
      throw new Error(
        "Test suite must define reset() method on a StoreService"
      );
    }
  });

  it("can save and load basic records", async done => {
    expect(await postgresService.get("A")).toBeUndefined();

    const key = "A";
    const value = 1;

    await postgresService.set([
      {
        key,
        value
      }
    ]);

    expect(await postgresService.get(key)).toEqual(value);

    done();
  });
});
