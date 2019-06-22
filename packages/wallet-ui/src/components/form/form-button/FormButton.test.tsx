import React, { ReactElement } from "react";
import ReactDOM from "react-dom";

import { FormButton } from "./FormButton";

describe("<FormButton />", () => {
  let container: HTMLDivElement;
  let button: HTMLButtonElement;

  const render = (element: ReactElement) => {
    ReactDOM.render(element, container);
    button = container.querySelector("button")!;
  };

  beforeEach(() => {
    container = document.createElement("div");
  });

  it("renders without crashing", () => {
    render(<FormButton />);
  });

  it("renders a button with default properties", () => {
    render(<FormButton />);
    expect(button.disabled).toBe(false);
    expect(button.className).toBe("button");
    expect(button.type).toBe("button");
  });

  it("renders a disabled button", () => {
    render(<FormButton disabled={true} />);
    expect(button.disabled).toBe(true);
  });

  it("renders a button with a custom class", () => {
    const className = "foo";
    render(<FormButton className={className} />);
    expect(button.className).toBe(className);
  });

  it("renders text content inside a button", () => {
    const content = "Click me";
    render(<FormButton>{content}</FormButton>);
    expect(button.innerHTML).toBe(content);
  });

  it("renders elements inside a button", () => {
    const content = (
      <label>
        <span>❓</span> Help
      </label>
    );
    render(<FormButton>{content}</FormButton>);
    expect(button.querySelector("label")).not.toBeNull();
    expect(button.querySelector("label > span")!.innerHTML).toBe("❓");
    expect(button.querySelector("label")!.innerHTML).toContain("Help");
  });

  it("renders a spinner inside a button", () => {
    render(<FormButton spinner={true} />);
    expect(button.querySelector(".spinner")).not.toBeNull();
  });

  it("renders a button as a Submit button", () => {
    render(<FormButton type="submit" />);
    expect(button.type).toBe("submit");
  });

  afterEach(() => {
    ReactDOM.unmountComponentAtNode(container);
  });
});
