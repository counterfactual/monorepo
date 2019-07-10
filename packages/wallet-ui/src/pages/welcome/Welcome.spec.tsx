import Enzyme, { mount } from "enzyme";
import Adapter from "enzyme-adapter-react-16";
import { createMemoryHistory } from "history";
import React from "react";
import { MemoryRouter as Router, RouteComponentProps } from "react-router-dom";
import { RoutePath } from "../../types";
import Welcome from "./Welcome";

Enzyme.configure({ adapter: new Adapter() });

function setup() {
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
    <Router initialEntries={["/"]}>
      <Welcome {...props} />
    </Router>
  );

  return { props, component };
}

describe("<Welcome />", () => {
  let component: Enzyme.ReactWrapper;
  let props: RouteComponentProps;

  beforeEach(() => {
    const mock = setup();
    component = mock.component;
    props = mock.props;
  });

  it("should render a Setup button", () => {
    const button = component.find("button");
    expect(button.text()).toBe("Setup Counterfactual");
  });

  it("should re-route to Account Creation upon Setup Button click", () => {
    component.find("button").simulate("click");
    expect(props.history.location.pathname).toBe(RoutePath.SetupRegister);
  });
});
