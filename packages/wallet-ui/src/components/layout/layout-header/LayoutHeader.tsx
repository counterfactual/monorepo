import React from "react";

import { WidgetLogo } from "../../widget";
import { AccountContext } from "../../account";

import "./LayoutHeader.scss";
import { RouteComponentProps } from "react-router-dom";

const LayoutHeader: React.FC<RouteComponentProps> = props => {
  return (
    <header className="header">
      <nav className="header-content">
        <div className="logo-container">
          <WidgetLogo />
          {/* <widget-dev-flags /> */}
        </div>
        <div className="context-container">
          <AccountContext {...props} />
        </div>
        {/* <header-account
          onAuthenticationChanged={e => this.updateConnectionWidget(e)}
        /> */}
      </nav>
    </header>
  );
};

export { LayoutHeader };
