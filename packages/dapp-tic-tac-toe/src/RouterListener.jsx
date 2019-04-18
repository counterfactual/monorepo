import React, { Component } from "react";
import { withRouter } from "react-router-dom";

class RouterListener extends Component {
  componentWillMount() {
    this.unlisten = this.props.history.listen(location => {
      if (window.parent) {
        window.parent.postMessage(
          `playground:send:dappRoute|${location.pathname}${location.search}`,
          "*"
        );
      }
    });
  }

  componentWillUnmount() {
    this.unlisten();
  }

  render() {
    return <div className="App">{this.props.children}</div>;
  }
}

export default withRouter(RouterListener);
