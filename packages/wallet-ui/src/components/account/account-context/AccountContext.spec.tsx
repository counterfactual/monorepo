import React from "react";
import Enzyme, { mount } from "enzyme";
import Adapter from "enzyme-adapter-react-16";
import { MemoryRouter as Router } from "react-router-dom";
import { createMemoryHistory } from "history";

import { AccountContext, AccountContextProps } from "./AccountContext";

import mock from "./AccountContext.mock.json";
import { FormButton } from "../../form";
import { formatEther } from "ethers/utils";

Enzyme.configure({ adapter: new Adapter() });

function setup(scenario: keyof typeof mock.scenarios) {
  const history = createMemoryHistory();
  const props: AccountContextProps = {
    ...mock.scenarios[scenario].props,
    history,
    location: history.location
  };

  const component = mount(
    <Router>
      <AccountContext {...props} />
    </Router>
  );

  return { props, component };
}

describe("<AccountContext />", () => {
  describe("Unauthenticated", () => {
    let component: Enzyme.ReactWrapper;

    beforeEach(() => {
      component = setup("unauthenticated").component;
    });

    it("should render an account context container", () => {
      expect(component.find(".account-context").exists()).toBe(true);
    });

    it("should render a button container", () => {
      expect(component.find(".btn-container").exists()).toBe(true);
    });

    it("should render a Login button", () => {
      const button = component.find(".btn-container [data-js='btn-login']");

      expect(button.type()).toBe(FormButton);
      expect(button.find(".icon").exists()).toBe(true);
      expect(button.find(".icon").prop("src")).toContain("login");
      expect(button.text()).toBe("Login");
    });

    it("should render a Register button", () => {
      const button = component.find(".btn-container [data-js='btn-register']");

      expect(button.type()).toBe(FormButton);
      expect(button.find(".icon").exists()).toBe(true);
      expect(button.find(".icon").prop("src")).toContain("register");
      expect(button.text()).toBe("Register");
    });

    it("should not render account information", () => {
      expect(component.find(".info-container").exists()).toBe(false);
    });
  });
  describe("Authenticated", () => {
    let component: Enzyme.ReactWrapper;
    let props: AccountContextProps;

    beforeEach(() => {
      const mock = setup("authenticated");
      component = mock.component;
      props = mock.props;
    });

    it("should render an account context container", () => {
      expect(component.find(".account-context").exists()).toBe(true);
    });

    it("should not render a button container", () => {
      expect(component.find(".btn-container").exists()).toBe(false);
    });

    it("should render a balance information container", () => {
      expect(component.find("[data-js='info-balance']").exists()).toBe(true);
    });

    it("should render an user information container", () => {
      expect(component.find("[data-js='info-user']").exists()).toBe(true);
    });

    describe("Balance information", () => {
      let balanceWrapper: Enzyme.ReactWrapper;

      beforeEach(() => {
        balanceWrapper = component.find("[data-js='info-balance']");
      });

      it("should show the current balance", () => {
        expect(balanceWrapper.find(".info-header").text()).toBe("Balance");
        expect(balanceWrapper.find(".info-content").text()).toBe(
          `${formatEther(props.counterfactualBalance)} ETH`
        );
      });

      it("should render an icon for the container", () => {
        const icon = balanceWrapper.find(".info-img");
        expect(icon.exists()).toBe(true);
        expect(icon.prop("src")).toContain("crypto");
      });
    });

    describe("User information", () => {
      let userWrapper: Enzyme.ReactWrapper;

      beforeEach(() => {
        userWrapper = component.find("[data-js='info-user']");
      });

      it("should show the current username", () => {
        expect(userWrapper.find(".info-header").text()).toBe("Account");
        expect(userWrapper.find(".info-content").text()).toBe(
          props.userState.user.username
        );
      });

      it("should render an icon for the container", () => {
        const icon = userWrapper.find(".info-img");
        expect(icon.exists()).toBe(true);
        expect(icon.prop("src")).toContain("account");
      });
    });
  });
});