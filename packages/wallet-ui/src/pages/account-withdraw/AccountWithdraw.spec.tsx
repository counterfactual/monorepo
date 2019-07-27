import Enzyme, { mount } from "enzyme";
import Adapter from "enzyme-adapter-react-16";
import { createMemoryHistory, History } from "history";
import React from "react";
import { connect, Provider } from "react-redux";
import { MemoryRouter as Router, RouteComponentProps } from "react-router-dom";
import { Action } from "redux";
import { ThunkDispatch } from "redux-thunk";
import Web3ProviderMock from "../../store/test-utils/web3provider.mock";
import {
  ActionType,
  ApplicationState,
  Deposit,
  ErrorData
} from "../../store/types";
import { withdraw } from "../../store/wallet/wallet.mock";
import { RoutePath } from "../../types";
import { testSelector } from "../../utils/testSelector";
import store from "./../../store/store";
import {
  AccountWithdraw as Component,
  AccountWithdrawProps
} from "./AccountWithdraw";
import mock from "./AccountWithdraw.context.json";

Enzyme.configure({ adapter: new Adapter() });

function setup() {
  const history = createMemoryHistory();
  const props: RouteComponentProps & { error: ErrorData } = {
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

  const AccountWithdraw = connect(
    (state: ApplicationState) => ({
      user: state.UserState.user,
      walletState: state.WalletState
    }),
    (dispatch: ThunkDispatch<ApplicationState, null, Action<ActionType>>) => ({
      withdraw: (
        data: Deposit,
        provider: Web3ProviderMock,
        history?: History
      ) => dispatch(withdraw(data, provider, history))
    })
  )(Component);

  const component = mount(
    <Provider store={store}>
      <Router initialEntries={["/"]}>
        <AccountWithdraw {...props} />
      </Router>
    </Provider>
  );
  return { props, component, node: AccountWithdraw };
}

describe("<AccountWithdraw />", () => {
  let instance: Enzyme.CommonWrapper<AccountWithdrawProps, {}, React.Component>;
  let component: Enzyme.ReactWrapper;
  let props: RouteComponentProps;

  beforeEach(() => {
    const mock = setup();
    component = mock.component;
    instance = mock.component.find(Component);
    props = mock.props;
  });

  it("should render a Proceed button or Withdraw", () => {
    const CTA = component.find(testSelector("deposit-button"));
    expect(CTA.exists()).toBe(true);
    expect(["Proceed", "Withdraw"]).toContain(CTA.text());
  });

  it("should render the form input fields", () => {
    expect(component.find(testSelector("amount-input")).exists()).toBe(true);
  });

  it("should redirect to /channels after clicking the button", () => {
    component.find(testSelector("amount-input")).simulate("change", {
      target: { value: "0.01", validity: { valid: true } }
    });
    component.find(testSelector("deposit-button")).simulate("click");
    expect(props.history.location.pathname).toBe(RoutePath.Channels);
  });
});
