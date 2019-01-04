import React, { Component } from 'react';

import { ReactComponent as XIcon } from '../assets/images/x.svg'
import { ReactComponent as OIcon } from '../assets/images/o.svg'

class Square extends Component {
  constructor(props) {
    super(props);
    this.state = {
      value: null,
    };
  }

  render() {
    return (
      <button className="square">
        {/* <XIcon /> */}
        <OIcon />
      </button>
    );
  }
}

export default Square;