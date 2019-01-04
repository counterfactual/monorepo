import React, { Component } from "react";

// import { ReactComponent as XIcon } from '../assets/images/x.svg'
import { ReactComponent as OIcon } from "../assets/images/o.svg";
type SquareState = {
  value: null;
};
class Square extends Component<{}, SquareState> {
  constructor(props) {
    super(props);
    this.state = {
      value: null
    };
  }
  render() {
    return (
      <button className="square">
        <OIcon />
      </button>
    );
  }
}
export default Square;
