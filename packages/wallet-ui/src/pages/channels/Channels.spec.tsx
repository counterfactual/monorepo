import Enzyme, { mount } from "enzyme";
import Adapter from "enzyme-adapter-react-16";
import { createMemoryHistory } from "history";
import React from "react";
import { connect, Provider } from "react-redux";
import { MemoryRouter as Router, RouteComponentProps } from "react-router-dom";
import { Action } from "redux";
import { ThunkDispatch } from "redux-thunk";
import { getAllChannels } from "../../store/channels/channels.mock";
import { ActionType, ApplicationState } from "../../store/types";
import { RoutePath } from "../../types";
import store from "./../../store/store";
import { Channels as Component } from "./Channels";
import mock from "./Channels.context.json";

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

  const Channels = connect(
    (state: ApplicationState) => ({
      channelsState: state.ChannelsState
    }),
    (dispatch: ThunkDispatch<ApplicationState, null, Action<ActionType>>) => ({
      getAllChannels: () => dispatch(getAllChannels())
    })
  )(Component);

  const component = mount(
    <Provider store={store}>
      <Router initialEntries={["/"]}>
        <Channels {...props} />
      </Router>
    </Provider>
  );
  return { props, component, node: Channels };
}

describe("<AccountRegistration />", () => {
  let component: Enzyme.ReactWrapper;
  let props: RouteComponentProps;

  beforeEach(() => {
    const mock = setup();
    component = mock.component;
    props = mock.props;
  });

  it("should render a Discover Apps Button", () => {
    const CTA = component.find(".button-discover-apps");
    expect(CTA.exists()).toBe(true);
    expect(CTA.text()).toBe("Discover State Channel apps");
  });
});
