import Enzyme from "enzyme";
import Adapter from "enzyme-adapter-react-16";
import React from "react";
import {
  WidgetErrorMessage,
  WidgetErrorMessageProps
} from "./WidgetErrorMessage";

Enzyme.configure({ adapter: new Adapter() });

describe("<WidgetErrorMessage />", () => {
  let node: Enzyme.ShallowWrapper;

  const props = {
    error: { primary: "primary_string", secondary: "secondary_string" }
  } as WidgetErrorMessageProps;

  beforeEach(() => {
    node = Enzyme.shallow(<WidgetErrorMessage {...props} />);
  });

  it("shows the primary and secondary error strings", () => {
    expect(node.find("WidgetTooltip").prop("message")).toBe(
      props.error.secondary
    );
    expect(node.find(".widget-error-message").text()).toBe(props.error.primary);
  });
});
