import { HeaderAccount } from "./header-account";

describe("app", () => {
  it("builds", () => {
    expect(new HeaderAccount()).toBeTruthy();
  });

  it("authenticates automatically when using fakeConnect", () => {
    const component = new HeaderAccount();
    component.fakeConnect = true;
    component.login();
    expect(component.authenticated).toEqual(true);
  });
});
