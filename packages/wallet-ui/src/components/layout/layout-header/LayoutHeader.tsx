import React from "react";

import { WidgetLogo } from "../../widget";

import "./LayoutHeader.scss";
import { AccountContext } from "../../account";

const LayoutHeader: React.FC = () => {
  return (
    <header className="header">
      <nav className="header-content">
        <div className="logo-container">
          <WidgetLogo />
          {/* <widget-dev-flags /> */}
        </div>
        <div className="context-container">
          <AccountContext isAuthenticated={true} />
        </div>
        {/* <header-account
          onAuthenticationChanged={e => this.updateConnectionWidget(e)}
        /> */}
      </nav>
    </header>
  );
};

export { LayoutHeader };
