import React from "react";
import ReactDOM from "react-dom";

import { WidgetLogo } from "./WidgetLogo";
import { MemoryRouter as Router } from "react-router-dom";

describe("<WidgetLogo />", () => {
  let container: HTMLDivElement;

  beforeEach(() => {
    container = document.createElement("div");
  });

  it("renders without crashing", () => {
    ReactDOM.render(
      <Router>
        <WidgetLogo />
      </Router>,
      container
    );
  });

  it("renders with a default text 'Wallet'", () => {
    ReactDOM.render(
      <Router>
        <WidgetLogo />
      </Router>,
      container
    );

    expect(container.querySelector("span")!.innerHTML).toBe("Wallet");
  });

  it("renders with a custom text using the 'caption' property", () => {
    const caption = "Playground";

    ReactDOM.render(
      <Router>
        <WidgetLogo caption={caption} />
      </Router>,
      container
    );

    expect(container.querySelector("span")!.innerHTML).toBe(caption);
  });

  it("renders with empty text", () => {
    const caption = "";

    ReactDOM.render(
      <Router>
        <WidgetLogo caption={caption} />
      </Router>,
      container
    );

    expect(container.querySelector("span")!.innerHTML).toBe(caption);
  });
  afterEach(() => {
    ReactDOM.unmountComponentAtNode(container);
  });
});
