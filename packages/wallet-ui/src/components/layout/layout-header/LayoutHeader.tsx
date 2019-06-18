import React from "react";

import { WidgetLogo } from "../../widget";

const LayoutHeader: React.FC = () => {
  return (
    <header className="header">
      <nav className="header-content">
        <div className="logo-container">
          <WidgetLogo />
          {/* <widget-dev-flags /> */}
        </div>
        {/* <header-account
          onAuthenticationChanged={e => this.updateConnectionWidget(e)}
        /> */}
      </nav>
    </header>
  );
};

export { LayoutHeader };
