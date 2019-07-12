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
import { addUser } from "../../store/user.mock";
import store from "./../../store/store";
import { AccountRegistration as Component } from "./AccountRegistration";
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
      path: "/",
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
        dispatch(addUser(data, signer, props.history))
    })
  )(Component);

  const component = mount(
    <Provider store={store}>
      <Router initialEntries={["/"]}>
        <AccountRegistration {...props} />
      </Router>
    </Provider>
  );
  return { props, component };
}

describe("<AccountRegistration />", () => {
  let component: Enzyme.ReactWrapper;
  let props: RouteComponentProps;

  beforeEach(() => {
    const mock = setup();
    component = mock.component;
    props = mock.props;
  });

  it("should render a Create Account button", () => {
    expect(component.find("button").exists()).toBe(true);
    expect(component.find("button").text()).toBe("Create account");
  });

  it("should render the form input fields", () => {
    expect(component.find("[name='email']").exists()).toBe(true);
    expect(component.find("[name='username']").exists()).toBe(true);
  });
});
