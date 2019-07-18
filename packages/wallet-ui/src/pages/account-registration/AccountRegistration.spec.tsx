import Enzyme, { mount } from "enzyme";
import Adapter from "enzyme-adapter-react-16";
import { JsonRpcSigner } from "ethers/providers";
import { createMemoryHistory, History } from "history";
import React from "react";
import { connect, Provider } from "react-redux";
import { MemoryRouter as Router, RouteComponentProps } from "react-router-dom";
import { Action } from "redux";
import { ThunkDispatch } from "redux-thunk";
import { ActionType, ApplicationState, User } from "../../store/types";
import { addUser } from "../../store/user/user.mock";
import { RoutePath } from "../../types";
import { testSelector } from "../../utils/testSelector";
import store from "./../../store/store";
import {
  AccountRegistration as Component,
  AccountRegistrationProps
} from "./AccountRegistration";
import mock from "./AccountRegistration.context.json";

Enzyme.configure({ adapter: new Adapter() });

function setup() {
  const history = createMemoryHistory();
  const props: RouteComponentProps = {
    ...mock.props,
    history,
    location: history.location,
    match: {
      isExact: true,
      params: {},
      path: RoutePath.Root,
      url: "http://localhost/"
    }
  };

  const AccountRegistration = connect(
    (state: ApplicationState) => ({
      wallet: state.WalletState,
      error: state.UserState.error,
      registrationStatus: state.UserState.status
    }),
    (dispatch: ThunkDispatch<ApplicationState, null, Action<ActionType>>) => ({
      addUser: (data: User, signer: JsonRpcSigner, history: History) =>
        dispatch(addUser(data, signer, history))
    })
  )(Component);

  const component = mount(
    <Provider store={store}>
      <Router initialEntries={["/"]}>
        <AccountRegistration {...props} />
      </Router>
    </Provider>
  );
  return { props, component, node: AccountRegistration };
}

describe("<AccountRegistration />", () => {
  let instance: Enzyme.CommonWrapper<
    AccountRegistrationProps,
    {},
    React.Component
  >;
  let component: Enzyme.ReactWrapper;
  let props: RouteComponentProps;

  beforeEach(() => {
    const mock = setup();
    component = mock.component;
    instance = mock.component.find(Component);
    props = mock.props;
  });

  it("should render a disabled Create Account button", () => {
    const createAccountButton = component.find(testSelector("button"));
    expect(createAccountButton.exists()).toBe(true);
    expect(createAccountButton.text()).toBe("Create account");
    expect(createAccountButton.prop("disabled")).toBe(true);
  });

  it("should render the form input fields", () => {
    expect(component.find(testSelector("email")).exists()).toBe(true);
    expect(component.find(testSelector("username")).exists()).toBe(true);
  });

  it("should enable button upon username input", () => {
    component.find(testSelector("username")).simulate("change", {
      target: { value: "TEST", validity: { valid: true } }
    });
    expect(component.find(testSelector("button")).prop("disabled")).toBe(false);
  });

  it("should trigger User Creation upon click", () => {
    component.find(testSelector("username")).simulate("change", {
      target: { value: "TEST", validity: { valid: true } }
    });
    component.find(testSelector("email")).simulate("change", {
      target: { value: "TEST@gmail.com", validity: { valid: true } }
    });
    component.find(testSelector("button")).simulate("click");
    expect(props.history.location.pathname).toBe(RoutePath.SetupDeposit);
  });
});
