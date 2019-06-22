import React, { ReactElement } from "react";
import ReactDOM from "react-dom";

import { LayoutHeader } from "./LayoutHeader";
import { MemoryRouter as Router } from "react-router-dom";

describe("<LayoutHeader />", () => {
  let container: HTMLDivElement;
  let header: Element;

  const render = (element: ReactElement) => {
    ReactDOM.render(element, container);
    header = container.querySelector("header.header")!;
  };

  beforeEach(() => {
    container = document.createElement("div");
  });

  it("renders without crashing", () => {
    render(
      <Router>
        <LayoutHeader />
      </Router>
    );
  });

  it("renders the header with the logo and the account context", () => {
    render(
      <Router>
        <LayoutHeader />
      </Router>
    );
    expect(header.querySelector(".logo-container > .logo")).not.toBeNull();
    expect(
      header.querySelector(".context-container > .account-context")
    ).not.toBeNull();
  });

  afterEach(() => {
    ReactDOM.unmountComponentAtNode(container);
  });
});
