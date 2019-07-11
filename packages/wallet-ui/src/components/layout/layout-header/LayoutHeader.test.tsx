import Enzyme, { mount } from "enzyme";
import Adapter from "enzyme-adapter-react-16";
import { createMemoryHistory } from "history";
import React from "react";
import { Provider } from "react-redux";
import { MemoryRouter as Router, RouteComponentProps } from "react-router-dom";
import store from "./../../../store/store";
import { LayoutHeader } from "./LayoutHeader";

function setup() {
  Enzyme.configure({ adapter: new Adapter() });
  const history = createMemoryHistory();
  const props: RouteComponentProps = {
    history,
    location: history.location,
    match: {
      isExact: true,
      params: {},
      path: "/",
      url: "http://localhost/"
    }
  };
  const component = mount(
    <Provider store={store}>
      <Router>
        <LayoutHeader {...props} />
      </Router>
    </Provider>
  );

  return { props, component };
}

describe("<LayoutHeader />", () => {
  let component: Enzyme.ReactWrapper;

  beforeEach(() => {
    const mock = setup();
    component = mock.component;
  });

  it("renders without crashing", () => {});

  it("renders the header with the logo and the account context", () => {
    expect(component.find(".logo-container > .logo")).not.toBeNull();
    expect(
      component.find(".context-container > .account-context")
    ).not.toBeNull();
  });
});
